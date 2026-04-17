/**
 * Core Translation API
 *
 * High-level translation functions that integrate caching, detection,
 * protected terms, and the DeepL provider.
 */

import { getCachedTranslationWithHash, setCachedTranslation, getCachedTranslation3Tier, setCachedTranslation3Tier } from './cache';
import { translateText, translateBatch, type TranslateOptions } from './providers/deepl';
import { hashContent } from './utils';
import { collectProtectedTerms, restoreNumericalValues, validateNumericalIntegrity } from './protected-terms';
import { trackTranslationUsage } from './usage';
import { assessTranslationConfidence, getLanguagePairQuality, type ConfidenceResult } from './quality';
import { segmentContent } from './segmenter';
import { checkBudget, activateKillSwitch } from './budget';

// Below this threshold we skip segmentation — the overhead outweighs the
// benefit and Tier 1+2 work perfectly well on short strings (titles,
// single-sentence comments).
const SEGMENT_THRESHOLD_CHARS = 240;

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
    // Whole-content cache is cheap and gives a fast path for re-reads of
    // unchanged posts. On a miss we fall through to segmentation so that
    // edits to one paragraph do not force retranslation of the whole post.
    const tier3Result = await getCachedTranslation3Tier(
        content,
        sourceLanguage,
        targetLanguage,
        glossaryId
    );
    if (tier3Result) {
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true, tier3Result.tier === 'memory' ? 'lru' : 'db');
        return tier3Result.text;
    }

    // ── Segment-level cache for long content ──────────────────────────────
    // Small edits to a large post should only retranslate the changed
    // segment. Whole-content cache above acts as an O(1) fast path; when it
    // misses we split into segments and consult the cache per-segment.
    if (content.length >= SEGMENT_THRESHOLD_CHARS) {
        const segmented = await translateSegmented({
            content,
            sourceLanguage,
            targetLanguage,
            categoryName,
            context,
            formality,
            glossaryId,
        });

        // NF1 guard (Examiner R9): when the budget kill-switch is active,
        // `translateSegmented` falls back to the original text for every
        // miss-segment and can return the input unchanged. Writing that
        // identity mapping into Tier 1/2 or the entity cache would persist
        // "original-as-translation" with no TTL — permanently poisoning
        // future reads for this post until manual invalidation. Skip both
        // writes when nothing actually translated.
        if (segmented !== content) {
            // Persist whole-content result so the next identical read is a
            // Tier-1 hit (cheaper than re-scanning segments).
            setCachedTranslation3Tier(
                content,
                sourceLanguage,
                targetLanguage,
                segmented,
                glossaryId,
            ).catch(() => { /* non-fatal */ });

            // Entity-cache write so existing consumers keep working.
            setCachedTranslation({
                entityType,
                entityId,
                fieldName,
                sourceLanguage,
                sourceHash: contentHashValue,
                targetLanguage,
                translatedContent: segmented,
                modelProvider: MODEL_PROVIDER,
                modelVersion: MODEL_VERSION,
            });
        }

        return segmented;
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
        trackTranslationUsage(content.length, sourceLanguage, targetLanguage, true, 'db');
        // Promote into 3-tier cache for faster future lookups — but skip
        // identity mappings defensively so a poisoned entity-cache row can't
        // propagate into the hash cache (NF1 audit R11: uniform guard).
        if (entityCached !== content) {
            setCachedTranslation3Tier(content, sourceLanguage, targetLanguage, entityCached, glossaryId);
        }
        return entityCached;
    }

    // ── Budget gate (spend boundary) ──
    // Gate at the spend boundary so every caller — routes, server pages,
    // pre-translate, future callers — is bound by the same kill-switch.
    // Routes keep their own gate as defense-in-depth.
    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
        if (!budgetCheck.killSwitchActive) activateKillSwitch();
        return content;
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
    trackTranslationUsage(content.length, sourceLanguage, targetLanguage, false, 'miss');

    // NF1 guard (Examiner R11): `translateText` can degrade to returning the
    // input unchanged on provider 5xx/429 fallbacks or when the budget kill-
    // switch trips mid-flight. Writing an identity mapping into Tier 1/2 or
    // the entity cache would permanently poison future reads — same failure
    // mode R10 closed for the segmented path, now enforced here. Every
    // setCachedX site in this module carries this guard (audit R11).
    if (translated !== content) {
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
    }

    return translated;
}

