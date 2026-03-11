/**
 * Translation Quality Assessment — Teil F (F1 + F5)
 *
 * F1: Translation Confidence Indicator
 *   - Scores a translation on a 0.0–1.0 scale based on text length, glossary
 *     coverage, presence of special terms, and language pair quality.
 *   - Returns a level (high / medium / low) with an optional user-facing label.
 *
 * F5: Language Pair Quality Matrix
 *   - Hardcoded A/B/C/D ratings for common locale pairs.
 *   - DB-backed overrides with 5-minute in-memory cache (same pattern as
 *     the blacklist cache in protected-terms.ts).
 *   - Determines whether a pivot translation (through English) is required.
 */

import db from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// F1 — Translation Confidence Indicator
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceResult {
    /** Overall confidence level */
    level: 'high' | 'medium' | 'low';
    /** Numeric confidence score in the range [0.0, 1.0] */
    score: number;
    /** User-facing label — null for high confidence */
    label: string | null;
    /** Whether the Truth toggle should be visually highlighted for low confidence */
    showTruthHighlight: boolean;
}

/**
 * Assess the confidence of a translation based on multiple heuristic signals.
 *
 * Scoring rubric:
 *   Base score:                         0.8
 *   Short text  (< 100 chars):         +0.1
 *   Long text   (> 2000 chars):        -0.1
 *   Glossary hits (> 0):               +0.05 per hit, max +0.1
 *   Has special / protected terms:     -0.05
 *   Language pair quality A:           +0.1
 *   Language pair quality B:            0.0
 *   Language pair quality C:           -0.15
 *   Language pair quality D:           -0.3
 *
 * Thresholds:
 *   score > 0.8  → high   (no label)
 *   0.5 ≤ score  → medium ("Machine translated")
 *   score < 0.5  → low    ("Machine translated – review original recommended")
 */
