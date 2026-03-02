'use server';

/**
 * API Usage Actions
 *
 * Aggregates usage statistics from all configured API services
 * for the Command Center API Usage dashboard.
 */

import db from '@/lib/db';

// --- Types ---

export interface ServiceUsage {
    name: string;
    icon: string;
    status: 'active' | 'inactive' | 'error';
    unit: string;
    usageToday: number;
    usageThisMonth: number;
    costToday: number;
    costThisMonth: number;
    limit: string;
    cacheHitRate?: number;
    details?: Record<string, string | number>;
}

export interface ApiUsageData {
    services: ServiceUsage[];
    totalCostToday: number;
    totalCostThisMonth: number;
    totalRequestsToday: number;
    totalRequestsThisMonth: number;
    overallCacheHitRate: number;
    lastUpdated: string;
}

// --- Helpers ---

function startOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

// --- DeepL Stats ---

async function getDeepLStats(): Promise<ServiceUsage> {
    const now = new Date();
    const today = startOfDay();
    const monthStart = startOfMonth();

    const isConfigured = !!process.env.DEEPL_API_KEY;
    if (!isConfigured) {
        return {
            name: 'DeepL',
            icon: '🌐',
            status: 'inactive',
            unit: 'Characters',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Not configured',
        };
    }

    try {
        // Today's stats
        const todayStats = await db.translationUsage.aggregate({
            where: { date: { gte: today, lte: now }, fromCache: false },
            _sum: { charCount: true, costEstimate: true },
            _count: true,
        });
        const todayCacheHits = await db.translationUsage.aggregate({
            where: { date: { gte: today, lte: now }, fromCache: true },
            _count: true,
        });

        // This month's stats
        const monthStats = await db.translationUsage.aggregate({
            where: { date: { gte: monthStart, lte: now }, fromCache: false },
            _sum: { charCount: true, costEstimate: true },
            _count: true,
        });
        const monthCacheHits = await db.translationUsage.aggregate({
            where: { date: { gte: monthStart, lte: now }, fromCache: true },
            _count: true,
        });

        const todayChars = todayStats._sum.charCount || 0;
        const monthChars = monthStats._sum.charCount || 0;

        // DeepL Pro: $20/1M chars
        const costPerChar = 20 / 1_000_000;
        const costToday = todayChars * costPerChar;
        const costThisMonth = monthChars * costPerChar;

        const totalToday = todayStats._count + todayCacheHits._count;
        const totalMonth = monthStats._count + monthCacheHits._count;
        const cacheHitRate = totalMonth > 0
            ? (monthCacheHits._count / totalMonth) * 100
            : 0;

        // Language pair breakdown (this month)
        const langBreakdown = await db.translationUsage.groupBy({
            by: ['sourceLang', 'targetLang'],
            where: { date: { gte: monthStart, lte: now }, fromCache: false },
            _sum: { charCount: true },
            _count: true,
            orderBy: { _sum: { charCount: 'desc' } },
            take: 5,
        });

        const topPairs = langBreakdown.map(
            (r) => `${r.sourceLang}→${r.targetLang}: ${((r._sum.charCount || 0) / 1000).toFixed(1)}K`
        ).join(', ');

        return {
            name: 'DeepL',
            icon: '🌐',
            status: 'active',
            unit: 'Characters',
            usageToday: todayChars,
            usageThisMonth: monthChars,
            costToday,
            costThisMonth,
            limit: 'Pro: $20/1M chars',
            cacheHitRate: Math.round(cacheHitRate),
            details: {
                apiCallsToday: todayStats._count,
                cacheHitsToday: todayCacheHits._count,
                apiCallsMonth: monthStats._count,
                cacheHitsMonth: monthCacheHits._count,
                topLanguagePairs: topPairs || 'No data yet',
            },
        };
    } catch (error) {
        console.error('Failed to get DeepL stats:', error);
        return {
            name: 'DeepL',
            icon: '🌐',
            status: 'error',
            unit: 'Characters',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
}

// --- Gemini Stats ---

async function getGeminiStats(): Promise<ServiceUsage> {
    const isConfigured = !!process.env.GEMINI_API_KEY;
    if (!isConfigured) {
        return {
            name: 'Gemini AI',
            icon: '🤖',
            status: 'inactive',
            unit: 'Reports',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Not configured',
        };
    }

    try {
        const today = startOfDay();
        const monthStart = startOfMonth();
        const now = new Date();

        const reportsToday = await db.feedReport.count({
            where: { createdAt: { gte: today, lte: now } },
        });
        const reportsMonth = await db.feedReport.count({
            where: { createdAt: { gte: monthStart, lte: now } },
        });

        // Estimate: ~2K tokens/report (avg input+output), Gemini 2.0 Flash: $0.10/1M input + $0.40/1M output
        // Rough estimate: ~$0.001 per report
        const costPerReport = 0.001;

        return {
            name: 'Gemini AI',
            icon: '🤖',
            status: 'active',
            unit: 'Reports',
            usageToday: reportsToday,
            usageThisMonth: reportsMonth,
            costToday: reportsToday * costPerReport,
            costThisMonth: reportsMonth * costPerReport,
            limit: 'Free: 15 RPM / Flash: ~$0.001/report',
            details: {
                estimatedTokensMonth: reportsMonth * 2000,
            },
        };
    } catch (error) {
        console.error('Failed to get Gemini stats:', error);
        return {
            name: 'Gemini AI',
            icon: '🤖',
            status: 'error',
            unit: 'Reports',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
}

// --- Stripe Stats ---

async function getStripeStats(): Promise<ServiceUsage> {
    const isConfigured = !!process.env.STRIPE_SECRET_KEY;
    if (!isConfigured) {
        return {
            name: 'Stripe',
            icon: '💳',
            status: 'inactive',
            unit: 'Subscriptions',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Not configured',
        };
    }

    try {
        const activeMembers = await db.membership.count({
            where: { status: 'ACTIVE' },
        });
        const totalMembers = await db.membership.count();

        return {
            name: 'Stripe',
            icon: '💳',
            status: 'active',
            unit: 'Subscriptions',
            usageToday: 0,
            usageThisMonth: activeMembers,
            costToday: 0,
            costThisMonth: 0, // Stripe costs are % of revenue — not direct API cost
            limit: '2.9% + 30¢ per charge',
            details: {
                activeSubscriptions: activeMembers,
                totalEver: totalMembers,
            },
        };
    } catch (error) {
        console.error('Failed to get Stripe stats:', error);
        return {
            name: 'Stripe',
            icon: '💳',
            status: 'error',
            unit: 'Subscriptions',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
}

// --- Resend Stats ---

async function getResendStats(): Promise<ServiceUsage> {
    const isConfigured = !!process.env.RESEND_API_KEY;
    return {
        name: 'Resend',
        icon: '📧',
        status: isConfigured ? 'active' : 'inactive',
        unit: 'Emails',
        usageToday: 0,
        usageThisMonth: 0,
        costToday: 0,
        costThisMonth: 0,
        limit: isConfigured ? 'Free: 100/day, 3K/mo' : 'Not configured',
        details: {
            note: 'Email tracking available via Resend dashboard',
        },
    };
}

// --- GIPHY Stats ---

function getGiphyStats(): ServiceUsage {
    const isConfigured = !!process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    return {
        name: 'GIPHY',
        icon: '🎬',
        status: isConfigured ? 'active' : 'inactive',
        unit: 'Requests',
        usageToday: 0,
        usageThisMonth: 0,
        costToday: 0,
        costThisMonth: 0,
        limit: isConfigured ? 'Free: 42 req/hr, 1K/day' : 'Not configured',
        details: {
            note: 'Client-side only — no server tracking',
        },
    };
}

// --- Supabase Stats ---

async function getSupabaseStats(): Promise<ServiceUsage> {
    const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!isConfigured) {
        return {
            name: 'Supabase',
            icon: '🗄️',
            status: 'inactive',
            unit: 'Storage (MB)',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Not configured',
        };
    }

    try {
        // Estimate DB usage from row counts
        const [posts, comments, users, translations] = await Promise.all([
            db.post.count(),
            db.comment.count(),
            db.user.count(),
            db.translation.count(),
        ]);

        return {
            name: 'Supabase',
            icon: '🗄️',
            status: 'active',
            unit: 'Rows',
            usageToday: 0,
            usageThisMonth: posts + comments + users + translations,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Free: 500MB DB, 1GB storage',
            details: {
                posts,
                comments,
                users,
                cachedTranslations: translations,
            },
        };
    } catch (error) {
        console.error('Failed to get Supabase stats:', error);
        return {
            name: 'Supabase',
            icon: '🗄️',
            status: 'error',
            unit: 'Rows',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
}

// --- Main Aggregator ---

export async function getApiUsageData(): Promise<ApiUsageData> {
    const [deepl, gemini, stripe, resend, supabase] = await Promise.all([
        getDeepLStats(),
        getGeminiStats(),
        getStripeStats(),
        getResendStats(),
        getSupabaseStats(),
    ]);

    const giphy = getGiphyStats();

    const services = [deepl, gemini, stripe, resend, giphy, supabase];

    const totalCostToday = services.reduce((sum, s) => sum + s.costToday, 0);
    const totalCostThisMonth = services.reduce((sum, s) => sum + s.costThisMonth, 0);
    const totalRequestsToday = services.reduce((sum, s) => sum + s.usageToday, 0);
    const totalRequestsThisMonth = services.reduce((sum, s) => sum + s.usageThisMonth, 0);

    return {
        services,
        totalCostToday,
        totalCostThisMonth,
        totalRequestsToday,
        totalRequestsThisMonth,
        overallCacheHitRate: deepl.cacheHitRate || 0,
        lastUpdated: new Date().toISOString(),
    };
}
