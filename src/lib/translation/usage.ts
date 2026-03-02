/**
 * Translation Usage Tracking
 *
 * Tracks API calls for cost monitoring and optimization.
 * DeepL API Free: 500,000 chars/month
 * DeepL API Pro: $20 per 1M characters
 */

import db from '@/lib/db';

/**
 * Track a translation API call for cost monitoring
 */
export async function trackTranslationUsage(
    characterCount: number,
    sourceLang: string,
    targetLang: string,
    fromCache: boolean
): Promise<void> {
    try {
        const costEstimate = fromCache ? 0 : (characterCount / 1_000_000) * 10;

        await db.translationUsage.create({
            data: {
                date: new Date(),
                charCount: characterCount,
                sourceLang,
                targetLang,
                fromCache,
                costEstimate,
            },
        });
    } catch (error) {
        // Don't let tracking failures break translations
        console.error('Failed to track translation usage:', error);
    }
}

/**
 * Get usage statistics for a date range
 */
export async function getUsageStats(startDate: Date, endDate: Date) {
    try {
        const stats = await db.translationUsage.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                charCount: true,
                costEstimate: true,
            },
            _count: true,
        });

        const cacheStats = await db.translationUsage.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                fromCache: true,
            },
            _count: true,
        });

        return {
            totalCharacters: stats._sum.charCount || 0,
            totalCost: stats._sum.costEstimate || 0,
            totalRequests: stats._count,
            cacheHits: cacheStats._count,
            cacheHitRate: stats._count > 0
                ? (cacheStats._count / stats._count) * 100
                : 0,
        };
    } catch (error) {
        console.error('Failed to get usage stats:', error);
        return {
            totalCharacters: 0,
            totalCost: 0,
            totalRequests: 0,
            cacheHits: 0,
            cacheHitRate: 0,
        };
    }
}
