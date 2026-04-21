/**
 * Core translation function — translateForUser.
 *
 * Separate from index.ts to avoid circular imports with entity-translators.ts,
 * which needs translateForUser but is re-exported by index.ts.
 */

import { getCachedTranslationWithHash, setCachedTranslation, getCachedTranslation3Tier, setCachedTranslation3Tier } from './cache';
import { translateText, type TranslateOptions } from './providers/deepl';
import { hashContent } from './utils';
import { collectProtectedTerms, restoreNumericalValues, validateNumericalIntegrity } from './protected-terms';
import { trackTranslationUsage } from './usage';
import { checkBudget, activateKillSwitch } from './budget';
import { translateSegmented } from './segmented-translator';

const SEGMENT_THRESHOLD_CHARS = 240;
const MODEL_PROVIDER = 'deepl';
const MODEL_VERSION = 'v2';

export interface TranslateForUserParams {
    entityType: string;
    entityId: string;
    fieldName: string;
    content: string;
    sourceLanguage: string;
    targetLanguage: string;
    categoryName?: string;
    context?: string;
    formality?: 'more' | 'less' | 'default';
    glossaryId?: string;
}

/**
 * Translate content for a user.
 *
 * - Returns original if source and target languages match
 * - Checks 3-tier cache first (memory → Postgres → entity)
 * - Falls back to DeepL API on cache miss
 * - Applies protected terms (global, domain, user-defined)
 * - Stores result in cache
 * - Tracks usage for cost monitoring
 */
export async function translateForUser(params: TranslateForUserParams): Promise<string> {
    const { entityType, entityId, fieldName, content, sourceLanguage, targetLanguage,
        categoryName, context, formality, glossaryId } = params;

    if (sourceLanguage === targetLanguage) return content;
    if (!content || !content.trim()) return content;

    const contentHashValue = hashContent(content);

    // ── Tier 1+2: 3-tier cache (In-Memory → PostgreSQL) ──────────────────────
    const tier3Result = await getCachedTranslation3Tier(content, sourceLanguage, targetLanguage, glossaryId);
    if (tier3Result) {
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true, tier3Result.tier === 'memory' ? 'lru' : 'db');
        return tier3Result.text;
    }

    // ── Segment-level cache for long content ──────────────────────────────────
    if (content.length >= SEGMENT_THRESHOLD_CHARS) {
        const segmented = await translateSegmented({ content, sourceLanguage, targetLanguage, categoryName, context, formality, glossaryId });

        // NF1 guard: skip cache writes when kill-switch forced identity mapping
        if (segmented !== content) {
            setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, segmented, glossaryId)
                .catch(() => { /* non-fatal */ });
            setCachedTranslation({
                entityType, entityId, fieldName, sourceLanguage,
                sourceHash: contentHashValue, targetLanguage,
                translatedContent: segmented, modelProvider: MODEL_PROVIDER, modelVersion: MODEL_VERSION,
            });
        }

        return segmented;
    }

    // ── Tier 2b: Entity-based cache (Translation table) ──────────────────────
    const entityCached = await getCachedTranslationWithHash(entityType, entityId, fieldName, targetLanguage, contentHashValue);
    if (entityCached) {
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true, 'db');
        if (entityCached !== content) {
            setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, entityCached, glossaryId);
        }
        return entityCached;
    }

    // ── Budget gate ───────────────────────────────────────────────────────────
    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
        if (!budgetCheck.killSwitchActive) activateKillSwitch();
        return content;
    }

    // ── Tier 3: DeepL API call ────────────────────────────────────────────────
    const { allTerms, cleanText, numericalValues } = await collectProtectedTerms(content, categoryName);

    let textToTranslate = cleanText;
    for (const { placeholder, original } of numericalValues) {
        textToTranslate = textToTranslate.replace(original, placeholder);
    }

    const deeplOptions: TranslateOptions = {};
    if (context) deeplOptions.context = context;
    if (formality) deeplOptions.formality = formality;
    if (glossaryId) deeplOptions.glossaryId = glossaryId;
    deeplOptions.tagHandling = 'html';

    let translated = await translateText(textToTranslate, sourceLanguage, targetLanguage, allTerms, deeplOptions);

    if (numericalValues.length > 0) {
        translated = restoreNumericalValues(translated, numericalValues);
        validateNumericalIntegrity(content, translated, numericalValues);
    }

    trackTranslationUsage(content.length, sourceLanguage, targetLanguage, false, 'miss');

    // NF1 guard: skip cache writes for identity mappings (R11 audit)
    if (translated !== content) {
        setCachedTranslation({
            entityType, entityId, fieldName, sourceLanguage,
            sourceHash: contentHashValue, targetLanguage,
            translatedContent: translated, modelProvider: MODEL_PROVIDER, modelVersion: MODEL_VERSION,
        });
        setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, translated, glossaryId);
    }

    return translated;
}
