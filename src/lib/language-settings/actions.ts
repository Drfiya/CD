'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';
import { getCacheStats } from '@/lib/translation/cache';
import { getBudgetConfig, updateDailyBudget, activateKillSwitch, deactivateKillSwitch } from '@/lib/translation/budget';

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        throw new Error('Unauthorized');
    }
    return session;
}

const LANG_PATH = '/admin/language-settings';

// ═══════════════════════════════════════════════════════════════════════════════
// BLACKLIST ACTIONS (E1)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlacklistEntry {
    id: string;
    term: string;
    category: string;
    note: string | null;
    isActive: boolean;
    createdAt: Date;
}

export async function getBlacklistEntries(opts?: {
    search?: string;
    category?: string;
    activeOnly?: boolean;
}) {
    await requireAdmin();
    const where: Record<string, unknown> = {};
    if (opts?.search) {
        where.term = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts?.category) {
        where.category = opts.category;
    }
    if (opts?.activeOnly) {
        where.isActive = true;
    }

    return db.translationBlacklist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

export async function getBlacklistCategories(): Promise<string[]> {
    await requireAdmin();
    const result = await db.translationBlacklist.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
    });
    return result.map((r: { category: string }) => r.category);
}

export async function createBlacklistEntry(data: {
    term: string;
    category: string;
    note?: string;
}) {
    const session = await requireAdmin();

    // Check for conflict with glossary
    const glossaryConflict = await db.translationGlossaryEntry.findFirst({
        where: {
            sourceTerm: { equals: data.term, mode: 'insensitive' },
            isActive: true,
        },
    });

    const entry = await db.translationBlacklist.create({
        data: {
            term: data.term.trim(),
            category: data.category.trim(),
            note: data.note?.trim() || null,
            addedById: session.user.id,
        },
    });

    revalidatePath(LANG_PATH);
    return {
        entry,
        glossaryConflict: glossaryConflict
            ? `Warning: "${data.term}" also exists in the glossary (${glossaryConflict.sourceLocale} → ${glossaryConflict.targetLocale}).`
            : null,
    };
}

export async function toggleBlacklistEntry(id: string, isActive: boolean) {
    await requireAdmin();
    await db.translationBlacklist.update({
        where: { id },
        data: { isActive },
    });
    revalidatePath(LANG_PATH);
}

export async function deleteBlacklistEntry(id: string) {
    await requireAdmin();
    await db.translationBlacklist.delete({ where: { id } });
    revalidatePath(LANG_PATH);
}

