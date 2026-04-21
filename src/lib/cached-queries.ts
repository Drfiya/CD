import { unstable_cache } from 'next/cache';
import db from '@/lib/db';
import { getCommunitySettings } from '@/lib/settings-actions';
import { getActiveAiTools } from '@/lib/ai-tool-actions';

/**
 * Cached community settings — singleton row, rarely changes.
 * Revalidates every 60 seconds or on-demand via `revalidateTag('community-settings')`.
 */
export const getCachedCommunitySettings = unstable_cache(
    async () => getCommunitySettings(),
    ['community-settings'],
    { revalidate: 60, tags: ['community-settings'] }
);

/**
 * Cached top users by points (leaderboard sidebar).
 * Used by both Community and Classroom right sidebars.
 */
export const getCachedTopUsers = unstable_cache(
    async (count: number = 3) =>
        db.user.findMany({
            take: count,
            orderBy: { points: 'desc' },
            select: { id: true, name: true, image: true, points: true, level: true },
        }),
    ['top-users'],
    { revalidate: 30, tags: ['leaderboard'] }
);

/**
 * Cached active AI tools list.
 */
export const getCachedAiTools = unstable_cache(
    async () => getActiveAiTools(),
    ['active-ai-tools'],
    { revalidate: 60, tags: ['ai-tools'] }
);

/**
 * Cached categories list (for feed sidebar).
 */
export const getCachedCategories = unstable_cache(
    async () =>
        db.category.findMany({
            orderBy: { name: 'asc' },
        }),
    ['categories'],
    { revalidate: 60, tags: ['categories'] }
);

/**
 * Cached member count.
 */
export const getCachedMemberCount = unstable_cache(
    async () => db.user.count(),
    ['member-count'],
    { revalidate: 60, tags: ['members'] }
);

/**
 * Cached active languages for the platform.
 * Falls back to static list if LanguageConfig table is empty.
 * Revalidates on-demand via `revalidateTag('active-languages')`.
 */
export const getCachedActiveLanguages = unstable_cache(
    async () => {
        const configs = await db.languageConfig.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { code: true, name: true, flag: true },
        });
        // Seed fallback: if no rows exist yet, return static default
        if (configs.length === 0) {
            return [
                { code: 'en', name: 'English', flag: '🇬🇧' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
            ];
        }
        return configs;
    },
    ['active-languages'],
    { revalidate: 300, tags: ['active-languages'] }
);
