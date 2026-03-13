/**
 * Translation Constants - Safe for client-side use
 * 
 * These constants can be imported in both client and server components.
 * 
 * BUILD PHASE: Limited to EN, DE, FR to control translation costs.
 * Expand to full list when ready for all 10+ languages.
 */

/**
 * Supported language codes (ISO 639-1)
 * Build phase: EN, DE, FR only
 */
export const SUPPORTED_LANGUAGES = [
    'en', 'de', 'fr'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Language names in their native form
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
};

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): code is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}

/**
 * Get the native name for a language code
 */
export function getLanguageName(code: string): string {
    if (isSupportedLanguage(code)) {
        return LANGUAGE_NAMES[code];
    }
    return code.toUpperCase();
}

/**
 * Returns a short label for the translation toggle button.
 * - showingOriginal=true  → offer to switch back to translation
 * - showingOriginal=false → offer to show the original
 */
export function getToggleLabel(uiLanguage: string, showingOriginal: boolean): string {
    const labels: Record<string, { original: string; translation: string }> = {
        de: { original: 'Original anzeigen', translation: 'Übersetzung anzeigen' },
        fr: { original: 'Voir l\'original',   translation: 'Voir la traduction' },
        en: { original: 'Show original',      translation: 'Show translation' },
    };
    const lang = isSupportedLanguage(uiLanguage) ? uiLanguage : 'en';
    return showingOriginal ? labels[lang].translation : labels[lang].original;
}
