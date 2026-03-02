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
