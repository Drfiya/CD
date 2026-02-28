'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';

/**
 * Get all AI tools, ordered by position (for admin management)
 */
export async function getAiTools() {
    return db.aiTool.findMany({ orderBy: { position: 'asc' } });
}

/**
 * Get only active AI tools (for frontend display)
 */
export async function getActiveAiTools() {
    return db.aiTool.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
    });
}

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        throw new Error('Unauthorized');
    }
    return session;
}

/**
 * Create a new AI tool
 */
export async function createAiTool(data: {
    name: string;
    url: string;
    description?: string;
    active?: boolean;
    openInNewTab?: boolean;
}) {
    await requireAdmin();

    // Get the highest position
    const last = await db.aiTool.findFirst({ orderBy: { position: 'desc' } });
    const position = last ? last.position + 1 : 0;

    const tool = await db.aiTool.create({
        data: {
            name: data.name,
            url: data.url,
            description: data.description || null,
            active: data.active ?? true,
            openInNewTab: data.openInNewTab ?? true,
            position,
        },
    });

    revalidatePath('/admin/ai-tools');
    revalidatePath('/feed');
    revalidatePath('/classroom');
    revalidatePath('/members');
    revalidatePath('/ai-tools');
    return tool;
}

/**
 * Update an existing AI tool
 */
export async function updateAiTool(
    id: string,
    data: {
        name?: string;
        url?: string;
        description?: string | null;
        active?: boolean;
        openInNewTab?: boolean;
    }
) {
    await requireAdmin();

    const tool = await db.aiTool.update({
        where: { id },
        data,
    });

    revalidatePath('/admin/ai-tools');
    revalidatePath('/feed');
    revalidatePath('/classroom');
    revalidatePath('/members');
    revalidatePath('/ai-tools');
    return tool;
}

/**
 * Delete an AI tool
 */
export async function deleteAiTool(id: string) {
    await requireAdmin();

    await db.aiTool.delete({ where: { id } });

    revalidatePath('/admin/ai-tools');
    revalidatePath('/feed');
    revalidatePath('/classroom');
    revalidatePath('/members');
    revalidatePath('/ai-tools');
}

/**
 * Reorder AI tools by updating positions
 */
export async function reorderAiTools(orderedIds: string[]) {
    await requireAdmin();

    await db.$transaction(
        orderedIds.map((id, index) =>
            db.aiTool.update({ where: { id }, data: { position: index } })
        )
    );

    revalidatePath('/admin/ai-tools');
    revalidatePath('/feed');
    revalidatePath('/classroom');
    revalidatePath('/members');
    revalidatePath('/ai-tools');
}