export async function bulkImportBlacklist(
    entries: { term: string; category: string; note?: string }[]
) {
    const session = await requireAdmin();

    let created = 0;
    let skipped = 0;
    const conflicts: string[] = [];

    for (const entry of entries) {
        try {
            await db.translationBlacklist.create({
                data: {
                    term: entry.term.trim(),
                    category: entry.category.trim(),
                    note: entry.note?.trim() || null,
                    addedById: session.user.id,
                },
            });
            created++;
        } catch {
            skipped++; // duplicate
        }
    }

    // Check glossary conflicts
    const terms = entries.map((e) => e.term.toLowerCase());
    const glossaryMatches = await db.translationGlossaryEntry.findMany({
        where: {
            sourceTerm: { in: terms, mode: 'insensitive' },
            isActive: true,
        },
        select: { sourceTerm: true },
    });
    if (glossaryMatches.length > 0) {
        conflicts.push(
            ...glossaryMatches.map(
                (g: { sourceTerm: string }) => `"${g.sourceTerm}" also exists in the glossary`
            )
        );
    }

    revalidatePath(LANG_PATH);
    return { created, skipped, conflicts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY ACTIONS (E2)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GlossaryEntry {
    id: string;
    sourceTerm: string;
    targetTerm: string;
    sourceLocale: string;
    targetLocale: string;
    domain: string | null;
    deeplGlossaryId: string | null;
    isActive: boolean;
    createdAt: Date;
}

export async function getGlossaryEntries(opts?: {
    search?: string;
    sourceLocale?: string;
    targetLocale?: string;
    domain?: string;
}) {
    await requireAdmin();
    const where: Record<string, unknown> = {};
    if (opts?.search) {
        where.OR = [
            { sourceTerm: { contains: opts.search, mode: 'insensitive' } },
            { targetTerm: { contains: opts.search, mode: 'insensitive' } },
        ];
    }
    if (opts?.sourceLocale) where.sourceLocale = opts.sourceLocale;
    if (opts?.targetLocale) where.targetLocale = opts.targetLocale;
    if (opts?.domain) where.domain = opts.domain;

    return db.translationGlossaryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

export async function getGlossaryDomains(): Promise<string[]> {
    await requireAdmin();
    const result = await db.translationGlossaryEntry.findMany({
        select: { domain: true },
        distinct: ['domain'],
        where: { domain: { not: null } },
        orderBy: { domain: 'asc' },
    });
    return result.map((r: { domain: string | null }) => r.domain).filter(Boolean) as string[];
}

export async function getGlossaryLanguagePairs(): Promise<
    { sourceLocale: string; targetLocale: string }[]
> {
    await requireAdmin();
    const result = await db.translationGlossaryEntry.findMany({
        select: { sourceLocale: true, targetLocale: true },
        distinct: ['sourceLocale', 'targetLocale'],
    });
    return result;
}

export async function createGlossaryEntry(data: {
    sourceTerm: string;
    targetTerm: string;
    sourceLocale: string;
    targetLocale: string;
    domain?: string;
}) {
    const session = await requireAdmin();

    const entry = await db.translationGlossaryEntry.create({
        data: {
            sourceTerm: data.sourceTerm.trim(),
            targetTerm: data.targetTerm.trim(),
            sourceLocale: data.sourceLocale,
            targetLocale: data.targetLocale,
            domain: data.domain?.trim() || null,
            approvedById: session.user.id,
        },
    });

    // Log change
    await db.glossaryChangeLog.create({
        data: {
            entryId: entry.id,
            action: 'create',
            changedById: session.user.id,
            newValue: data as object,
        },
    });

    revalidatePath(`${LANG_PATH}/glossary`);
    return entry;
}

export async function updateGlossaryEntry(
    id: string,
    data: { targetTerm?: string; domain?: string; isActive?: boolean }
) {
    const session = await requireAdmin();
    const old = await db.translationGlossaryEntry.findUnique({ where: { id } });

    const entry = await db.translationGlossaryEntry.update({
        where: { id },
        data: {
            ...(data.targetTerm !== undefined && {
                targetTerm: data.targetTerm.trim(),
            }),
            ...(data.domain !== undefined && {
                domain: data.domain.trim() || null,
            }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
    });

    await db.glossaryChangeLog.create({
        data: {
            entryId: id,
            action: 'update',
            changedById: session.user.id,
            oldValue: old as object,
            newValue: data as object,
        },
    });

    revalidatePath(`${LANG_PATH}/glossary`);
    return entry;
}

export async function deleteGlossaryEntry(id: string) {
    const session = await requireAdmin();
    const old = await db.translationGlossaryEntry.findUnique({ where: { id } });

    await db.translationGlossaryEntry.delete({ where: { id } });

    await db.glossaryChangeLog.create({
        data: {
            entryId: id,
            action: 'delete',
            changedById: session.user.id,
            oldValue: old as object,
        },
    });

    revalidatePath(`${LANG_PATH}/glossary`);
}

export async function bulkImportGlossary(
    entries: {
        sourceTerm: string;
        targetTerm: string;
        sourceLocale: string;
        targetLocale: string;
        domain?: string;
    }[]
) {
    const session = await requireAdmin();
    let created = 0;
    let skipped = 0;

    for (const entry of entries) {
        try {
            const newEntry = await db.translationGlossaryEntry.create({
                data: {
                    sourceTerm: entry.sourceTerm.trim(),
                    targetTerm: entry.targetTerm.trim(),
                    sourceLocale: entry.sourceLocale,
                    targetLocale: entry.targetLocale,
                    domain: entry.domain?.trim() || null,
                    approvedById: session.user.id,
                },
            });
            await db.glossaryChangeLog.create({
                data: {
                    entryId: newEntry.id,
                    action: 'create',
                    changedById: session.user.id,
                    newValue: entry as object,
                },
            });
            created++;
        } catch {
            skipped++;
        }
    }

    revalidatePath(`${LANG_PATH}/glossary`);
    return { created, skipped };
}

export async function getGlossaryChangelog(limit = 50) {
    await requireAdmin();
    return db.glossaryChangeLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { changedBy: { select: { id: true, name: true, email: true } } },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATION RULES ACTIONS (E3)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TranslationRuleData {
    id: string;
    sectionName: string;
    formality: string;
    defaultPreviewLocale: string;
    activeGlossaryDomain: string | null;
    autoTranslate: boolean;
    qualityThreshold: number;
    cacheTtlDays: number;
    contextDepth: number;
    isActive: boolean;
}

export async function getTranslationRules(): Promise<TranslationRuleData[]> {
    await requireAdmin();
    return db.translationRule.findMany({
        orderBy: { sectionName: 'asc' },
    });
}

export async function createTranslationRule(data: {
    sectionName: string;
    formality?: string;
    defaultPreviewLocale?: string;
    activeGlossaryDomain?: string;
    autoTranslate?: boolean;
    qualityThreshold?: number;
    cacheTtlDays?: number;
    contextDepth?: number;
}) {
    await requireAdmin();

    const rule = await db.translationRule.create({
        data: {
            sectionName: data.sectionName.trim(),
            formality: data.formality || 'more',
            defaultPreviewLocale: data.defaultPreviewLocale || 'en',
            activeGlossaryDomain: data.activeGlossaryDomain?.trim() || null,
            autoTranslate: data.autoTranslate ?? true,
            qualityThreshold: data.qualityThreshold ?? 0.7,
            cacheTtlDays: data.cacheTtlDays ?? 30,
            contextDepth: data.contextDepth ?? 2,
        },
    });

    revalidatePath(`${LANG_PATH}/rules`);
    return rule;
}

export async function updateTranslationRule(
    id: string,
    data: Partial<{
        formality: string;
        defaultPreviewLocale: string;
        activeGlossaryDomain: string | null;
        autoTranslate: boolean;
        qualityThreshold: number;
        cacheTtlDays: number;
        contextDepth: number;
        isActive: boolean;
    }>
) {
    await requireAdmin();
    const rule = await db.translationRule.update({ where: { id }, data });
    revalidatePath(`${LANG_PATH}/rules`);
    return rule;
}

export async function deleteTranslationRule(id: string) {
    await requireAdmin();
    await db.translationRule.delete({ where: { id } });
    revalidatePath(`${LANG_PATH}/rules`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK ACTIONS (E4)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeedbackEntry {
    id: string;
    postId: string | null;
    commentId: string | null;
    userId: string;
    user: { name: string | null; email: string };
    sourceLocale: string;
    targetLocale: string;
    originalText: string;
    translatedText: string;
    suggestedCorrection: string | null;
    feedbackType: string;
    status: string;
    resolvedBy: { name: string | null; email: string } | null;
    resolvedAt: Date | null;
    adminNote: string | null;
    createdAt: Date;
}

export async function getTranslationFeedback(opts?: {
    status?: string;
    feedbackType?: string;
}) {
    await requireAdmin();
    const where: Record<string, unknown> = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.feedbackType) where.feedbackType = opts.feedbackType;

    return db.translationFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { name: true, email: true } },
            resolvedBy: { select: { name: true, email: true } },
        },
    });
}

export async function getFeedbackStats() {
    await requireAdmin();
    const [total, pending, reviewing, resolved, rejected] = await Promise.all([
        db.translationFeedback.count(),
        db.translationFeedback.count({ where: { status: 'pending' } }),
        db.translationFeedback.count({ where: { status: 'reviewing' } }),
        db.translationFeedback.count({ where: { status: 'resolved' } }),
        db.translationFeedback.count({ where: { status: 'rejected' } }),
    ]);

    // Feedback by type
    const byType = await db.translationFeedback.groupBy({
        by: ['feedbackType'],
        _count: true,
    });

    // Feedback by language pair
    const byLangPair = await db.translationFeedback.groupBy({
        by: ['sourceLocale', 'targetLocale'],
        _count: true,
        orderBy: { _count: { sourceLocale: 'desc' } },
        take: 10,
    });

    return {
        total,
        pending,
        reviewing,
        resolved,
        rejected,
        byType: byType.map((t: { feedbackType: string; _count: number }) => ({
            type: t.feedbackType,
            count: t._count,
        })),
        byLangPair: byLangPair.map((p: { sourceLocale: string; targetLocale: string; _count: number }) => ({
            pair: `${p.sourceLocale} → ${p.targetLocale}`,
            count: p._count,
        })),
    };
}

export async function updateFeedbackStatus(
    id: string,
    status: string,
    adminNote?: string
) {
    const session = await requireAdmin();

    await db.translationFeedback.update({
        where: { id },
        data: {
            status,
            adminNote: adminNote || null,
            resolvedById: ['resolved', 'rejected'].includes(status)
                ? session.user.id
                : null,
            resolvedAt: ['resolved', 'rejected'].includes(status)
                ? new Date()
                : null,
        },
    });

    revalidatePath(`${LANG_PATH}/feedback`);
}

export async function feedbackToGlossary(feedbackId: string) {
    const session = await requireAdmin();
    const fb = await db.translationFeedback.findUnique({
        where: { id: feedbackId },
    });
    if (!fb || !fb.suggestedCorrection) {
        throw new Error('No correction available');
    }

    // Create glossary entry from correction
    await db.translationGlossaryEntry.create({
        data: {
            sourceTerm: fb.originalText.substring(0, 200),
            targetTerm: fb.suggestedCorrection.substring(0, 200),
            sourceLocale: fb.sourceLocale,
            targetLocale: fb.targetLocale,
            approvedById: session.user.id,
        },
    });

    // Mark feedback as resolved
    await db.translationFeedback.update({
        where: { id: feedbackId },
        data: {
            status: 'resolved',
            adminNote: 'Added to glossary',
            resolvedById: session.user.id,
            resolvedAt: new Date(),
        },
    });

    revalidatePath(`${LANG_PATH}/feedback`);
    revalidatePath(`${LANG_PATH}/glossary`);
}

export async function feedbackToBlacklist(
    feedbackId: string,
    term: string,
    category: string
) {
    const session = await requireAdmin();

    await db.translationBlacklist.create({
        data: {
            term: term.trim(),
            category: category.trim(),
            note: `Added from feedback #${feedbackId}`,
            addedById: session.user.id,
        },
    });

    await db.translationFeedback.update({
        where: { id: feedbackId },
        data: {
            status: 'resolved',
            adminNote: `"${term}" added to blacklist`,
            resolvedById: session.user.id,
            resolvedAt: new Date(),
        },
    });

    revalidatePath(`${LANG_PATH}/feedback`);
    revalidatePath(LANG_PATH);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API USAGE MONITOR (E5)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TranslationUsageData {
    charsToday: number;
    charsThisMonth: number;
    costToday: number;
    costThisMonth: number;
    cacheHitRate: number;
    cacheTotalHits: number;
    cacheTotalMisses: number;
    dailyUsage: { date: string; chars: number; cost: number; cached: number }[];
    topLanguagePairs: { pair: string; chars: number }[];
    /** Per-tier cache telemetry (process-local, resets on restart). */
    tierCacheStats: {
        memoryHits: number;
        postgresHits: number;
        misses: number;
        total: number;
        memoryHitRate: number;
        postgresHitRate: number;
        missRate: number;
        memorySize: number;
        memoryCapacity: number;
        postgresCount: number;
    };
    /** DB-backed per-tier aggregate (cross-replica, persisted). */
    dbTierStats: {
        lruHits: number;
        dbHits: number;
        misses: number;
        total: number;
        lruHitRate: number;
        dbHitRate: number;
        missRate: number;
        lruChars: number;
        dbChars: number;
        missChars: number;
    };
    /** Budget config for the kill-switch panel. */
    budgetConfig: {
        dailyCharBudget: number;
        killSwitchActive: boolean;
        killSwitchActivatedAt: string | null;
        todayUsed: number;
    };
    /** Hottest uncached phrases — candidates for pre-translation. */
    topUncached: Array<{ phrase: string; count: number }>;
}

export async function getTranslationUsageData(): Promise<TranslationUsageData> {
    await requireAdmin();
    const now = new Date();
    const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's usage
    const todayAgg = await db.translationUsage.aggregate({
        where: { date: { gte: todayStart } },
        _sum: { charCount: true, costEstimate: true },
    });

    // Month usage
    const monthAgg = await db.translationUsage.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { charCount: true, costEstimate: true },
    });

    // Cache stats (month)
    const cacheHits = await db.translationUsage.count({
        where: { date: { gte: monthStart }, fromCache: true },
    });
    const cacheMisses = await db.translationUsage.count({
        where: { date: { gte: monthStart }, fromCache: false },
    });
    const cacheTotal = cacheHits + cacheMisses;

    // Daily usage for last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRaw = await db.translationUsage.groupBy({
        by: ['fromCache'],
        where: { date: { gte: thirtyDaysAgo } },
        _sum: { charCount: true, costEstimate: true },
        _count: true,
    });

    // Top language pairs
    const pairRaw = await db.translationUsage.groupBy({
        by: ['sourceLang', 'targetLang'],
        where: { date: { gte: monthStart } },
        _sum: { charCount: true },
        orderBy: { _sum: { charCount: 'desc' } },
        take: 10,
    });

    // Per-tier cache-health snapshot (process-local, surfaced on the admin
    // dashboard per Revision Round 1: Must-Have #8 "cache-health observability").
    const tierStats = await getCacheStats();

    // DB-backed per-tier aggregate (cross-replica, persisted via cacheTier column).
    const tierGroupRaw = await db.translationUsage.groupBy({
        by: ['cacheTier'],
        where: { date: { gte: monthStart }, cacheTier: { not: null } },
        _count: true,
        _sum: { charCount: true },
    });
    const tierMap: Record<string, { count: number; chars: number }> = {};
    for (const row of tierGroupRaw) {
        if (row.cacheTier) tierMap[row.cacheTier] = { count: row._count, chars: row._sum.charCount ?? 0 };
    }
    const dbLru = tierMap['lru'] ?? { count: 0, chars: 0 };
    const dbDb = tierMap['db'] ?? { count: 0, chars: 0 };
    const dbMiss = tierMap['miss'] ?? { count: 0, chars: 0 };
    const dbTotal = dbLru.count + dbDb.count + dbMiss.count;
    const dbPct = (n: number) => (dbTotal > 0 ? Math.round((n / dbTotal) * 100) : 0);

    return {
        charsToday: todayAgg._sum.charCount ?? 0,
        charsThisMonth: monthAgg._sum.charCount ?? 0,
        costToday: todayAgg._sum.costEstimate ?? 0,
        costThisMonth: monthAgg._sum.costEstimate ?? 0,
        cacheHitRate: cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) : 0,
        cacheTotalHits: cacheHits,
        cacheTotalMisses: cacheMisses,
        dailyUsage: dailyRaw.map((d) => ({
            date: d.fromCache ? 'cached' : 'api',
            chars: d._sum.charCount ?? 0,
            cost: d._sum.costEstimate ?? 0,
            cached: d.fromCache ? d._count : 0,
        })),
        topLanguagePairs: pairRaw.map((p) => ({
            pair: `${p.sourceLang} → ${p.targetLang}`,
            chars: p._sum.charCount ?? 0,
        })),
        tierCacheStats: {
            ...tierStats.tierCounters,
            memorySize: tierStats.memorySize,
            memoryCapacity: tierStats.memoryCapacity,
            postgresCount: tierStats.postgresCount,
        },
        dbTierStats: {
            lruHits: dbLru.count,
            dbHits: dbDb.count,
            misses: dbMiss.count,
            total: dbTotal,
            lruHitRate: dbPct(dbLru.count),
            dbHitRate: dbPct(dbDb.count),
            missRate: dbPct(dbMiss.count),
            lruChars: dbLru.chars,
            dbChars: dbDb.chars,
            missChars: dbMiss.chars,
        },
        budgetConfig: await (async () => {
            try {
                const config = await getBudgetConfig();
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayAgg = await db.translationUsage.aggregate({
                    where: { date: { gte: todayStart }, fromCache: false },
                    _sum: { charCount: true },
                });
                return {
                    dailyCharBudget: config.dailyCharBudget,
                    killSwitchActive: config.killSwitchActive,
                    killSwitchActivatedAt: config.killSwitchActivatedAt?.toISOString() ?? null,
                    todayUsed: todayAgg._sum.charCount ?? 0,
                };
            } catch {
                return { dailyCharBudget: 50000, killSwitchActive: false, killSwitchActivatedAt: null, todayUsed: 0 };
            }
        })(),
        topUncached: tierStats.topUncached,
    };
}

