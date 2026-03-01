/**
 * Language Code Utilities (Client-Safe)
 *
 * Maps BCP-47 browser locale codes to standard ISO 639-1 codes.
 * Azure Translator uses standard codes, so mapping is simpler than DeepL.
 */

// Supported languages with their display names
export const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', nativeName: 'English' },
    'de': { name: 'German', nativeName: 'Deutsch' },
    'fr': { name: 'French', nativeName: 'Français' },
    'es': { name: 'Spanish', nativeName: 'Español' },
    'it': { name: 'Italian', nativeName: 'Italiano' },
    'pt': { name: 'Portuguese', nativeName: 'Português' },
    'nl': { name: 'Dutch', nativeName: 'Nederlands' },
    'pl': { name: 'Polish', nativeName: 'Polski' },
    'ja': { name: 'Japanese', nativeName: '日本語' },
    'ko': { name: 'Korean', nativeName: '한국어' },
    'zh': { name: 'Chinese', nativeName: '中文' },
    'ar': { name: 'Arabic', nativeName: 'العربية' },
    'ru': { name: 'Russian', nativeName: 'Русский' },
    'bg': { name: 'Bulgarian', nativeName: 'Български' },
    'cs': { name: 'Czech', nativeName: 'Čeština' },
    'da': { name: 'Danish', nativeName: 'Dansk' },
    'el': { name: 'Greek', nativeName: 'Ελληνικά' },
    'et': { name: 'Estonian', nativeName: 'Eesti' },
    'fi': { name: 'Finnish', nativeName: 'Suomi' },
    'hu': { name: 'Hungarian', nativeName: 'Magyar' },
    'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    'lt': { name: 'Lithuanian', nativeName: 'Lietuvių' },
    'lv': { name: 'Latvian', nativeName: 'Latviešu' },
    'nb': { name: 'Norwegian', nativeName: 'Norsk' },
    'ro': { name: 'Romanian', nativeName: 'Română' },
    'sk': { name: 'Slovak', nativeName: 'Slovenčina' },
    'sl': { name: 'Slovenian', nativeName: 'Slovenščina' },
    'sv': { name: 'Swedish', nativeName: 'Svenska' },
    'tr': { name: 'Turkish', nativeName: 'Türkçe' },
    'uk': { name: 'Ukrainian', nativeName: 'Українська' },
} as const;

/**
 * Convert BCP-47 locale code to target language code for the API
 * Azure uses standard ISO 639-1 codes (much simpler than DeepL)
 */
export function toDeepLTarget(locale: string): string {
    // Keep this function name for backwards compatibility with cache-client.ts
    const normalized = locale.toLowerCase().trim();
    const baseLang = normalized.split('-')[0];
    return baseLang;
}

/**
 * Convert language code back to simple ISO 639-1 code
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
