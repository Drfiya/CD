/**
 * Core Translation API
 *
 * High-level translation functions that integrate caching, detection,
 * protected terms, and the DeepL provider.
 */

import { getCachedTranslationWithHash, setCachedTranslation, getCachedTranslation3Tier, setCachedTranslation3Tier } from './cache';
import { translateText, type TranslateOptions } from './providers/deepl';
import { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from './utils';
import { collectProtectedTerms, restoreNumericalValues, validateNumericalIntegrity } from './protected-terms';
import { trackTranslationUsage } from './usage';
import { assessTranslationConfidence, getLanguagePairQuality, type ConfidenceResult } from './quality';

// Re-export utilities for convenience
export { detectLanguage } from './detect';
export { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage } from './utils';
export type { SupportedLanguage } from './utils';
export { assessTranslationConfidence, type ConfidenceResult } from './quality';
export { getCachedTranslation3Tier, setCachedTranslation3Tier, invalidateTranslationCache, getCacheStats } from './cache';

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
    /** Surrounding paragraphs for context-aware translation (A1) */
    context?: string;
    /** Formality override: 'more' | 'less' | 'default' (A2) */
    formality?: 'more' | 'less' | 'default';
    /** DeepL Glossary ID for this language pair (B2) */
    glossaryId?: string;
}

/**
 * Translate content for a user
 *
 * - Returns original if source and target languages match
 * - Checks cache first
 * - Falls back to DeepL API on cache miss
 * - Applies protected terms (global, domain, user-defined)
 * - Stores result in cache
 * - Tracks usage for cost monitoring
 */
export async function translateForUser(
    params: TranslateForUserParams
): Promise<string> {
    const {
        entityType,
        entityId,
        fieldName,
        content,
        sourceLanguage,
        targetLanguage,
        categoryName,
        context,
        formality,
        glossaryId,
    } = params;

    // No translation needed if languages match
    if (sourceLanguage === targetLanguage) {
        return content;
    }

    // Skip if content is empty
    if (!content || !content.trim()) {
        return content;
    }

    const contentHashValue = hashContent(content);

    // ── Tier 1+2: Check 3-tier cache first (In-Memory → PostgreSQL) ──
    const tier3Result = await getCachedTranslation3Tier(
        content,
        sourceLanguage,
        targetLanguage,
        glossaryId
    );
    if (tier3Result) {
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true);
        return tier3Result.text;
    }

    // ── Tier 2b: Check entity-based cache (Translation table) ──
    const entityCached = await getCachedTranslationWithHash(
        entityType,
        entityId,
        fieldName,
        targetLanguage,
        contentHashValue
    );

    if (entityCached) {
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true);
        // Promote into 3-tier cache for faster future lookups
        setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, entityCached, glossaryId);
        return entityCached;
    }

    // ── Tier 3: DeepL API call ──

    // Collect protected terms (global + domain + user-defined + DB blacklist + NER)
    const { allTerms, cleanText, numericalValues } = await collectProtectedTerms(content, categoryName);

    // Replace numerical values with placeholders before sending to DeepL
    let textToTranslate = cleanText;
    if (numericalValues.length > 0) {
        for (const { placeholder, original } of numericalValues) {
            textToTranslate = textToTranslate.replace(original, placeholder);
        }
    }

    // Build DeepL options (A1: context, A2: formality, B2: glossary)
    const deeplOptions: TranslateOptions = {};
    if (context) deeplOptions.context = context;
    if (formality) deeplOptions.formality = formality;
    if (glossaryId) deeplOptions.glossaryId = glossaryId;
    deeplOptions.tagHandling = 'html'; // Always preserve HTML formatting

    let translated = await translateText(
        textToTranslate,
        sourceLanguage,
        targetLanguage,
        allTerms,
        deeplOptions
    );

    // Restore numerical values from placeholders
    if (numericalValues.length > 0) {
        translated = restoreNumericalValues(translated, numericalValues);
        validateNumericalIntegrity(content, translated, numericalValues);
    }

    // Track API call usage
    trackTranslationUsage(content.length, sourceLanguage, targetLanguage, false);

    // Store in BOTH cache layers (fire and forget)
    setCachedTranslation({
        entityType,
        entityId,
        fieldName,
        sourceLanguage,
        sourceHash: contentHashValue,
        targetLanguage,
        translatedContent: translated,
        modelProvider: MODEL_PROVIDER,
        modelVersion: MODEL_VERSION,
    });
    setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, translated, glossaryId);

    return translated;
}

/**
 * Translate content and also return a confidence assessment (F1)
 */
