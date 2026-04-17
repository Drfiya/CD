/**
 * Language Detection Module
 *
 * Local heuristic detector for the three live platform languages
 * (German, English, French). Previously this function spent a paid DeepL
 * API call just to identify the source language — that cost is now gone.
 *
 * Detection strategy:
 *   1. Characteristic character signals (diacritics unique or strongly
 *      weighted to a single language).
 *   2. High-frequency stopword matches scored against a per-language list.
 *
 * Accuracy target: ≥ 98 % on texts with ≥ 15 words. For very short
 * fragments (e.g. single-word titles) the detector falls back to "en"
 * which matches the platform default language code.
 */

const SAMPLE_CHARS = 600;

// Common stopwords per language. Chosen to be disjoint enough that the
// weighted vote is unambiguous on typical prose. Kept small on purpose —
// this file is imported in the server bundle.
const STOPWORDS: Record<'de' | 'en' | 'fr', readonly string[]> = {
    de: [
        'der', 'die', 'das', 'und', 'ist', 'nicht', 'ich', 'sie', 'mit',
        'auf', 'dem', 'den', 'für', 'von', 'ein', 'eine', 'auch', 'zu',
        'sich', 'im', 'aber', 'sind', 'wird', 'wenn', 'sein', 'nach',
    ],
    en: [
        'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this',
        'but', 'his', 'from', 'they', 'she', 'will', 'would', 'there',
        'their', 'what', 'about', 'which', 'when', 'make', 'like', 'just',
    ],
    fr: [
        'le', 'la', 'les', 'de', 'des', 'du', 'et', 'que', 'qui', 'une',
        'est', 'dans', 'pour', 'pas', 'sur', 'avec', 'son', 'sa', 'ses',
        'nous', 'vous', 'mais', 'aussi', 'être', 'plus', 'cette',
    ],
};

// Diacritic signals. Each hit adds a strong weight to the associated
// language. We keep these conservative — e.g. 'ç' is treated as FR-only
// even though it appears in loan-words, because DE/EN loan-words are rare
// in UGC on the platform.
const DIACRITIC_SIGNALS: Array<{ re: RegExp; lang: 'de' | 'fr'; weight: number }> = [
    { re: /[äöüß]/gi, lang: 'de', weight: 3 },
    { re: /[çàâêëîïôùûœ]/gi, lang: 'fr', weight: 3 },
];

function scoreLanguage(text: string, lang: 'de' | 'en' | 'fr'): number {
    let score = 0;
    const words = text.match(/\p{L}+/gu) ?? [];
    const set = new Set(STOPWORDS[lang]);
    for (const w of words) {
        if (set.has(w)) score += 1;
    }
    return score;
}

/**
 * Detect the language of the given text.
 *
 * Returns a lowercase ISO 639-1 code. Supported outputs: 'de', 'en', 'fr'.
 * Falls back to 'en' on empty input or when no signal dominates.
 */
export async function detectLanguage(text: string): Promise<string> {
    return detectLanguageSync(text);
}

/**
 * Synchronous variant — exposed for callers that already run inside a
 * hot path and do not want an async hop. Kept as the implementation so
 * `detectLanguage()` stays free of IO.
 */
export function detectLanguageSync(text: string): string {
    if (!text || !text.trim()) return 'en';

    const sample = text.slice(0, SAMPLE_CHARS).toLowerCase();

    // Start with a stopword score per language.
    const scores: Record<'de' | 'en' | 'fr', number> = {
        de: scoreLanguage(sample, 'de'),
        en: scoreLanguage(sample, 'en'),
        fr: scoreLanguage(sample, 'fr'),
    };

    // Diacritic boost. These are near-deterministic signals for non-EN.
    for (const sig of DIACRITIC_SIGNALS) {
        const matches = sample.match(sig.re);
        if (matches) {
            scores[sig.lang] += matches.length * sig.weight;
        }
    }

    // Pick the highest-scoring language; ties favour English (platform
    // default) — a deterministic fallback is better than a coin-flip.
    let best: 'de' | 'en' | 'fr' = 'en';
    let bestScore = scores.en;
    if (scores.de > bestScore) { best = 'de'; bestScore = scores.de; }
    if (scores.fr > bestScore) { best = 'fr'; bestScore = scores.fr; }

    // If we have no signal at all, return the default rather than guessing.
    if (bestScore === 0) return 'en';

    return best;
}
