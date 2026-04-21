/**
 * Confidence-enriched translation.
 *
 * Wraps translateForUser with a quality/confidence assessment (F1 feature).
 * Used by the admin preview and translation feedback UI.
 */

import { translateForUser, type TranslateForUserParams } from './core';
import { assessTranslationConfidence, getLanguagePairQuality, type ConfidenceResult } from './quality';
import { collectProtectedTerms } from './protected-terms';

export type { ConfidenceResult };

/**
 * Translate content and also return a confidence assessment.
 */
export async function translateForUserWithConfidence(
    params: TranslateForUserParams,
): Promise<{ text: string; confidence: ConfidenceResult }> {
    const translated = await translateForUser(params);

    const pairInfo = await getLanguagePairQuality(params.sourceLanguage, params.targetLanguage);
    const { allTerms } = await collectProtectedTerms(params.content, params.categoryName);

    const confidence = assessTranslationConfidence({
        sourceText: params.content,
        sourceLocale: params.sourceLanguage,
        targetLocale: params.targetLanguage,
        glossaryHitCount: params.glossaryId ? 1 : 0,
        textLength: params.content.length,
        hasSpecialTerms: allTerms.length > 0,
        pairQuality: pairInfo.quality,
    });

    return { text: translated, confidence };
}
