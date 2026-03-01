/**
 * Core Translation API
 *
 * High-level translation functions that integrate caching, detection,
 * protected terms, and the Azure Translator provider.
 */

import { getCachedTranslationWithHash, setCachedTranslation } from './cache';
import { translateText } from './providers/azure';
import { detectLanguage } from './detect';
import { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from './utils';
import { collectProtectedTerms } from './protected-terms';
import { trackTranslationUsage } from './usage';

// Re-export utilities for convenience
export { detectLanguage } from './detect';
export { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage } from './utils';
export type { SupportedLanguage } from './utils';

const MODEL_PROVIDER = 'azure';
const MODEL_VERSION = 'v3.0';

export interface TranslateForUserParams {
    entityType: string;
    entityId: string;
    fieldName: string;
    content: string;
    sourceLanguage: string;
    targetLanguage: string;
    categoryName?: string;
}

/**
 * Translate content for a user
 *
 * - Returns original if source and target languages match
 * - Checks cache first
 * - Falls back to Azure Translator API on cache miss
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

    // Check cache first
    const cached = await getCachedTranslationWithHash(
        entityType,
        entityId,
        fieldName,
        targetLanguage,
        contentHashValue
    );

    if (cached) {
        // Track cache hit
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true);
        return cached;
    }

    // Collect protected terms (global + domain + user-defined)
    const { allTerms, cleanText } = collectProtectedTerms(content, categoryName);

    // Translate via Azure with protected terms
    const translated = await translateText(cleanText, sourceLanguage, targetLanguage, allTerms);

    // Track API call usage
    trackTranslationUsage(content.length, sourceLanguage, targetLanguage, false);

    // Cache the result (don't await - fire and forget)
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

    return translated;
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

    // When stored language matches user language, verify via auto-detection.
    // This catches posts whose language was misdetected (e.g. API was
    // unavailable at creation time, so the fallback 'en' was stored).
    let effectiveSourceLanguage = storedLanguage;
    if (storedLanguage === userLanguage && post.plainText) {
        const detected = await detectLanguage(post.plainText);
        if (detected !== userLanguage) {
            effectiveSourceLanguage = detected;
        } else {
            return { ...post, _originalLanguage: storedLanguage };
        }
    }

    // No translation needed if languages truly match
    if (effectiveSourceLanguage === userLanguage) {
        return { ...post, _originalLanguage: effectiveSourceLanguage };
    }

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

    // Verify via auto-detection when stored language matches user language
    let effectiveSourceLanguage = storedLanguage;
    if (storedLanguage === userLanguage && comment.content) {
        const detected = await detectLanguage(comment.content);
        if (detected !== userLanguage) {
            effectiveSourceLanguage = detected;
        } else {
            return comment; // Genuinely the same language
        }
    }

    if (effectiveSourceLanguage === userLanguage) {
        return comment;
    }

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

    const { allTerms, cleanText } = collectProtectedTerms(text, categoryName);
    const translated = await translateText(cleanText, sourceLang, targetLang, allTerms);

    // Track usage but mark as preview (still costs money)
    trackTranslationUsage(text.length, sourceLang, targetLang, false);

    return translated;
}
