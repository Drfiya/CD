/**
 * Core Translation API
 * 
 * High-level translation functions that integrate caching, detection, and the DeepL provider.
 */

import { getCachedTranslationWithHash, setCachedTranslation } from './cache';
import { translateText } from './providers/deepl';
import { detectLanguage } from './detect';
import { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage } from './utils';

// Re-export utilities for convenience
export { detectLanguage } from './detect';
export { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage } from './utils';
export type { SupportedLanguage } from './utils';

const MODEL_PROVIDER = 'deepl';
const MODEL_VERSION = 'v2';

export interface TranslateForUserParams {
    entityType: string;
    entityId: string;
    fieldName: string;
    content: string;
    sourceLanguage: string;
    targetLanguage: string;
}

/**
 * Translate content for a user
 * 
 * - Returns original if source and target languages match
 * - Checks cache first
 * - Falls back to DeepL API on cache miss
 * - Stores result in cache
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
        return cached;
    }

    // Translate via DeepL
    const translated = await translateText(content, sourceLanguage, targetLanguage);

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
 * Translates plainText and title fields if they exist
 * Returns the post with translated content
 */
export async function translatePostForUser<T extends TranslatablePost>(
    post: T,
    userLanguage: string
): Promise<T> {
    const storedLanguage = post.languageCode || 'en';

    // When stored language matches user language, verify via auto-detection.
    // This catches posts whose language was misdetected (e.g. DeepL was
    // unavailable at creation time, so the fallback 'en' was stored).
    let effectiveSourceLanguage = storedLanguage;
    if (storedLanguage === userLanguage && post.plainText) {
        const detected = await detectLanguage(post.plainText);
        if (detected !== userLanguage) {
            effectiveSourceLanguage = detected;
        } else {
            return post; // Genuinely the same language
        }
    }

    // No translation needed if languages truly match
    if (effectiveSourceLanguage === userLanguage) {
        return post;
    }

    const translatedPost = { ...post };

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
): Promise<T[]> {
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
