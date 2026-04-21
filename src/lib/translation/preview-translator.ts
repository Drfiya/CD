/**
 * Translation preview helper.
 *
 * Used by the post editor to give authors an instant preview of their
 * content in another language. Shares the 3-tier hash cache with the
 * production path so a second preview of the same draft is free.
 */

import { getCachedTranslation3Tier, setCachedTranslation3Tier } from './cache';
import { translateText } from './providers/deepl';
import { collectProtectedTerms, restoreNumericalValues, validateNumericalIntegrity } from './protected-terms';
import { trackTranslationUsage } from './usage';
import { checkBudget, activateKillSwitch } from './budget';

/**
 * Translate a single text for preview purposes.
 *
 * Does not bind to an entity — skips the entity-level Translation table.
 * In-memory + Postgres caches are still consulted and populated so a second
 * preview of the same draft never hits DeepL.
 */
export async function translateForPreview(
    text: string,
    sourceLang: string,
    targetLang: string,
    categoryName?: string,
): Promise<string> {
    if (sourceLang === targetLang || !text.trim()) return text;

    const cached = await getCachedTranslation3Tier(text, sourceLang, targetLang);
    if (cached) {
        trackTranslationUsage(text.length, sourceLang, targetLang, true, cached.tier === 'memory' ? 'lru' : 'db');
        return cached.text;
    }

    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
        if (!budgetCheck.killSwitchActive) activateKillSwitch();
        return text;
    }

    const { allTerms, cleanText, numericalValues } = await collectProtectedTerms(text, categoryName);

    let textToTranslate = cleanText;
    for (const { placeholder, original } of numericalValues) {
        textToTranslate = textToTranslate.replace(original, placeholder);
    }

    let translated = await translateText(textToTranslate, sourceLang, targetLang, allTerms);

    if (numericalValues.length > 0) {
        translated = restoreNumericalValues(translated, numericalValues);
        validateNumericalIntegrity(text, translated, numericalValues);
    }

    trackTranslationUsage(text.length, sourceLang, targetLang, false, 'miss');

    if (translated !== text) {
        setCachedTranslation3Tier(text, sourceLang, targetLang, translated).catch(() => { /* non-fatal */ });
    }

    return translated;
}