// ─── Budget Server Actions ──────────────────────────────────────────────────

export async function toggleKillSwitch(active: boolean) {
    await requireAdmin();
    if (active) {
        await activateKillSwitch();
    } else {
        await deactivateKillSwitch();
    }
    revalidatePath('/admin/language-settings/usage');
}

export async function setDailyBudget(budget: number) {
    await requireAdmin();
    if (budget < 0 || !Number.isFinite(budget)) throw new Error('Invalid budget');
    await updateDailyBudget(Math.round(budget));
    revalidatePath('/admin/language-settings/usage');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE CONFIG ACTIONS (NEW-LANG)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LanguageConfigEntry {
    id: string;
    code: string;
    name: string;
    flag: string;
    isActive: boolean;
    sortOrder: number;
}

const STATIC_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧', sortOrder: 0 },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', sortOrder: 1 },
    { code: 'fr', name: 'Français', flag: '🇫🇷', sortOrder: 2 },
];

export async function getLanguageConfigs(): Promise<LanguageConfigEntry[]> {
    await requireAdmin();
    const configs = await db.languageConfig.findMany({
        orderBy: { sortOrder: 'asc' },
    });

    // If table is empty, seed with static defaults
    if (configs.length === 0) {
        await db.languageConfig.createMany({
            data: STATIC_LANGUAGES.map(l => ({ ...l, isActive: true })),
            skipDuplicates: true,
        });
        return db.languageConfig.findMany({ orderBy: { sortOrder: 'asc' } });
    }

    return configs;
}

export async function toggleLanguageActive(code: string, isActive: boolean) {
    await requireAdmin();

    // English cannot be deactivated
    if (code === 'en' && !isActive) {
        throw new Error('English cannot be deactivated — it is the permanent fallback language.');
    }

    await db.languageConfig.upsert({
        where: { code },
        update: { isActive },
        create: {
            code,
            name: code,
            flag: '',
            isActive,
            sortOrder: 99,
        },
    });

    revalidateTag('active-languages', 'default');
    revalidatePath('/admin/language-settings/languages');
}
