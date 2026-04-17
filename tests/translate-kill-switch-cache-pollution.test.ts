/**
 * NF1 regression test (Examiner R9 → Revision R10)
 *
 * When the budget kill-switch is active, `translateForUser`'s segmented
 * branch must NOT persist the kill-switch fallback (original content
 * re-emitted as a "translation") into either the 3-tier cache or the entity
 * cache. Doing so would poison future reads with a permanent no-op mapping
 * (default `expiresAt = null` in `setCachedTranslation3Tier`), silently
 * degrading translation quality for every long post whose segmented call
 * landed while the kill-switch was on.
 *
 * This test enforces the "did anything actually translate?" invariant that
 * the Examiner mandated: both cache writes are gated on
 * `segmented !== content` so the all-miss kill-switch fallback never writes
 * a row. It also verifies that after the kill-switch is deactivated, the
 * next call actually invokes DeepL — i.e., the cache was not poisoned.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted state + spies
// ---------------------------------------------------------------------------
// `vi.mock` calls are hoisted to the top of the module, so mutable state they
// reference must come from `vi.hoisted` to be defined at hoist-time.

const state = vi.hoisted(() => ({ killSwitchActive: true }));

const spies = vi.hoisted(() => ({
    setCachedTranslation3Tier: vi.fn(async () => undefined),
    setCachedTranslation: vi.fn(async () => undefined),
    translateText: vi.fn(async (t: string) => `TRANSLATED:${t}`),
    translateBatch: vi.fn(async (texts: string[]) => texts.map((t) => `TRANSLATED:${t}`)),
    activateKillSwitch: vi.fn(async () => undefined),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
// We mock every dependency of `translateForUser` that touches the DB, the
// provider, or the budget system. The pure modules (`segmenter`, `utils`)
// run with their real behavior so segmentation and hashing remain
// representative.

vi.mock('@/lib/db', () => ({ default: {} }));

vi.mock('@/lib/translation/budget', () => ({
    checkBudget: vi.fn(async () => ({
        allowed: !state.killSwitchActive,
        used: 0,
        budget: 1_000_000,
        killSwitchActive: state.killSwitchActive,
    })),
    activateKillSwitch: spies.activateKillSwitch,
}));

vi.mock('@/lib/translation/cache', () => ({
    getCachedTranslation3Tier: vi.fn(async () => undefined),
    getCachedTranslationWithHash: vi.fn(async () => null),
    setCachedTranslation3Tier: spies.setCachedTranslation3Tier,
    setCachedTranslation: spies.setCachedTranslation,
    invalidateTranslationCache: vi.fn(),
    getCacheStats: vi.fn(),
}));

vi.mock('@/lib/translation/providers/deepl', () => ({
    translateText: spies.translateText,
    translateBatch: spies.translateBatch,
}));

vi.mock('@/lib/translation/protected-terms', () => ({
    collectProtectedTerms: vi.fn(async (text: string) => ({
        allTerms: [],
        cleanText: text,
        numericalValues: [],
    })),
    restoreNumericalValues: vi.fn((t: string) => t),
    validateNumericalIntegrity: vi.fn(),
}));

vi.mock('@/lib/translation/usage', () => ({
    trackTranslationUsage: vi.fn(),
}));

vi.mock('@/lib/translation/quality', () => ({
    assessTranslationConfidence: vi.fn(),
    getLanguagePairQuality: vi.fn(async () => ({ quality: 'high' })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NF1 — kill-switch cache pollution guard (translateForUser segmented branch)', () => {
    // Long German content (>= 240 chars) forces the segmented branch. Each
    // sentence is a segment; every segment misses the cache.
    const longMissOnlyPost = 'Das ist der erste Satz der Forschung. '.repeat(20); // ~760 chars

    beforeEach(() => {
        spies.setCachedTranslation3Tier.mockClear();
        spies.setCachedTranslation.mockClear();
        spies.translateText.mockClear();
        spies.translateBatch.mockClear();
        spies.activateKillSwitch.mockClear();
    });

    it('does NOT write to 3-tier cache or entity cache when kill-switch returns originals', async () => {
        state.killSwitchActive = true;

        const { translateForUser } = await import('@/lib/translation');

        const result = await translateForUser({
            entityType: 'Post',
            entityId: 'nf1-post-id',
            fieldName: 'content',
            content: longMissOnlyPost,
            sourceLanguage: 'de',
            targetLanguage: 'en',
        });

        // Kill-switch fires → translateSegmented returns the input unchanged
        expect(result).toBe(longMissOnlyPost);

        // DeepL must not be called (budget gate blocked the batch)
        expect(spies.translateBatch).not.toHaveBeenCalled();
        expect(spies.translateText).not.toHaveBeenCalled();

        // Neither cache layer may be poisoned with the identity fallback
        expect(spies.setCachedTranslation3Tier).not.toHaveBeenCalled();
        expect(spies.setCachedTranslation).not.toHaveBeenCalled();
    });

    it('invokes DeepL and writes to caches on the next call after the kill-switch is deactivated', async () => {
        state.killSwitchActive = false;

        const { translateForUser } = await import('@/lib/translation');

        const result = await translateForUser({
            entityType: 'Post',
            entityId: 'nf1-post-id',
            fieldName: 'content',
            content: longMissOnlyPost,
            sourceLanguage: 'de',
            targetLanguage: 'en',
        });

        // DeepL was invoked — confirms the previous kill-switch round did
        // NOT poison the cache with the identity mapping (otherwise this
        // call would short-circuit at tier 1).
        expect(spies.translateBatch).toHaveBeenCalled();

        // With a real translation returned, the guard allows the whole-content
        // and entity-cache writes through.
        expect(spies.setCachedTranslation3Tier).toHaveBeenCalled();
        expect(spies.setCachedTranslation).toHaveBeenCalled();

        // Sanity: the returned text reflects the stub translation, not the input
        expect(result).not.toBe(longMissOnlyPost);
        expect(result).toContain('TRANSLATED:');
    });
});

describe('NF1 — kill-switch cache pollution guard (translateForUser short-content branch)', () => {
    // Short content (< 240 chars) takes the single-shot DeepL path — the
    // sibling branch that Revision R10 missed. Probe R11 demands the same
    // NF1 invariant on every setCachedX site in the function.
    const shortPost = 'Ein kurzer Satz über die Wissenschaft.'; // ~38 chars

    beforeEach(() => {
        spies.setCachedTranslation3Tier.mockClear();
        spies.setCachedTranslation.mockClear();
        spies.translateText.mockClear();
        spies.translateBatch.mockClear();
        spies.activateKillSwitch.mockClear();
    });

    it('does NOT write to caches when translateText degrades to identity on the short-content path', async () => {
        state.killSwitchActive = false;
        // Provider echo — simulates 5xx/429 fallback where translateText
        // returns the input unchanged. Same failure mode as the kill-switch
        // for the segmented branch.
        spies.translateText.mockImplementationOnce(async (t: string) => t);

        const { translateForUser } = await import('@/lib/translation');

        const result = await translateForUser({
            entityType: 'Post',
            entityId: 'nf1-short-id',
            fieldName: 'title',
            content: shortPost,
            sourceLanguage: 'de',
            targetLanguage: 'en',
        });

        // Provider echoed input → result === input
        expect(result).toBe(shortPost);

        // DeepL was called exactly once (short-content single-shot)
        expect(spies.translateText).toHaveBeenCalledTimes(1);
        expect(spies.translateBatch).not.toHaveBeenCalled();

        // Neither cache layer may be written with the identity mapping
        expect(spies.setCachedTranslation3Tier).not.toHaveBeenCalled();
        expect(spies.setCachedTranslation).not.toHaveBeenCalled();
    });

    it('writes to both caches when the short-content path returns a real translation', async () => {
        state.killSwitchActive = false;

        const { translateForUser } = await import('@/lib/translation');

        const result = await translateForUser({
            entityType: 'Post',
            entityId: 'nf1-short-id',
            fieldName: 'title',
            content: shortPost,
            sourceLanguage: 'de',
            targetLanguage: 'en',
        });

        // Real translation returned
        expect(result).toBe(`TRANSLATED:${shortPost}`);

        // Both cache layers written — guard allows non-identity through
        expect(spies.setCachedTranslation3Tier).toHaveBeenCalledTimes(1);
        expect(spies.setCachedTranslation).toHaveBeenCalledTimes(1);
    });
});
