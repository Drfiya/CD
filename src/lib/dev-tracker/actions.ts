'use server';

/**
 * Server actions for the Dev Tracker.
 * Handles GitHub sync, card metadata CRUD, and resource CRUD.
 */

import db from '@/lib/db';
import { fullSync } from './github-api';
import { buildCards, computeStats, type TrackerCard, type TrackerStats, type CardMetadata } from './sync';
import { revalidatePath } from 'next/cache';

// --- Sync ---

export interface SyncResponse {
    cards: TrackerCard[];
    stats: TrackerStats;
    syncedAt: string;
}

/**
 * Fetch fresh data from GitHub, merge with DB metadata, return enriched cards.
 */
export async function syncDevTracker(): Promise<SyncResponse> {
    const { branches, commitsByBranch, pullRequests } = await fullSync();

    // Load all saved card metadata from DB
    const dbCards = await db.devTrackerCard.findMany();
    const dbMetaByBranch: Record<string, CardMetadata> = {};
    for (const card of dbCards) {
        dbMetaByBranch[card.branchName] = {
            column: card.column,
            priority: card.priority,
            assignee: card.assignee,
            platformTag: card.platformTag,
            flagged: card.flagged,
            notes: card.notes,
        };
    }

    const cards = buildCards(branches, commitsByBranch, pullRequests, dbMetaByBranch);
    const stats = computeStats(cards);

    return {
        cards,
        stats,
        syncedAt: new Date().toISOString(),
    };
}

// --- Card metadata ---

export async function saveCardMeta(
    branchName: string,
    data: {
        column?: string;
        priority?: string | null;
        assignee?: string | null;
        platformTag?: string | null;
        flagged?: boolean;
        notes?: string | null;
    }
) {
    await db.devTrackerCard.upsert({
        where: { branchName },
        create: {
            branchName,
            ...data,
            lastSyncedAt: new Date(),
        },
        update: {
            ...data,
            lastSyncedAt: new Date(),
        },
    });

    revalidatePath('/admin/dev-tracker');
}

export async function updateCardColumn(branchName: string, column: string) {
    await saveCardMeta(branchName, { column });
}

// --- Resources ---

export async function getResources() {
    return db.devTrackerResource.findMany({
        orderBy: [{ starred: 'desc' }, { createdAt: 'desc' }],
        include: { createdBy: { select: { name: true } } },
    });
}

export async function addResource(data: {
    type: 'PROMPT' | 'LINK' | 'NOTE';
    title: string;
    content: string;
    createdById: string;
}) {
    await db.devTrackerResource.create({ data });
    revalidatePath('/admin/dev-tracker/resources');
}

export async function updateResource(
    id: string,
    data: {
        title?: string;
        content?: string;
        starred?: boolean;
        useCount?: number;
    }
) {
    await db.devTrackerResource.update({ where: { id }, data });
    revalidatePath('/admin/dev-tracker/resources');
}

export async function deleteResource(id: string) {
    await db.devTrackerResource.delete({ where: { id } });
    revalidatePath('/admin/dev-tracker/resources');
}

// --- Launch checklist ---

export async function getLaunchChecklist() {
    return db.launchChecklistItem.findMany({
        orderBy: [{ category: 'asc' }, { position: 'asc' }],
    });
}

export async function toggleChecklistItem(id: string, checked: boolean) {
    await db.launchChecklistItem.update({
        where: { id },
        data: { checked },
    });
    revalidatePath('/admin/dev-tracker/launch');
}

export async function addChecklistItem(data: {
    category: string;
    label: string;
    blocker?: boolean;
    position?: number;
}) {
    await db.launchChecklistItem.create({ data });
    revalidatePath('/admin/dev-tracker/launch');
}

export async function deleteChecklistItem(id: string) {
    await db.launchChecklistItem.delete({ where: { id } });
    revalidatePath('/admin/dev-tracker/launch');
}
