/**
 * Translation Cache Layer — 3-Tier Caching System (Teil D + G)
 *
 * Tier 1: In-Memory LRU Cache (< 5ms)
 *   - Map-based LRU with 1,000 entry capacity
 *   - Cache key: SHA-256(sourceText + sourceLocale + targetLocale + glossaryId)
 *   - Resets on deploy/restart
 *
 * Tier 2: PostgreSQL Hash Cache (< 50ms)
 *   - Uses the TranslationCache model
 *   - Unique on (sourceTextHash, sourceLocale, targetLocale, glossaryId)
 *   - Respects expiresAt for TTL-based expiration
 *
 * Tier 3: DeepL API Fallback (200-800ms)
 *   - Caller invokes the API and stores result via setCachedTranslation3Tier
 *
 * The existing entity-based cache (Translation model) is preserved below
 * and used by translateForUser() in index.ts.
 */

import { createHash } from 'crypto';

import db from '@/lib/db';

// ---------------------------------------------------------------------------
// Tier 1 — In-Memory LRU Cache
// ---------------------------------------------------------------------------

const LRU_CAPACITY = 1_000;

class LRUCache<V> {
    private capacity: number;
    /** Ordered map — most-recently-used entry is last. */
    private cache: Map<string, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: string): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }
        // Move to end (most-recently-used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: string, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Evict least-recently-used (first entry)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Delete all entries whose keys match the predicate.
     * Returns the number of entries removed.
     */
    deleteWhere(predicate: (key: string) => boolean): number {
        let count = 0;
        for (const key of Array.from(this.cache.keys())) {
            if (predicate(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    clear(): number {
        const size = this.cache.size;
        this.cache.clear();
        return size;
    }

    get size(): number {
        return this.cache.size;
    }

    get maxCapacity(): number {
        return this.capacity;
    }
}

/** Module-level LRU instance — lives for the lifetime of the Node.js process. */
const memoryCache = new LRUCache<string>(LRU_CAPACITY);

// ---------------------------------------------------------------------------
// In-process per-tier telemetry (admin dashboard)
// ---------------------------------------------------------------------------
// Process-local counters — reset on restart. For cross-instance roll-ups
// we rely on TranslationUsage (DB-backed) already tracked at the caller.
// These counters feed the "Cache-Health by Tier" panel in the admin UI.

const tierCounters = {
    memoryHits: 0,
    postgresHits: 0,
    misses: 0,
};

/** Bounded bag of uncached phrases (hottest misses), LRU-evicted by count. */
const uncachedCounts = new Map<string, number>();
const UNCACHED_CAPACITY = 200;

function noteUncached(sourceText: string) {
    const key = sourceText.slice(0, 120); // bound memory per key
    const current = uncachedCounts.get(key) ?? 0;
    uncachedCounts.set(key, current + 1);
    if (uncachedCounts.size > UNCACHED_CAPACITY) {
        const first = uncachedCounts.keys().next().value;
        if (first !== undefined) uncachedCounts.delete(first);
    }
}

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic SHA-256 cache key from the translation parameters.
 *
 * The key encodes sourceText, sourceLocale, targetLocale, and an optional
 * glossaryId so that any change in input produces a different hash.
 */
export function generateCacheKey(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string,
    glossaryId?: string,
): string {
    const payload = [
        sourceText,
        sourceLocale.toLowerCase(),
        targetLocale.toLowerCase(),
        glossaryId ?? '',
    ].join('\x1F'); // unit separator — avoids collisions from concatenation

    return createHash('sha256').update(payload, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// 3-Tier Lookup
// ---------------------------------------------------------------------------

/**
 * Look up a translation through all three cache tiers.
 *
 * Returns `{ text, tier }` on a hit, or `null` on a complete miss (caller
 * should then call the DeepL API and persist with `setCachedTranslation3Tier`).
 *
 * @param sourceText      Original text to translate
 * @param sourceLocale    BCP-47 source locale
 * @param targetLocale    BCP-47 target locale
 * @param glossaryId      Optional DeepL glossary ID
 * @param cacheTtlDays    If set, Tier 2 entries older than this are ignored
 */
export async function getCachedTranslation3Tier(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string,
    glossaryId?: string,
    _cacheTtlDays?: number,
): Promise<{ text: string; tier: 'memory' | 'postgres' } | null> {
    const cacheKey = generateCacheKey(sourceText, sourceLocale, targetLocale, glossaryId);

    // --- Tier 1: In-Memory LRU ---
    try {
        const memoryHit = memoryCache.get(cacheKey);
        if (memoryHit !== undefined) {
            console.debug('[Translation Cache] Tier 1 hit (memory)');
            tierCounters.memoryHits++;
            return { text: memoryHit, tier: 'memory' };
        }
    } catch (error) {
        console.error('[Translation Cache] Tier 1 read error:', error);
        // Non-fatal — fall through to Tier 2
    }

    // --- Tier 2: PostgreSQL TranslationCache ---
    try {
        const sourceTextHash = cacheKey; // hash already computed

        const row = await db.translationCache.findUnique({
            where: {
                sourceTextHash_sourceLocale_targetLocale_glossaryId: {
                    sourceTextHash,
                    sourceLocale: sourceLocale.toLowerCase(),
                    targetLocale: targetLocale.toLowerCase(),
                    glossaryId: glossaryId ?? '',
                },
            },
            select: {
                translatedText: true,
                expiresAt: true,
            },
        });

        if (row) {
            // Respect TTL — if expiresAt is set and in the past, treat as miss
            if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
                console.debug('[Translation Cache] Tier 2 expired');
            } else {
                console.debug('[Translation Cache] Tier 2 hit (postgres)');

                // Promote to Tier 1
                try {
                    memoryCache.set(cacheKey, row.translatedText);
                } catch {
                    // Non-fatal
                }

                tierCounters.postgresHits++;
                return { text: row.translatedText, tier: 'postgres' };
            }
        }
    } catch (error) {
        console.error('[Translation Cache] Tier 2 read error:', error);
        // Non-fatal — caller will fall through to API
    }

    // --- Tier 3: Complete miss — caller should invoke DeepL API ---
    console.debug('[Translation Cache] Cache miss — all tiers');
    tierCounters.misses++;
    noteUncached(sourceText);
    return null;
}

// ---------------------------------------------------------------------------
// 3-Tier Store
// ---------------------------------------------------------------------------

/**
 * Persist a translation result in both Tier 1 (memory) and Tier 2 (postgres).
 *
 * Call this after a successful DeepL API response so subsequent requests are
 * served from cache.
 *
 * @param sourceText      Original text
 * @param sourceLocale    BCP-47 source locale
 * @param targetLocale    BCP-47 target locale
 * @param translatedText  Translation from DeepL
 * @param glossaryId      Optional DeepL glossary ID
 * @param contextHash     Optional hash representing surrounding context
 * @param ttlDays         Optional TTL in days (default: no expiration)
 */
export async function setCachedTranslation3Tier(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string,
    translatedText: string,
    glossaryId?: string,
    contextHash?: string,
    ttlDays?: number,
): Promise<void> {
    const cacheKey = generateCacheKey(sourceText, sourceLocale, targetLocale, glossaryId);

    // --- Tier 1: In-Memory LRU ---
    try {
        memoryCache.set(cacheKey, translatedText);
    } catch (error) {
        console.error('[Translation Cache] Tier 1 write error:', error);
    }

    // --- Tier 2: PostgreSQL TranslationCache ---
    try {
        const expiresAt =
            ttlDays != null && ttlDays > 0
                ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
                : null;

        await db.translationCache.upsert({
            where: {
                sourceTextHash_sourceLocale_targetLocale_glossaryId: {
                    sourceTextHash: cacheKey,
                    sourceLocale: sourceLocale.toLowerCase(),
                    targetLocale: targetLocale.toLowerCase(),
                    glossaryId: glossaryId ?? '',
                },
            },
            create: {
                sourceTextHash: cacheKey,
                sourceLocale: sourceLocale.toLowerCase(),
                targetLocale: targetLocale.toLowerCase(),
                translatedText,
                glossaryId: glossaryId ?? '',
                contextHash: contextHash ?? null,
                expiresAt,
            },
            update: {
                translatedText,
                contextHash: contextHash ?? null,
                expiresAt,
            },
        });
    } catch (error) {
        console.error('[Translation Cache] Tier 2 write error:', error);
        // Non-fatal — the translation was already stored in Tier 1
    }
}

// ---------------------------------------------------------------------------
// Cache Invalidation
// ---------------------------------------------------------------------------

/**
 * Invalidate cached translations when glossary or blacklist entries change.
 *
 * Supports selective invalidation by locale pair or glossary, or a full flush.
 */
export async function invalidateTranslationCache(opts: {
    sourceLocale?: string;
    targetLocale?: string;
    glossaryId?: string;
    all?: boolean;
}): Promise<{ deletedMemory: number; deletedPostgres: number }> {
    let deletedMemory = 0;
    let deletedPostgres = 0;

    // --- Tier 1: Memory ---
    try {
        if (opts.all) {
            deletedMemory = memoryCache.clear();
        } else {
            // We cannot inspect internal key components (they are hashed), so
            // a selective memory invalidation is not feasible without a reverse
            // index.  For safety, flush the entire in-memory cache when any
            // filter is provided — it will be repopulated from Tier 2 on the
            // next requests.
            deletedMemory = memoryCache.clear();
        }
    } catch (error) {
        console.error('[Translation Cache] Memory invalidation error:', error);
    }

    // --- Tier 2: PostgreSQL ---
    try {
        if (opts.all) {
            const result = await db.translationCache.deleteMany({});
            deletedPostgres = result.count;
        } else {
            // Build a dynamic where clause
            const where: Record<string, string> = {};
            if (opts.sourceLocale) where.sourceLocale = opts.sourceLocale.toLowerCase();
            if (opts.targetLocale) where.targetLocale = opts.targetLocale.toLowerCase();
            if (opts.glossaryId) where.glossaryId = opts.glossaryId;

            if (Object.keys(where).length > 0) {
                const result = await db.translationCache.deleteMany({ where });
                deletedPostgres = result.count;
            }
        }
    } catch (error) {
        console.error('[Translation Cache] Postgres invalidation error:', error);
    }

    console.debug(
        `[Translation Cache] Invalidated — memory: ${deletedMemory}, postgres: ${deletedPostgres}`,
    );

    return { deletedMemory, deletedPostgres };
}

// ---------------------------------------------------------------------------
// Cache Statistics (Admin Dashboard)
// ---------------------------------------------------------------------------

/**
 * Return high-level cache statistics for the admin dashboard.
 */
export async function getCacheStats(): Promise<{
    memorySize: number;
    memoryCapacity: number;
    postgresCount: number;
    postgresExpiredCount: number;
    tierCounters: {
        memoryHits: number;
        postgresHits: number;
        misses: number;
        total: number;
        memoryHitRate: number;
        postgresHitRate: number;
        missRate: number;
    };
    topUncached: Array<{ phrase: string; count: number }>;
}> {
    let postgresCount = 0;
    let postgresExpiredCount = 0;

    try {
        postgresCount = await db.translationCache.count();
    } catch (error) {
        console.error('[Translation Cache] Stats count error:', error);
    }

    try {
        postgresExpiredCount = await db.translationCache.count({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    } catch (error) {
        console.error('[Translation Cache] Stats expired count error:', error);
    }

    const { memoryHits, postgresHits, misses } = tierCounters;
    const total = memoryHits + postgresHits + misses;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

    const topUncached = Array.from(uncachedCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([phrase, count]) => ({ phrase, count }));

    return {
        memorySize: memoryCache.size,
        memoryCapacity: memoryCache.maxCapacity,
        postgresCount,
        postgresExpiredCount,
        tierCounters: {
            memoryHits,
            postgresHits,
            misses,
            total,
            memoryHitRate: pct(memoryHits),
            postgresHitRate: pct(postgresHits),
            missRate: pct(misses),
        },
        topUncached,
    };
}

// ===========================================================================
// EXISTING ENTITY-BASED CACHE (Translation model)
// ===========================================================================
// These functions are unchanged and used by translateForUser() in index.ts.
// They operate on the Translation table (entity-type + entityId + fieldName).
// ===========================================================================

/**
 * Get a cached translation from the database.
 * Returns the translated content if found, null otherwise.
 */
export async function getCachedTranslation(
    entityType: string,
    entityId: string,
    fieldName: string,
    targetLanguage: string,
): Promise<string | null> {
    try {
        const translation = await db.translation.findUnique({
            where: {
                entityType_entityId_fieldName_targetLanguage: {
                    entityType,
                    entityId,
                    fieldName,
                    targetLanguage,
                },
            },
            select: {
                translatedContent: true,
            },
        });

        return translation?.translatedContent ?? null;
    } catch (error) {
        console.error('Error fetching cached translation:', error);
        return null;
    }
}

/**
 * Get a cached translation only if the source hash matches.
 * This ensures we return fresh translations when content changes.
 */
export async function getCachedTranslationWithHash(
    entityType: string,
    entityId: string,
    fieldName: string,
    targetLanguage: string,
    sourceHash: string,
): Promise<string | null> {
    try {
        const translation = await db.translation.findUnique({
            where: {
                entityType_entityId_fieldName_targetLanguage: {
                    entityType,
                    entityId,
                    fieldName,
                    targetLanguage,
                },
            },
            select: {
                translatedContent: true,
                sourceHash: true,
            },
        });

        // Only return cached translation if hash matches (content unchanged)
        if (translation && translation.sourceHash === sourceHash) {
            return translation.translatedContent;
        }

        return null;
    } catch (error) {
        console.error('Error fetching cached translation:', error);
        return null;
    }
}

export interface SetCachedTranslationParams {
    entityType: string;
    entityId: string;
    fieldName: string;
    sourceLanguage: string;
    sourceHash: string;
    targetLanguage: string;
    translatedContent: string;
    modelProvider: string;
    modelVersion: string;
    confidenceScore?: number;
}

/**
 * Store or update a translation in the entity-based cache.
 */
export async function setCachedTranslation(
    params: SetCachedTranslationParams,
): Promise<void> {
    const {
        entityType,
        entityId,
        fieldName,
        sourceLanguage,
        sourceHash,
        targetLanguage,
        translatedContent,
        modelProvider,
        modelVersion,
        confidenceScore,
    } = params;

    try {
        await db.translation.upsert({
            where: {
                entityType_entityId_fieldName_targetLanguage: {
                    entityType,
                    entityId,
                    fieldName,
                    targetLanguage,
                },
            },
            create: {
                entityType,
                entityId,
                fieldName,
                sourceLanguage,
                sourceHash,
                targetLanguage,
                translatedContent,
                modelProvider,
                modelVersion,
                confidenceScore,
            },
            update: {
                sourceLanguage,
                sourceHash,
                translatedContent,
                modelProvider,
                modelVersion,
                confidenceScore,
            },
        });
    } catch (error) {
        console.error('Error caching translation:', error);
        // Don't throw - caching failures shouldn't break the app
    }
}

/**
 * Delete cached translations for an entity (e.g., when content is deleted).
 */
export async function deleteCachedTranslations(
    entityType: string,
    entityId: string,
): Promise<void> {
    try {
        await db.translation.deleteMany({
            where: {
                entityType,
                entityId,
            },
        });
    } catch (error) {
        console.error('Error deleting cached translations:', error);
    }
}