export function assessTranslationConfidence(params: {
    sourceText: string;
    sourceLocale: string;
    targetLocale: string;
    glossaryHitCount: number;
    textLength: number;
    hasSpecialTerms: boolean;
    pairQuality?: string; // 'A' | 'B' | 'C' | 'D'
}): ConfidenceResult {
    const {
        textLength,
        glossaryHitCount,
        hasSpecialTerms,
        pairQuality,
    } = params;

    // --- Start with base score ---
    let score = 0.8;

    // --- Text length adjustment ---
    if (textLength < 100) {
        score += 0.1;
    } else if (textLength > 2000) {
        score -= 0.1;
    }

    // --- Glossary hit bonus (max +0.1) ---
    if (glossaryHitCount > 0) {
        score += Math.min(glossaryHitCount * 0.05, 0.1);
    }

    // --- Special / protected terms penalty ---
    if (hasSpecialTerms) {
        score -= 0.05;
    }

    // --- Language pair quality adjustment ---
    switch (pairQuality) {
        case 'A':
            score += 0.1;
            break;
        case 'B':
            // no adjustment
            break;
        case 'C':
            score -= 0.15;
            break;
        case 'D':
            score -= 0.3;
            break;
        default:
            // Unknown quality — no adjustment (caller may not have resolved it)
            break;
    }

    // --- Clamp to [0.0, 1.0] ---
    score = Math.max(0, Math.min(1, score));

    // --- Round to 2 decimal places for cleanliness ---
    score = Math.round(score * 100) / 100;

    // --- Determine level and label ---
    if (score > 0.8) {
        return {
            level: 'high',
            score,
            label: null,
            showTruthHighlight: false,
        };
    }

    if (score >= 0.5) {
        return {
            level: 'medium',
            score,
            label: 'Machine translated',
            showTruthHighlight: false,
        };
    }

    return {
        level: 'low',
        score,
        label: 'Machine translated \u2013 review original recommended',
        showTruthHighlight: true,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// F5 — Language Pair Quality Matrix
// ═══════════════════════════════════════════════════════════════════════════════

export interface LanguagePairInfo {
    sourceLocale: string;
    targetLocale: string;
    quality: 'A' | 'B' | 'C' | 'D';
    usePivot: boolean;
    pivotLocale: string | null;
    warningMessage: string | null;
}

// ---------------------------------------------------------------------------
// Default quality ratings (hardcoded fallback)
// ---------------------------------------------------------------------------

export const DEFAULT_PAIR_QUALITY: Record<string, string> = {
    'en-de': 'A', 'de-en': 'A',
    'en-fr': 'A', 'fr-en': 'A',
    'en-es': 'A', 'es-en': 'A',
    'en-it': 'A', 'it-en': 'A',
    'en-nl': 'A', 'nl-en': 'A',
    'en-pl': 'A', 'pl-en': 'A',
    'en-pt': 'A', 'pt-en': 'A',
    'en-ru': 'B', 'ru-en': 'B',
    'en-ja': 'B', 'ja-en': 'B',
    'en-zh': 'B', 'zh-en': 'B',
    'en-ko': 'B', 'ko-en': 'B',
    'de-fr': 'A', 'fr-de': 'A',
    'de-es': 'B', 'es-de': 'B',
    'fr-es': 'B', 'es-fr': 'B',
    'ja-ko': 'C', 'ko-ja': 'C',
    // All unspecified pairs default to 'C'
};

// ---------------------------------------------------------------------------
// In-memory cache for DB-backed pair quality overrides (5-minute TTL)
// ---------------------------------------------------------------------------

interface PairQualityCacheEntry {
    data: Record<string, string>;
    fetchedAt: number;
}

const PAIR_QUALITY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let pairQualityCache: PairQualityCacheEntry | null = null;

/**
 * Load language pair quality overrides from the database.
 *
 * Uses an in-memory cache with a 5-minute TTL to avoid hitting the DB on
 * every translation request.  Falls back to an empty record if the DB
 * query fails (the caller then uses DEFAULT_PAIR_QUALITY).
 */
async function loadPairQualityOverrides(): Promise<Record<string, string>> {
    const now = Date.now();

    // Return cached data if still fresh
    if (pairQualityCache && (now - pairQualityCache.fetchedAt) < PAIR_QUALITY_CACHE_TTL_MS) {
        return pairQualityCache.data;
    }

    try {
        const entries = await db.languagePairQuality.findMany({
            select: {
                sourceLocale: true,
                targetLocale: true,
                quality: true,
            },
        });

        const data: Record<string, string> = {};
        for (const entry of entries) {
            const key = `${entry.sourceLocale.toLowerCase()}-${entry.targetLocale.toLowerCase()}`;
            data[key] = entry.quality;
        }

        pairQualityCache = { data, fetchedAt: now };
        return data;
    } catch (error) {
        console.error('[quality] Failed to load pair quality overrides from DB:', error);
        // Return stale cache if available, otherwise empty
        return pairQualityCache?.data ?? {};
    }
}

/**
 * Force-invalidate the pair quality cache (useful after admin changes).
 */
export function invalidatePairQualityCache(): void {
    pairQualityCache = null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the canonical pair key from two locale codes.
 */
function pairKey(sourceLocale: string, targetLocale: string): string {
    return `${sourceLocale.toLowerCase()}-${targetLocale.toLowerCase()}`;
}

/**
 * Determine whether pivot translation (through English) should be used.
 *
 * Pivot translation is activated for quality 'D' pairs — the idea is that
 * translating source -> en -> target via two high-quality hops yields a
 * better result than a single low-quality direct translation.
 */
export function shouldUsePivot(quality: string): boolean {
    return quality === 'D';
}

/**
 * Warning messages by quality grade.
 */
function warningForQuality(quality: string): string | null {
    switch (quality) {
        case 'A':
        case 'B':
            return null;
        case 'C':
            return 'Translation quality for this language pair may be limited. Please review the original text if in doubt.';
        case 'D':
            return 'This language pair has low direct translation quality. A pivot translation through English will be used.';
        default:
            return 'Translation quality for this language pair is unknown. Please review the original text.';
    }
}

/**
 * Resolve the full quality information for a source/target locale pair.
 *
 * Resolution order:
 *   1. DB overrides (cached with 5-minute TTL)
 *   2. Hardcoded DEFAULT_PAIR_QUALITY
 *   3. Fallback: 'C' for any unspecified pair
 */
export async function getLanguagePairQuality(
    sourceLocale: string,
    targetLocale: string,
): Promise<LanguagePairInfo> {
    const key = pairKey(sourceLocale, targetLocale);

    // 1. Try DB overrides
    let quality: string | undefined;
    try {
        const overrides = await loadPairQualityOverrides();
        quality = overrides[key];
    } catch {
        // Non-fatal — fall through to hardcoded defaults
    }

    // 2. Fall back to hardcoded defaults
    if (!quality) {
        quality = DEFAULT_PAIR_QUALITY[key];
    }

    // 3. Ultimate fallback
    if (!quality) {
        quality = 'C';
    }

    const validQuality = quality as 'A' | 'B' | 'C' | 'D';
    const usePivot = shouldUsePivot(validQuality);

    return {
        sourceLocale: sourceLocale.toLowerCase(),
        targetLocale: targetLocale.toLowerCase(),
        quality: validQuality,
        usePivot,
        pivotLocale: usePivot ? 'en' : null,
        warningMessage: warningForQuality(validQuality),
    };
}
