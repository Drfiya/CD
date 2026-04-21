/**
 * Translation module — public API
 *
 * This file is a pure re-export hub. All implementation lives in sub-modules:
 *   core.ts             — translateForUser (main entry point)
 *   segmented-translator.ts — segment-level batch translation
 *   entity-translators.ts   — Post/Comment helpers + collections
 *   preview-translator.ts   — editor preview (no entity binding)
 *   confidence-translator.ts — quality assessment wrapper
 */

// Core
export { translateForUser } from './core';
export type { TranslateForUserParams } from './core';

// Entity-level helpers (backward-compatible re-exports)
export type { TranslatablePost, TranslatableComment } from './entity-translators';
export {
    translatePostForUser,
    translateCommentForUser,
    translatePostsForUser,
    translateCommentsForUser,
} from './entity-translators';

// Preview & confidence
export { translateForPreview } from './preview-translator';
export { translateForUserWithConfidence } from './confidence-translator';
export type { ConfidenceResult } from './confidence-translator';

// Shared utilities (backward-compatible re-exports)
export { detectLanguage } from './detect';
export { hashContent, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage } from './utils';
export type { SupportedLanguage } from './utils';
export { assessTranslationConfidence } from './quality';
export { getCachedTranslation3Tier, setCachedTranslation3Tier, invalidateTranslationCache, getCacheStats } from './cache';
