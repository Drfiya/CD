/**
 * Azure AI Translator Provider
 *
 * Uses Azure Cognitive Services Translator API v3.0 for high-quality translations.
 * Supports Protected Terms via notranslate HTML class and dynamic dictionary.
 * Region: westeurope (GDPR-compliant)
 */

const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION || 'westeurope';
const API_VERSION = '3.0';

/**
 * Map ISO 639-1 codes to Azure Translator format
 * Azure uses standard ISO 639-1 codes with some exceptions
 */
function toAzureLanguage(code: string): string {
    const normalized = code.toLowerCase().split('-')[0];
    const map: Record<string, string> = {
        'zh': 'zh-Hans', // Simplified Chinese
        'pt': 'pt',      // Portuguese (auto-detects variant)
        'nb': 'nb',      // Norwegian Bokmål
        'no': 'nb',      // Norwegian → Bokmål
    };
    return map[normalized] || normalized;
}

/**
 * Map Azure language codes back to ISO 639-1
 */
function fromAzureLanguage(code: string): string {
    if (code.startsWith('zh-')) return 'zh';
    return code.split('-')[0].toLowerCase();
}

export interface TranslationResult {
    text: string;
    detectedSourceLanguage?: string;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap protected terms with notranslate span for Azure Translator
 * Azure respects <span class="notranslate"> in HTML mode
 */
export function wrapProtectedTerms(text: string, protectedTerms: string[]): string {
    if (!protectedTerms.length) return text;

    let result = text;
    // Sort by length descending to handle overlapping terms correctly
    const sorted = [...protectedTerms].sort((a, b) => b.length - a.length);

    for (const term of sorted) {
        const regex = new RegExp(escapeRegex(term), 'g');
        result = result.replace(regex, `<span class="notranslate">${term}</span>`);
    }

    return result;
}

/**
 * Remove notranslate spans from translated text
 */
export function unwrapProtectedTerms(text: string): string {
    return text.replace(/<span class="notranslate">([^<]+)<\/span>/g, '$1');
}

/**
 * Translate a single text using Azure Translator
 */
export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    protectedTerms: string[] = []
): Promise<string> {
    if (!AZURE_TRANSLATOR_KEY) {
        console.error('AZURE_TRANSLATOR_KEY is not configured');
        return text;
    }

    if (!text.trim()) {
        return text;
    }

    try {
        // Wrap protected terms if any
        const useHtmlMode = protectedTerms.length > 0;
        const preparedText = useHtmlMode
            ? wrapProtectedTerms(text, protectedTerms)
            : text;

        const params = new URLSearchParams({
            'api-version': API_VERSION,
            'from': toAzureLanguage(sourceLang),
            'to': toAzureLanguage(targetLang),
        });

        if (useHtmlMode) {
            params.set('textType', 'html');
        }

        const response = await fetch(
            `${AZURE_TRANSLATOR_ENDPOINT}/translate?${params.toString()}`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
                    'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([{ Text: preparedText }]),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Azure Translator API error: ${response.status} - ${errorText}`);
            return text;
        }

        const data = await response.json();

        if (data[0]?.translations?.[0]?.text) {
            let translated = data[0].translations[0].text;

            // Remove notranslate wrappers from result
            if (useHtmlMode) {
                translated = unwrapProtectedTerms(translated);
            }

            return translated;
        }

        return text;
    } catch (error) {
        console.error('Azure Translator error:', error);
        return text;
    }
}

/**
 * Translate multiple texts in a single batch request
 * Azure supports up to 1000 elements and 50,000 characters per request
 */
export async function translateBatch(
    texts: string[],
    sourceLang: string | undefined,
    targetLang: string,
    protectedTerms: string[] = []
): Promise<string[]> {
    if (!AZURE_TRANSLATOR_KEY) {
        console.error('AZURE_TRANSLATOR_KEY is not configured');
        return texts;
    }

    if (texts.length === 0) {
        return [];
    }

    // Filter out empty strings but keep track of positions
    const nonEmptyIndices: number[] = [];
    const nonEmptyTexts: string[] = [];

    texts.forEach((text, index) => {
        if (text.trim()) {
            nonEmptyIndices.push(index);
            nonEmptyTexts.push(text);
        }
    });

    if (nonEmptyTexts.length === 0) {
        return texts;
    }

    try {
        const useHtmlMode = protectedTerms.length > 0;
        const preparedTexts = useHtmlMode
            ? nonEmptyTexts.map(t => wrapProtectedTerms(t, protectedTerms))
            : nonEmptyTexts;

        // Split into chunks of 1000 (Azure limit) and 50k chars
        const chunks: string[][] = [];
        let currentChunk: string[] = [];
        let currentChars = 0;

        for (const text of preparedTexts) {
            if (currentChunk.length >= 1000 || currentChars + text.length > 50000) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                }
                currentChunk = [text];
                currentChars = text.length;
            } else {
                currentChunk.push(text);
                currentChars += text.length;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        // Translate each chunk
        const allTranslations: string[] = [];

        for (const chunk of chunks) {
            const params = new URLSearchParams({
                'api-version': API_VERSION,
                'to': toAzureLanguage(targetLang),
            });

            if (sourceLang) {
                params.set('from', toAzureLanguage(sourceLang));
            }

            if (useHtmlMode) {
                params.set('textType', 'html');
            }

            const batchBody = chunk.map(t => ({ Text: t }));

            const response = await fetch(
                `${AZURE_TRANSLATOR_ENDPOINT}/translate?${params.toString()}`,
                {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
                        'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchBody),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Azure Translator batch error: ${response.status} - ${errorText}`);
                // Fallback: return originals for this chunk
                allTranslations.push(...chunk.map((_, i) => nonEmptyTexts[allTranslations.length + i]));
                continue;
            }

            const data = await response.json();

            for (let i = 0; i < data.length; i++) {
                let translated = data[i]?.translations?.[0]?.text || chunk[i];
                if (useHtmlMode) {
                    translated = unwrapProtectedTerms(translated);
                }
                allTranslations.push(translated);
            }
        }

        // Reconstruct result array
        const result = [...texts];
        for (let i = 0; i < nonEmptyIndices.length; i++) {
            result[nonEmptyIndices[i]] = allTranslations[i] || texts[nonEmptyIndices[i]];
        }

        return result;
    } catch (error) {
        console.error('Azure Translator batch error:', error);
        return texts;
    }
}

/**
 * Detect language of text using Azure Translator
 * Returns lowercase ISO 639-1 code
 */
export async function detectLanguage(text: string): Promise<string | null> {
    if (!AZURE_TRANSLATOR_KEY) {
        return null;
    }

    if (!text.trim()) {
        return null;
    }

    try {
        const response = await fetch(
            `${AZURE_TRANSLATOR_ENDPOINT}/detect?api-version=${API_VERSION}`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
                    'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([{ Text: text.slice(0, 500) }]),
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data[0]?.language) {
            return fromAzureLanguage(data[0].language);
        }

        return null;
    } catch (error) {
        console.error('Azure language detection error:', error);
        return null;
    }
}

/**
 * Get character count for cost tracking
 */
export function getCharacterCount(texts: string[]): number {
    return texts.reduce((sum, text) => sum + text.length, 0);
}
