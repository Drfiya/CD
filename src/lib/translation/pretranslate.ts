/**
 * Eager Pre-Translation on Post Publish
 *
 * When an author creates or updates a post, eagerly translate title + body
 * into the two non-source languages of {DE, EN, FR} and write directly to
 * TranslationCache. The first reader per language then always hits cache.
 *
 * Constraints:
 * - Only posts (not comments, bios, course descriptions).
 * - No backfill of existing posts.
 * - Fire-and-forget — must not block the author's response.
 * - Budget-aware — respects the daily budget kill-switch.
 * - Uses the existing translation pipeline (segmentation, protected terms,
 *   numerical placeholders, 3-tier cache write-through).
 */

import { translateForUser } from './index';
import { checkBudget } from './budget';

const LIVE_LANGUAGES = ['de', 'en', 'fr'] as const;

/**
 * Pre-translate a post's title and body into the non-source live languages.
 *
 * Fire-and-forget: call without awaiting from createPost / updatePost.
 * Errors are logged but never thrown.
 */
export async function preTranslatePost(
    postId: string,
    title: string | null,
    body: string | null,
    sourceLang: string,
): Promise<void> {
    try {
        const targetLangs = LIVE_LANGUAGES.filter((l) => l !== sourceLang);

        for (const targetLang of targetLangs) {
            // Budget check before each language — stop early if over budget
            const budgetResult = await checkBudget();
            if (!budgetResult.allowed) {
                console.info(`[pretranslate] Budget exceeded, skipping ${targetLang} for post ${postId}`);
                return;
            }

            // Translate title (if present)
            if (title && title.trim()) {
                await translateForUser({
                    entityType: 'Post',
                    entityId: postId,
                    fieldName: 'title',
                    content: title,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                });
            }

            // Translate body (if present)
            if (body && body.trim()) {
                await translateForUser({
                    entityType: 'Post',
                    entityId: postId,
                    fieldName: 'plainText',
                    content: body,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                });
            }
        }

        console.info(`[pretranslate] Post ${postId} pre-translated to ${targetLangs.join(', ')}`);
    } catch (error) {
        console.error(`[pretranslate] Failed for post ${postId}:`, error);
    }
}

/**
 * Pre-translate admin-created content (categories, courses) into all live
 * languages so no DeepL call is needed at read-time — even on cold restart.
 *
 * Fire-and-forget: call without awaiting from admin create/update actions.
 * Errors are logged but never thrown.
 *
 * @param entityType  'category' | 'course' (used as cache context key)
 * @param entityId    The row ID
 * @param fields      Record of fieldName → text to translate
 * @param sourceLang  Source language of the admin content (defaults to 'en')
 */
export async function preTranslateAdminContent(
    entityType: string,
    entityId: string,
    fields: Record<string, string | null | undefined>,
    sourceLang: string = 'en',
): Promise<void> {
    try {
        const targetLangs = LIVE_LANGUAGES.filter((l) => l !== sourceLang);

        for (const targetLang of targetLangs) {
            const budgetResult = await checkBudget();
            if (!budgetResult.allowed) {
                console.info(`[pretranslate] Budget exceeded, skipping ${targetLang} for ${entityType} ${entityId}`);
                return;
            }

            for (const [_fieldName, content] of Object.entries(fields)) {
                if (!content || !content.trim()) continue;

                await translateForUser({
                    entityType: 'UI',
                    entityId: entityType,
                    fieldName: content.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
                    content,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                });
            }
        }

        console.info(`[pretranslate] ${entityType} ${entityId} pre-translated to ${targetLangs.join(', ')}`);
    } catch (error) {
        console.error(`[pretranslate] Failed for ${entityType} ${entityId}:`, error);
    }
}
