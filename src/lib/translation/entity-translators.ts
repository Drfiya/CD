/**
 * Entity-level translation helpers.
 *
 * Translates structured domain objects (Post, Comment) using translateForUser
 * from the core index. Collection helpers (plural) are co-located here for
 * convenience — they are thin wrappers over Promise.all.
 */

import { translateForUser } from './core';

export interface TranslatablePost {
    id: string;
    plainText?: string | null;
    title?: string | null;
    languageCode?: string | null;
    [key: string]: unknown;
}

export interface TranslatableComment {
    id: string;
    content: string;
    languageCode?: string | null;
    [key: string]: unknown;
}

/**
 * Translate a post's plainText and title fields for a target user language.
 *
 * Trusts the stored languageCode — auto-detection was causing false positives
 * for scientific texts with mixed-language terminology (e.g. German posts with
 * English gene symbols, ICD codes).
 */
export async function translatePostForUser<T extends TranslatablePost>(
    post: T,
    userLanguage: string,
): Promise<T & { _originalLanguage?: string }> {
    const storedLanguage = post.languageCode || 'en';
    if (storedLanguage === userLanguage) {
        return { ...post, _originalLanguage: storedLanguage };
    }

    const translatedPost = { ...post, _originalLanguage: storedLanguage };

    if (post.plainText) {
        translatedPost.plainText = await translateForUser({
            entityType: 'Post', entityId: post.id, fieldName: 'plainText',
            content: post.plainText, sourceLanguage: storedLanguage, targetLanguage: userLanguage,
        });
    }

    if (post.title) {
        translatedPost.title = await translateForUser({
            entityType: 'Post', entityId: post.id, fieldName: 'title',
            content: post.title, sourceLanguage: storedLanguage, targetLanguage: userLanguage,
        });
    }

    return translatedPost;
}

/**
 * Translate a comment's content field for a target user language.
 */
export async function translateCommentForUser<T extends TranslatableComment>(
    comment: T,
    userLanguage: string,
): Promise<T> {
    const storedLanguage = comment.languageCode || 'en';
    if (storedLanguage === userLanguage) return comment;

    const translatedContent = await translateForUser({
        entityType: 'Comment', entityId: comment.id, fieldName: 'content',
        content: comment.content, sourceLanguage: storedLanguage, targetLanguage: userLanguage,
    });

    return { ...comment, content: translatedContent };
}

/** Translate multiple posts in parallel. */
export async function translatePostsForUser<T extends TranslatablePost>(
    posts: T[],
    userLanguage: string,
): Promise<(T & { _originalLanguage?: string })[]> {
    return Promise.all(posts.map(post => translatePostForUser(post, userLanguage)));
}

/** Translate multiple comments in parallel. */
export async function translateCommentsForUser<T extends TranslatableComment>(
    comments: T[],
    userLanguage: string,
): Promise<T[]> {
    return Promise.all(comments.map(comment => translateCommentForUser(comment, userLanguage)));
}
