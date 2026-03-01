/**
 * Translation Constants - Safe for client-side use
 * 
 * These constants can be imported in both client and server components.
 */

/**
 * Supported language codes (ISO 639-1)
 * Expanded: DE, EN, FR, ES, IT, PT, NL, PL, ZH, JA, KO, AR
 */
export const SUPPORTED_LANGUAGES = [
    'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'zh', 'ja', 'ko', 'ar'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Language names in their native form
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    pt: 'Português',
    nl: 'Nederlands',
    pl: 'Polski',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    ar: 'العربية',
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
