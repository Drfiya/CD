/**
 * Language Code Utilities (Client-Safe)
 *
 * Maps BCP-47 browser locale codes to standard ISO 639-1 codes.
 * DeepL uses uppercase codes with some variants (EN-US, PT-BR).
 *
 * BUILD PHASE: Limited to EN, DE, FR to control translation costs.
 */

// Supported languages with their display names (build phase: EN/DE/FR only)
export const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', nativeName: 'English' },
    'de': { name: 'German', nativeName: 'Deutsch' },
    'fr': { name: 'French', nativeName: 'Français' },
} as const;

/**
 * Convert BCP-47 locale code to DeepL target language code
 * DeepL uses uppercase codes, with EN-US/EN-GB for English targets
 */
export function toDeepLTarget(locale: string): string {
    const normalized = locale.toLowerCase().trim();
    const baseLang = normalized.split('-')[0].toUpperCase();

    // DeepL requires specific variants for some target languages
    switch (baseLang) {
        case 'EN':
            return 'EN-US';
        case 'PT':
            return 'PT-BR';
        default:
            return baseLang;
    }
}

/**
 * Convert DeepL language code back to simple ISO 639-1 code
 */
export function fromDeepLCode(code: string): string {
    return code.split('-')[0].toLowerCase();
}

/**
 * Get the base language code from any locale
 */
export function getBaseLanguage(locale: string): string {
    return locale.toLowerCase().split('-')[0];
}

/**
 * Check if a language is supported by our translation system
 */
export function isLanguageSupported(locale: string): boolean {
    const base = getBaseLanguage(locale);
    return base in SUPPORTED_LANGUAGES;
}

/**
 * Get language display info
 */
export function getLanguageInfo(locale: string) {
    const base = getBaseLanguage(locale);
    return SUPPORTED_LANGUAGES[base as keyof typeof SUPPORTED_LANGUAGES] || null;
}

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;