interface SegmentedTranslateParams {
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
 *
 * Protected terms and numerical placeholders are applied per-segment to
 * preserve the quality guarantees from the single-shot path.
 */
async function translateSegmented(params: SegmentedTranslateParams): Promise<string> {
    const {
        content,
        sourceLanguage,
        targetLanguage,
        categoryName,
        context,
        formality,
        glossaryId,
    } = params;

    const segments = segmentContent(content);
    if (segments.length === 0) return content;

    const translatedParts: string[] = new Array(segments.length);
    const missIndices: number[] = [];
    const missPayloads: Array<{
        index: number;
        cleanText: string;
        allTerms: string[];
        numericalValues: Array<{ placeholder: string; original: string }>;
        original: string;
    }> = [];

    // --- Cache lookup phase ------------------------------------------------
    await Promise.all(segments.map(async (seg, i) => {
        if (seg.skip) {
            translatedParts[i] = seg.text;
            return;
        }
        const hit = await getCachedTranslation3Tier(
            seg.text,
            sourceLanguage,
            targetLanguage,
            glossaryId,
        );
        if (hit) {
            translatedParts[i] = hit.text;
            trackTranslationUsage(seg.text.length, sourceLanguage, targetLanguage, true, hit.tier === 'memory' ? 'lru' : 'db');
            return;
        }

        // Apply protected terms + numerical placeholders per-segment so the
        // DeepL call preserves the same safety net as the whole-content path.
        const { allTerms, cleanText, numericalValues } =
            await collectProtectedTerms(seg.text, categoryName);
        let textToSend = cleanText;
        for (const { placeholder, original } of numericalValues) {
            textToSend = textToSend.replace(original, placeholder);
        }
        missIndices.push(i);
        missPayloads.push({
            index: i,
            cleanText: textToSend,
            allTerms,
            numericalValues,
            original: seg.text,
        });
    }));

    // --- Translate misses in a single batch --------------------------------
    // One translateBatch call (N segments → 1 HTTP request) respects DeepL's
    // concurrency limits and preserves the <keep>-tag protection for
    // protected terms via translateBatch's protectedTerms option. Previously
    // we fanned out per-segment Promise.all — a 50-post cold feed multiplied
    // concurrent DeepL requests by the average segment count and exceeded
    // the plan's concurrency ceiling, degrading to the "return original"
    // fallback silently. Fixed in Round 1 of the revision cycle.
    if (missPayloads.length > 0) {
        // ── Budget gate (spend boundary) ──
        // Check once per segmented call — the batch is a single DeepL spend
        // event. On kill-switch, fall back to original segment text for each
        // miss so the rendered output still reconstructs (cached hits remain).
        const budgetCheck = await checkBudget();
        if (!budgetCheck.allowed) {
            if (!budgetCheck.killSwitchActive) activateKillSwitch();
            for (const p of missPayloads) {
                translatedParts[p.index] = p.original;
            }
            return translatedParts.join('');
        }

        const baseOptions: TranslateOptions = { tagHandling: 'html' };
        if (context) baseOptions.context = context;
        if (formality) baseOptions.formality = formality;
        if (glossaryId) baseOptions.glossaryId = glossaryId;

        const mergedTerms = Array.from(
            new Set(missPayloads.flatMap((p) => p.allTerms))
        );
        baseOptions.protectedTerms = mergedTerms;

        const translations = await translateBatch(
            missPayloads.map((p) => p.cleanText),
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
                setCachedTranslation3Tier(
                    p.original,
                    sourceLanguage,
                    targetLanguage,
                    translated,
                    glossaryId,
                ).catch(() => { /* non-fatal */ });
            }
        });
    }

    return translatedParts.join('');
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
 * Translate a single text for preview purposes.
 *
 * Previously this bypassed every cache tier, which meant every editor click
 * charged DeepL. It now shares the 3-tier hash-only cache with the
 * production path — the author's preview does not bind to an entity, so the
 * entity-level Translation table is still skipped, but in-memory + Postgres
 * caches are consulted and populated. A second preview of the same draft
 * never hits DeepL.
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

    // 3-tier cache lookup first — hash-only, no entity binding.
    const cached = await getCachedTranslation3Tier(text, sourceLang, targetLang);
    if (cached) {
        trackTranslationUsage(text.length, sourceLang, targetLang, true, cached.tier === 'memory' ? 'lru' : 'db');
        return cached.text;
    }

    // ── Budget gate (spend boundary) ──
    // Same contract as translateForUser — gate before the paid call so the
    // kill-switch holds for every preview caller, not just the API route.
    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
        if (!budgetCheck.killSwitchActive) activateKillSwitch();
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

    // Track usage (this was a real API call)
    trackTranslationUsage(text.length, sourceLang, targetLang, false, 'miss');

    // Persist so the next preview of the same text is free.
    if (translated !== text) {
        setCachedTranslation3Tier(text, sourceLang, targetLang, translated).catch(() => {
            /* non-fatal */
        });
    }

    return translated;
}
