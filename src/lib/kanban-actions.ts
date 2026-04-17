'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guards';
import db from '@/lib/db';
import type { KanbanStatus } from '@/generated/prisma/client';

// ============================================================================
// READ
// ============================================================================

export type KanbanCardData = {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    status: KanbanStatus;
    position: number;
    createdById: string;
    createdBy: { name: string | null; image: string | null };
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Fetch all Kanban cards grouped by status.
 */
export async function getKanbanCards(): Promise<{
    TODO: KanbanCardData[];
    IN_PROGRESS: KanbanCardData[];
    DONE: KanbanCardData[];
}> {
    await requireAdmin();

    const cards = await db.kanbanCard.findMany({
        orderBy: { position: 'asc' },
        include: {
            createdBy: { select: { name: true, image: true } },
        },
    });

    const grouped = {
        TODO: [] as KanbanCardData[],
        IN_PROGRESS: [] as KanbanCardData[],
        DONE: [] as KanbanCardData[],
    };

    for (const card of cards) {
        grouped[card.status].push(card);
    }

    return grouped;
}

// ============================================================================
// CREATE
// ============================================================================

export async function createKanbanCard(data: {
    title: string;
    description?: string;
    imageUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requireAdmin();

        // Get the max position in TODO column
        const maxPos = await db.kanbanCard.aggregate({
            where: { status: 'TODO' },
            _max: { position: true },
        });

        await db.kanbanCard.create({
            data: {
                title: data.title,
                description: data.description || null,
                imageUrl: data.imageUrl || null,
                status: 'TODO',
                position: (maxPos._max.position ?? -1) + 1,
                createdById: session.user.id,
            },
        });

        revalidatePath('/admin/kanban');
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateKanbanCard(
    id: string,
    data: {
        title?: string;
        description?: string | null;
        imageUrl?: string | null;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin();

        await db.kanbanCard.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
            },
        });

        revalidatePath('/admin/kanban');
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

// ============================================================================
// MOVE (drag & drop)
// ============================================================================

export async function moveKanbanCard(
    id: string,
    newStatus: KanbanStatus,
    newPosition: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin();

        const card = await db.kanbanCard.findUnique({ where: { id } });
        if (!card) return { success: false, error: 'Card not found' };

        const oldStatus = card.status;
        const oldPosition = card.position;

        // If moving within the same column
        if (oldStatus === newStatus) {
            if (newPosition > oldPosition) {
                // Moving down: shift cards between old+1 and new up by 1
                await db.kanbanCard.updateMany({
                    where: {
                        status: newStatus,
                        position: { gt: oldPosition, lte: newPosition },
                    },
                    data: { position: { decrement: 1 } },
                });
            } else if (newPosition < oldPosition) {
                // Moving up: shift cards between new and old-1 down by 1
                await db.kanbanCard.updateMany({
                    where: {
                        status: newStatus,
                        position: { gte: newPosition, lt: oldPosition },
                    },
                    data: { position: { increment: 1 } },
                });
            }
        } else {
            // Moving to a different column
            // Close the gap in the old column
            await db.kanbanCard.updateMany({
                where: {
                    status: oldStatus,
                    position: { gt: oldPosition },
                },
                data: { position: { decrement: 1 } },
            });

            // Make room in the new column
            await db.kanbanCard.updateMany({
                where: {
                    status: newStatus,
                    position: { gte: newPosition },
                },
                data: { position: { increment: 1 } },
            });
        }

        // Move the card
        await db.kanbanCard.update({
            where: { id },
            data: { status: newStatus, position: newPosition },
        });

        revalidatePath('/admin/kanban');
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteKanbanCard(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin();

        const card = await db.kanbanCard.findUnique({ where: { id } });
        if (!card) return { success: false, error: 'Card not found' };

        await db.kanbanCard.delete({ where: { id } });

        // Close the gap in the column
        await db.kanbanCard.updateMany({
            where: {
                status: card.status,
                position: { gt: card.position },
            },
            data: { position: { decrement: 1 } },
        });

        revalidatePath('/admin/kanban');
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}
