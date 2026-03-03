'use server';

/**
 * Server actions for the Command Center (formerly Dev Tracker).
 * Handles GitHub sync, unified board, card metadata CRUD, and resource CRUD.
 */

import db from '@/lib/db';
import { fullSync, type GitHubCommit } from './github-api';
import { buildCards, computeStats, type TrackerCard, type TrackerStats, type CardMetadata } from './sync';
import { revalidatePath } from 'next/cache';
import type { KanbanStatus } from '@/generated/prisma/client';

// --- Sync ---

export interface RecentCommit {
    sha: string;
    message: string;
    authorName: string;
    date: string;
}

export interface SyncResponse {
    cards: TrackerCard[];
    stats: TrackerStats;
    syncedAt: string;
    recentCommits: RecentCommit[];
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

    // Extract the 10 most recent main-branch commits for the activity feed
    const mainCommits = commitsByBranch['main'] || commitsByBranch['master'] || [];
    const recentCommits: RecentCommit[] = mainCommits.slice(0, 10).map((c: GitHubCommit) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0], // first line only
        authorName: c.commit.author.name,
        date: c.commit.author.date,
    }));

    return {
        cards,
        stats,
        syncedAt: new Date().toISOString(),
        recentCommits,
    };
}

// --- Unified Board ---

/** Discriminated union: a card from either GitHub sync or manual Kanban. */
export type UnifiedCardData =
    | {
        source: 'github';
        id: string;            // branchName as id
        title: string;
        column: 'todo' | 'done';
        card: TrackerCard;     // full GitHub card data
    }
    | {
        source: 'manual';
        id: string;            // KanbanCard.id
        title: string;
        column: 'todo' | 'done';
        description: string | null;
        imageUrl: string | null;
        position: number;
        createdBy: { name: string | null; image: string | null };
        createdAt: Date;
    };

export interface UnifiedBoardData {
    cards: UnifiedCardData[];
    stats: TrackerStats;
    syncedAt: string;
    recentCommits: RecentCommit[];
}

/** Map DevTrackerCard columns → unified columns. */
function mapGitHubColumn(col: string): 'todo' | 'done' {
    switch (col) {
        case 'merged': return 'done';
        case 'follow_up': return 'done';
        default: return 'todo';
    }
}

/** Map KanbanCard status → unified columns. */
function mapKanbanStatus(status: KanbanStatus): 'todo' | 'done' {
    switch (status) {
        case 'DONE': return 'done';
        default: return 'todo';
    }
}

/**
 * Fetches both GitHub-synced cards and manual Kanban cards,
 * maps them into a single unified board with 3 columns.
 */
export async function getUnifiedBoard(): Promise<UnifiedBoardData> {
    // Fetch GitHub data
    const syncData = await syncDevTracker();

    // Fetch manual Kanban cards
    const kanbanCards = await db.kanbanCard.findMany({
        orderBy: { position: 'asc' },
        include: { createdBy: { select: { name: true, image: true } } },
    });

    // Build unified card list
    const unifiedCards: UnifiedCardData[] = [];

    // Add GitHub cards
    for (const card of syncData.cards) {
        unifiedCards.push({
            source: 'github',
            id: card.branchName,
            title: card.title,
            column: mapGitHubColumn(card.column),
            card,
        });
    }

    // Add manual Kanban cards
    for (const k of kanbanCards) {
        unifiedCards.push({
            source: 'manual',
            id: k.id,
            title: k.title,
            column: mapKanbanStatus(k.status),
            description: k.description,
            imageUrl: k.imageUrl,
            position: k.position,
            createdBy: k.createdBy,
            createdAt: k.createdAt,
        });
    }

    return {
        cards: unifiedCards,
        stats: syncData.stats,
        syncedAt: syncData.syncedAt,
        recentCommits: syncData.recentCommits,
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
    readme?: string;
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
        readme?: string | null;
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
