/**
 * Segment-level translation implementation.
 *
 * Splits long content into cache-friendly chunks so a small edit to one
 * paragraph does not force retranslation of the entire post. Each segment is
 * looked up independently; misses are batched into a single DeepL call.
 *
 * Internal to the translation module — not re-exported from the index.
 */

import { getCachedTranslation3Tier, setCachedTranslation3Tier } from './cache';
import { translateBatch, type TranslateOptions } from './providers/deepl';
import { collectProtectedTerms, restoreNumericalValues, validateNumericalIntegrity } from './protected-terms';
import { trackTranslationUsage } from './usage';
import { segmentContent } from './segmenter';
import { checkBudget, activateKillSwitch } from './budget';

export interface SegmentedTranslateParams {
    content: string;
    sourceLanguage: string;
    targetLanguage: string;
    categoryName?: string;
    context?: string;
    formality?: 'more' | 'less' | 'default';
    glossaryId?: string;
}

/**
 * Translate content by splitting it into cache-friendly segments.
 *
 * Each segment is looked up in the 3-tier cache independently. Only segments
 * that miss are sent to DeepL, bundled into a single batch call. Results are
 * persisted per-segment so that a subsequent edit to one paragraph reuses
 * the cached translations for all other paragraphs.
 */
export async function translateSegmented(params: SegmentedTranslateParams): Promise<string> {
    const { content, sourceLanguage, targetLanguage, categoryName, context, formality, glossaryId } = params;

    const segments = segmentContent(content);
    if (segments.length === 0) return content;

    const translatedParts: string[] = new Array(segments.length);
    const missPayloads: Array<{
        index: number;
        cleanText: string;
        allTerms: string[];
        numericalValues: Array<{ placeholder: string; original: string }>;
        original: string;
    }> = [];

    // --- Cache lookup phase ---
    await Promise.all(segments.map(async (seg, i) => {
        if (seg.skip) { translatedParts[i] = seg.text; return; }
        const hit = await getCachedTranslation3Tier(seg.text, sourceLanguage, targetLanguage, glossaryId);
        if (hit) {
            translatedParts[i] = hit.text;
            trackTranslationUsage(seg.text.length, sourceLanguage, targetLanguage, true, hit.tier === 'memory' ? 'lru' : 'db');
            return;
        }

        const { allTerms, cleanText, numericalValues } = await collectProtectedTerms(seg.text, categoryName);
        let textToSend = cleanText;
        for (const { placeholder, original } of numericalValues) {
            textToSend = textToSend.replace(original, placeholder);
        }
        missPayloads.push({ index: i, cleanText: textToSend, allTerms, numericalValues, original: seg.text });
    }));

    // --- Translate misses in a single batch ---
    // One translateBatch call (N segments → 1 HTTP request) respects DeepL's
    // concurrency limits. Previously we fanned out per-segment which exceeded
    // the plan's concurrency ceiling and degraded to the "return original" fallback.
    if (missPayloads.length > 0) {
        const budgetCheck = await checkBudget();
        if (!budgetCheck.allowed) {
            if (!budgetCheck.killSwitchActive) activateKillSwitch();
            for (const p of missPayloads) translatedParts[p.index] = p.original;
            return translatedParts.join('');
        }

        const baseOptions: TranslateOptions = { tagHandling: 'html' };
        if (context) baseOptions.context = context;
        if (formality) baseOptions.formality = formality;
        if (glossaryId) baseOptions.glossaryId = glossaryId;
        baseOptions.protectedTerms = Array.from(new Set(missPayloads.flatMap(p => p.allTerms)));

        const translations = await translateBatch(
            missPayloads.map(p => p.cleanText),
            sourceLanguage,
            targetLanguage,
            baseOptions,
        );

        missPayloads.forEach((p, i) => {
            let translated = translations[i] ?? p.cleanText;
            if (p.numericalValues.length > 0) {
                translated = restoreNumericalValues(translated, p.numericalValues);
                validateNumericalIntegrity(p.original, translated, p.numericalValues);
            }
            translatedParts[p.index] = translated;
            trackTranslationUsage(p.original.length, sourceLanguage, targetLanguage, false, 'miss');

            if (translated !== p.original) {
                setCachedTranslation3Tier(p.original, sourceLanguage, targetLanguage, translated, glossaryId)
                    .catch(() => { /* non-fatal */ });
            }
        });
    }

    return translatedParts.join('');
}
