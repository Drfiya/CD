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
            unit: 'Tokens',
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

        // Check ApiUsage table for tracked Gemini calls
        const [todayUsage, monthUsage] = await Promise.all([
            db.apiUsage.aggregate({
                where: { service: 'gemini', createdAt: { gte: today, lte: now } },
                _sum: { units: true, cost: true },
                _count: true,
            }),
            db.apiUsage.aggregate({
                where: { service: 'gemini', createdAt: { gte: monthStart, lte: now } },
                _sum: { units: true, cost: true },
                _count: true,
            }),
        ]);

        // Fallback: also count FeedReport rows as proxy
        const reportsMonth = await db.feedReport.count({
            where: { createdAt: { gte: monthStart, lte: now } },
        });

        const tokensToday = todayUsage._sum.units || 0;
        const tokensMonth = monthUsage._sum.units || (reportsMonth * 2000);
        const costToday = todayUsage._sum.cost || 0;
        const costMonth = monthUsage._sum.cost || (reportsMonth * 0.001);

        return {
            name: 'Gemini AI',
            icon: '🤖',
            status: 'active',
            unit: 'Tokens',
            usageToday: tokensToday,
            usageThisMonth: tokensMonth,
            costToday,
            costThisMonth: costMonth,
            limit: 'Free: 15 RPM / Flash: ~$0.001/report',
            details: {
                trackedCalls: monthUsage._count,
                feedReports: reportsMonth,
                estimatedTokensMonth: tokensMonth,
            },
        };
    } catch (error) {
        console.error('Failed to get Gemini stats:', error);
        return {
            name: 'Gemini AI',
            icon: '🤖',
            status: 'error',
            unit: 'Tokens',
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
            unit: 'Requests',
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

        const [todayUsage, monthUsage, activeMembers, totalMembers] = await Promise.all([
            db.apiUsage.aggregate({
                where: { service: 'stripe', createdAt: { gte: today, lte: now } },
                _count: true,
            }),
            db.apiUsage.aggregate({
                where: { service: 'stripe', createdAt: { gte: monthStart, lte: now } },
                _count: true,
            }),
            db.membership.count({ where: { status: 'ACTIVE' } }),
            db.membership.count(),
        ]);

        // Get event type breakdown
        const eventBreakdown = await db.apiUsage.groupBy({
            by: ['action'],
            where: { service: 'stripe', createdAt: { gte: monthStart, lte: now } },
            _count: true,
            orderBy: { _count: { action: 'desc' } },
        });

        const eventDetails: Record<string, number> = {};
        eventBreakdown.forEach(e => {
            eventDetails[e.action] = e._count;
        });

        return {
            name: 'Stripe',
            icon: '💳',
            status: 'active',
            unit: 'Requests',
            usageToday: todayUsage._count,
            usageThisMonth: monthUsage._count,
            costToday: 0,
            costThisMonth: 0,
            limit: '2.9% + 30¢ per charge',
            details: {
                activeSubscriptions: activeMembers,
                totalMembers: totalMembers,
                ...eventDetails,
            },
        };
    } catch (error) {
        console.error('Failed to get Stripe stats:', error);
        return {
            name: 'Stripe',
            icon: '💳',
            status: 'error',
            unit: 'Requests',
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
    if (!isConfigured) {
        return {
            name: 'Resend',
            icon: '📧',
            status: 'inactive',
            unit: 'Emails',
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

        const [todayUsage, monthUsage] = await Promise.all([
            db.apiUsage.aggregate({
                where: { service: 'resend', createdAt: { gte: today, lte: now } },
                _sum: { units: true },
                _count: true,
            }),
            db.apiUsage.aggregate({
                where: { service: 'resend', createdAt: { gte: monthStart, lte: now } },
                _sum: { units: true },
                _count: true,
            }),
        ]);

        return {
            name: 'Resend',
            icon: '📧',
            status: 'active',
            unit: 'Emails',
            usageToday: todayUsage._sum.units || 0,
            usageThisMonth: monthUsage._sum.units || 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Free: 100/day, 3K/mo',
            details: {
                emailsSentToday: todayUsage._count,
                emailsSentMonth: monthUsage._count,
            },
        };
    } catch (error) {
        console.error('Failed to get Resend stats:', error);
        return {
            name: 'Resend',
            icon: '📧',
            status: 'error',
            unit: 'Emails',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
}

// --- GIPHY Stats ---

async function getGiphyStats(): Promise<ServiceUsage> {
    const isConfigured = !!process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!isConfigured) {
        return {
            name: 'GIPHY',
            icon: '🎬',
            status: 'inactive',
            unit: 'Requests',
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

        const [todayUsage, monthUsage] = await Promise.all([
            db.apiUsage.aggregate({
                where: { service: 'giphy', createdAt: { gte: today, lte: now } },
                _count: true,
            }),
            db.apiUsage.aggregate({
                where: { service: 'giphy', createdAt: { gte: monthStart, lte: now } },
                _count: true,
            }),
        ]);

        // Get breakdown by action type
        const actionBreakdown = await db.apiUsage.groupBy({
            by: ['action'],
            where: { service: 'giphy', createdAt: { gte: monthStart, lte: now } },
            _count: true,
        });

        const details: Record<string, number> = {};
        actionBreakdown.forEach(a => {
            details[`${a.action}Requests`] = a._count;
        });

        return {
            name: 'GIPHY',
            icon: '🎬',
            status: 'active',
            unit: 'Requests',
            usageToday: todayUsage._count,
            usageThisMonth: monthUsage._count,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Free: 42 req/hr, 1K/day',
            details,
        };
    } catch (error) {
        console.error('Failed to get GIPHY stats:', error);
        return {
            name: 'GIPHY',
            icon: '🎬',
            status: 'error',
            unit: 'Requests',
            usageToday: 0,
            usageThisMonth: 0,
            costToday: 0,
            costThisMonth: 0,
            limit: 'Error fetching stats',
        };
    }
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
    const [deepl, gemini, stripe, resend, giphy, supabase] = await Promise.all([
        getDeepLStats(),
        getGeminiStats(),
        getStripeStats(),
        getResendStats(),
        getGiphyStats(),
        getSupabaseStats(),
    ]);

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