export async function translateForUserWithConfidence(
    params: TranslateForUserParams
): Promise<{ text: string; confidence: ConfidenceResult }> {
    const translated = await translateForUser(params);

    // Assess confidence
    const pairInfo = await getLanguagePairQuality(
        params.sourceLanguage,
        params.targetLanguage
    );

    const { allTerms } = await collectProtectedTerms(
        params.content,
        params.categoryName
    );

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

/**
 * Post type for translation
 */
export interface TranslatablePost {
    id: string;
    plainText?: string | null;
    title?: string | null;
    languageCode?: string | null;
    [key: string]: unknown;
}

/**
 * Translate a post for a user
 *
 * Translates plainText and title fields if they exist.
 * Returns the post with translated content and original language info.
 */
export async function translatePostForUser<T extends TranslatablePost>(
    post: T,
    userLanguage: string
): Promise<T & { _originalLanguage?: string }> {
    const storedLanguage = post.languageCode || 'en';

    // When stored language matches user language, skip translation entirely.
    // We trust the stored languageCode — auto-detection was causing false
    // positives for scientific texts with mixed-language terminology (e.g.
    // German posts with English gene symbols, ICD codes, etc.).
    if (storedLanguage === userLanguage) {
        return { ...post, _originalLanguage: storedLanguage };
    }

    const effectiveSourceLanguage = storedLanguage;

    const translatedPost = { ...post, _originalLanguage: effectiveSourceLanguage };

    // Translate plainText if present
    if (post.plainText) {
        translatedPost.plainText = await translateForUser({
            entityType: 'Post',
            entityId: post.id,
            fieldName: 'plainText',
            content: post.plainText,
            sourceLanguage: effectiveSourceLanguage,
            targetLanguage: userLanguage,
        });
    }

    // Translate title if present
    if (post.title) {
        translatedPost.title = await translateForUser({
            entityType: 'Post',
            entityId: post.id,
            fieldName: 'title',
            content: post.title,
            sourceLanguage: effectiveSourceLanguage,
            targetLanguage: userLanguage,
        });
    }

    return translatedPost;
}

/**
 * Comment type for translation
 */
export interface TranslatableComment {
    id: string;
    content: string;
    languageCode?: string | null;
    [key: string]: unknown;
}

/**
 * Translate a comment for a user
 *
 * Translates the content field
 * Returns the comment with translated content
 */
export async function translateCommentForUser<T extends TranslatableComment>(
    comment: T,
    userLanguage: string
): Promise<T> {
    const storedLanguage = comment.languageCode || 'en';

    // When stored language matches user language, skip translation entirely.
    // Trust the stored languageCode — see translatePostForUser for rationale.
    if (storedLanguage === userLanguage) {
        return comment;
    }

    const effectiveSourceLanguage = storedLanguage;

    const translatedContent = await translateForUser({
        entityType: 'Comment',
        entityId: comment.id,
        fieldName: 'content',
        content: comment.content,
        sourceLanguage: effectiveSourceLanguage,
        targetLanguage: userLanguage,
    });

    return {
        ...comment,
        content: translatedContent,
    };
}

/**
 * Translate multiple posts in parallel
 */
export async function translatePostsForUser<T extends TranslatablePost>(
    posts: T[],
    userLanguage: string
): Promise<(T & { _originalLanguage?: string })[]> {
    return Promise.all(
        posts.map(post => translatePostForUser(post, userLanguage))
    );
}

/**
 * Translate multiple comments in parallel
 */
export async function translateCommentsForUser<T extends TranslatableComment>(
    comments: T[],
    userLanguage: string
): Promise<T[]> {
    return Promise.all(
        comments.map(comment => translateCommentForUser(comment, userLanguage))
    );
}

/**
 * Translate a single text for preview purposes (not cached in DB)
 * Used by the translation preview modal in the post editor
 */
export async function translateForPreview(
    text: string,
    sourceLang: string,
    targetLang: string,
    categoryName?: string
): Promise<string> {
    if (sourceLang === targetLang || !text.trim()) {
        return text;
    }

    const { allTerms, cleanText, numericalValues } = await collectProtectedTerms(text, categoryName);

    // Replace numerical values with placeholders before translation
    let textToTranslate = cleanText;
    if (numericalValues.length > 0) {
        for (const { placeholder, original } of numericalValues) {
            textToTranslate = textToTranslate.replace(original, placeholder);
        }
    }

    let translated = await translateText(textToTranslate, sourceLang, targetLang, allTerms);

    // Restore numerical values from placeholders
    if (numericalValues.length > 0) {
        translated = restoreNumericalValues(translated, numericalValues);
        validateNumericalIntegrity(text, translated, numericalValues);
    }

    // Track usage but mark as preview (still costs money)
    trackTranslationUsage(text.length, sourceLang, targetLang, false);

    return translated;
}
