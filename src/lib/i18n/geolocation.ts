import { availableLocales } from './index';

// Re-export for convenience
export { availableLocales };

/**
 * IP Geolocation Language Detection
 * 
 * Maps country codes to supported UI languages based on geographic location.
 */

/**
 * Country code to language mapping
 * Uses ISO 3166-1 alpha-2 country codes
 */
const countryToLanguage: Record<string, string> = {
    // German-speaking countries
    'DE': 'de', // Germany
    'AT': 'de', // Austria
    'CH': 'de', // Switzerland (primarily German)
    'LI': 'de', // Liechtenstein

    // Spanish-speaking countries
    'ES': 'es', // Spain
    'MX': 'es', // Mexico
    'AR': 'es', // Argentina
    'CO': 'es', // Colombia
    'PE': 'es', // Peru
    'VE': 'es', // Venezuela
    'CL': 'es', // Chile
    'EC': 'es', // Ecuador
    'GT': 'es', // Guatemala
    'CU': 'es', // Cuba
    'BO': 'es', // Bolivia
    'DO': 'es', // Dominican Republic
    'HN': 'es', // Honduras
    'PY': 'es', // Paraguay
    'SV': 'es', // El Salvador
    'NI': 'es', // Nicaragua
    'CR': 'es', // Costa Rica
    'PA': 'es', // Panama
    'UY': 'es', // Uruguay
    'PR': 'es', // Puerto Rico

    // French-speaking countries
    'FR': 'fr', // France
    'BE': 'fr', // Belgium (primarily French in Wallonia)
    'LU': 'fr', // Luxembourg
    'MC': 'fr', // Monaco
    'SN': 'fr', // Senegal
    'CI': 'fr', // Ivory Coast
    'ML': 'fr', // Mali
    'BF': 'fr', // Burkina Faso
    'NE': 'fr', // Niger
    'TG': 'fr', // Togo
    'BJ': 'fr', // Benin
    'GA': 'fr', // Gabon
    'CG': 'fr', // Congo
    'CD': 'fr', // DR Congo
    'MG': 'fr', // Madagascar
    'CM': 'fr', // Cameroon
    'HT': 'fr', // Haiti

    // English-speaking countries (explicit, but also default)
    'US': 'en',
    'GB': 'en',
    'CA': 'en', // Canada (bilingual, defaulting to English)
    'AU': 'en',
    'NZ': 'en',
    'IE': 'en',
    'ZA': 'en',
};

/**
 * Get language code from country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'DE', 'US')
 * @returns Supported language code or 'en' as fallback
 */
export function getLanguageFromCountry(countryCode: string | null | undefined): string {
    if (!countryCode) return 'en';

    const normalizedCode = countryCode.toUpperCase().trim();
    const language = countryToLanguage[normalizedCode];

    // Only return if we support this language
    if (language && availableLocales.includes(language)) {
        return language;
    }

    return 'en';
}

/**
 * Get language from Accept-Language header
 * @param acceptLanguage - Accept-Language header value (e.g., 'de-DE,de;q=0.9,en;q=0.8')
 * @returns Best matching supported language or 'en' as fallback
 */
export function getLanguageFromAcceptHeader(acceptLanguage: string | null | undefined): string {
    if (!acceptLanguage) return 'en';

    // Parse Accept-Language header
    const languages = acceptLanguage
        .split(',')
        .map(lang => {
            const [code, qValue] = lang.trim().split(';q=');
            return {
                code: code.toLowerCase().split('-')[0], // Get base language code
                quality: qValue ? parseFloat(qValue) : 1.0,
            };
        })
        .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
        if (availableLocales.includes(lang.code)) {
            return lang.code;
        }
    }

    return 'en';
}
/**
 * European countries that should see EUR pricing.
 * Includes EU countries + EEA + Switzerland.
 */
const europeanCountries = new Set([
    'DE', 'AT', 'CH', 'LI', 'FR', 'BE', 'LU', 'MC', 'NL',
    'IT', 'ES', 'PT', 'GR', 'IE', 'FI', 'SE', 'DK', 'NO',
    'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE',
    'LV', 'LT', 'MT', 'CY', 'IS',
]);

/**
 * Check if a country should see EUR pricing.
 * @param countryCode - ISO 3166-1 alpha-2 country code
 */
export function isEuropeanCountry(countryCode: string | null | undefined): boolean {
    if (!countryCode) return false;
    return europeanCountries.has(countryCode.toUpperCase().trim());
}

/**
 * Cookie name for storing language preference
 */
export const LANGUAGE_COOKIE_NAME = 'preferred-language';
