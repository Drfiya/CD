/**
 * Protected Terms System — Teil B (Terminology Protection)
 *
 * Five-tier terminology protection:
 * 1. Global platform terms (hardcoded fallback)
 * 2. Domain-specific terms (per category/channel)
 * 3. User-defined terms (asterisk syntax: *term*)
 * 4. DB Blacklist terms (TranslationBlacklist table, cached 5 min)
 * 5. Automatic NER detection (gene symbols, ICD-10, study IDs, DOIs, etc.)
 *
 * Plus: Medical Numbers/Units Protection (F4)
 *   - Extracts numerical/unit values, replaces with __NUM_N__ placeholders
 *   - Restores them after translation for medical safety
 */

import db from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GLOBAL PROTECTED TERMS (hardcoded fallback)
// ═══════════════════════════════════════════════════════════════════════════════

export const GLOBAL_PROTECTED_TERMS = [
    // Platform terms
    'Science Experts',
    'scienceexperts.ai',
    'Claude Skills',
    'Anti-Gravity',

    // Scientific techniques & methods
    'CRISPR',
    'CRISPR-Cas9',
    'mRNA',
    'PCR',
    'RT-qPCR',
    'siRNA',
    'Western Blot',
    'ELISA',

    // Diseases & organisms
    'COVID-19',
    'SARS-CoV-2',

    // Organizations
    'WHO',
    'FDA',
    'EMA',
    'NIH',
    'CDC',
    'EMEA',

    // Scientific databases & identifiers
    'PubMed',
    'DOI',
    'ORCID',
    'PDB',
    'UniProt',
    'GenBank',
    'arXiv',

    // Journals
    'Nature',
    'The Lancet',
    'NEJM',
    'BMJ',
    'JAMA',
    'Cell',
    'Science',

    // Chemical/Medical abbreviations
    'pH',
    'DNA',
    'RNA',
    'ATP',
    'GFP',
    'DMSO',
    'PBS',
    'SDS-PAGE',
    'NMR',
    'HPLC',
    'GC-MS',
    'LC-MS',
    'IC50',
    'EC50',
    'LD50',
    'HbA1c',
    'EKG',
    'ECG',
    'MRT',
    'MRI',
    'CT',
    'PET',
    'fMRI',

    // Physics terms
    'Higgs-Boson',
    'Quark',
    'Lepton',
    'Fermion',
    'Boson',
];

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DOMAIN-SPECIFIC PROTECTED TERMS (hardcoded fallback)
// ═══════════════════════════════════════════════════════════════════════════════

export const DOMAIN_TERMS: Record<string, string[]> = {
    medicine: [
        'Befund', 'Anamnese', 'EKG', 'MRT', 'CT', 'HbA1c',
        'Hemoglobin', 'Hematocrit', 'Creatinine', 'Troponin',
        'INR', 'PT', 'aPTT', 'BNP', 'CRP', 'ESR',
    ],
    physics: [
        'Higgs-Boson', 'Quark', 'Lepton', 'Fermion', 'Boson',
        'Planck', 'Schwarzschild', 'Lagrangian', 'Hamiltonian',
    ],
    chemistry: [
        'pH', 'NMR', 'HPLC', 'GC-MS', 'LC-MS',
        'SDS-PAGE', 'DMSO', 'PBS', 'Tris',
    ],
    biology: [
        'CRISPR-Cas9', 'siRNA', 'RT-qPCR', 'Western Blot',
        'ELISA', 'GFP', 'PCR', 'RNA-seq', 'ChIP-seq',
    ],
    general: [],
    announcements: [],
    introductions: [],
    questions: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. USER-DEFINED TERMS (asterisk syntax) — kept exactly as original
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract user-protected terms from text using asterisk syntax
 *
 * Users can wrap terms in single asterisks: *term*
 * This is distinguished from Markdown bold (**text**) by checking
 * that asterisks are not doubled.
 *
 * Returns the cleaned text (asterisks removed) and the list of protected terms.
 */
export function extractUserProtectedTerms(text: string): {
    cleanText: string;
    userTerms: string[];
} {
    const userTerms: string[] = [];

    // Match single asterisks but not double asterisks (Markdown bold)
    // Negative lookbehind/lookahead for asterisks
    const regex = /(?<!\*)\*([^*]+)\*(?!\*)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        const term = match[1].trim();
        if (term.length > 0) {
            userTerms.push(term);
        }
    }

    // Remove asterisks but keep the term text
    const cleanText = text.replace(regex, '$1');

    return { cleanText, userTerms };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DB BLACKLIST INTEGRATION (cached, 5-minute TTL)
// ═══════════════════════════════════════════════════════════════════════════════

interface BlacklistCacheEntry {
    terms: string[];
    fetchedAt: number;
}

const BLACKLIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let blacklistCache: BlacklistCacheEntry | null = null;

/**
 * Load active blacklist terms from the TranslationBlacklist table.
 * Uses a simple in-memory cache with 5-minute TTL to avoid hitting
 * the DB on every translation call. Falls back to an empty array
 * if the DB query fails.
 */
async function loadBlacklistTerms(): Promise<string[]> {
    const now = Date.now();

    // Return cached terms if still fresh
    if (blacklistCache && (now - blacklistCache.fetchedAt) < BLACKLIST_CACHE_TTL_MS) {
        return blacklistCache.terms;
    }

    try {
        const entries = await db.translationBlacklist.findMany({
            where: { isActive: true },
            select: { term: true },
        });

        const terms = entries.map((e: { term: string }) => e.term);

        blacklistCache = { terms, fetchedAt: now };
        return terms;
    } catch (error) {
        console.error('[protected-terms] Failed to load blacklist from DB:', error);
        // Return stale cache if available, otherwise empty array
        return blacklistCache?.terms ?? [];
    }
}

/**
 * Force-invalidate the blacklist cache (useful after admin changes).
 */
export function invalidateBlacklistCache(): void {
    blacklistCache = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MEDICAL NUMBERS/UNITS PROTECTION (F4)
// ═══════════════════════════════════════════════════════════════════════════════

export interface NumericalValue {
    placeholder: string;
    original: string;
}

/**
 * Regex patterns for medical/scientific numerical values.
 *
 * Order matters: more specific patterns are listed first so they match
 * before the broader catch-all patterns consume partial matches.
 */
const NUMERICAL_PATTERNS: RegExp[] = [
    // Scientific notation with unicode multiplication sign: 1.5 × 10⁶
    /\d+(?:\.\d+)?\s*[×x]\s*10[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g,

    // Scientific notation with e-notation: 3e-5, 1.5E+10
    /\d+(?:\.\d+)?[eE][+-]?\d+/g,

    // Blood pressure pattern: 120/80 mmHg
    /\d{2,3}\/\d{2,3}\s*mmHg/gi,

    // Concentrations with compound units: 10 µg/mL, 2.5 ng/mL, 3.5 mmol/L, 7.4 mg/dL, 140 mEq/L
    /\d+(?:\.\d+)?\s*(?:µg|mcg|ng|pg|mg|g|kg|mmol|µmol|nmol|pmol|mol|mEq|IU|U)\s*\/\s*(?:mL|dL|L|kg|m²|min|h|hr|day)/gi,

    // Temperatures with degree symbol: 37.5°C, 98.6°F
    /\d+(?:\.\d+)?\s*°\s*[CF]/g,

    // Percentages: 95%, 0.05%
    /\d+(?:\.\d+)?\s*%/g,

    // Doses with units: 500 mg, 250 mcg, 10 mL, 5 µg, 100 IU
    /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ng|pg|g|kg|mL|µL|dL|L|IU|U|mmHg|kPa|mOsm|mEq|mmol|µmol|nmol|pmol|mol|Gy|mSv|Sv|Bq|kBq|MBq|GBq)\b/gi,
];

/**
 * Extract all medical/scientific numerical values from text and replace
 * them with numbered placeholders (__NUM_0__, __NUM_1__, etc.).
 *
 * This is critical for medical safety: doses, lab values, concentrations,
 * and other numerical data must survive translation intact.
 */
export function extractNumericalValues(text: string): {
    processedText: string;
    values: NumericalValue[];
} {
    const values: NumericalValue[] = [];
    let processedText = text;

    // Track which character positions have already been replaced to avoid
    // overlapping matches from different regex patterns.
    const replacedRanges: Array<{ start: number; end: number }> = [];

    for (const pattern of NUMERICAL_PATTERNS) {
        // Reset the regex lastIndex for each pass
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            // Skip if this range overlaps with an already-replaced range
            const overlaps = replacedRanges.some(
                (r) => start < r.end && end > r.start
            );
            if (overlaps) continue;

            replacedRanges.push({ start, end });
        }
    }

    // Sort ranges by start position descending so we can replace from the
    // end of the string backward without invalidating earlier indices.
    replacedRanges.sort((a, b) => b.start - a.start);

    // Deduplicate exact overlapping ranges
    const uniqueRanges: Array<{ start: number; end: number }> = [];
    for (const range of replacedRanges) {
        const isDup = uniqueRanges.some(
            (r) => r.start === range.start && r.end === range.end
        );
        if (!isDup) uniqueRanges.push(range);
    }

    // Now assign placeholder indices in reading order (forward)
    uniqueRanges.sort((a, b) => a.start - b.start);

    // Replace in reverse order to preserve string indices
    const indexed = uniqueRanges.map((range, idx) => ({ ...range, idx }));
    indexed.sort((a, b) => b.start - a.start);

    for (const { start, end, idx } of indexed) {
        const original = processedText.slice(start, end);
        const placeholder = `__NUM_${idx}__`;
        values.push({ placeholder, original });
        processedText =
            processedText.slice(0, start) + placeholder + processedText.slice(end);
    }

    // Sort values by index for consistent ordering
    values.sort((a, b) => {
        const idxA = parseInt(a.placeholder.replace(/^__NUM_|__$/g, ''), 10);
        const idxB = parseInt(b.placeholder.replace(/^__NUM_|__$/g, ''), 10);
        return idxA - idxB;
    });

    return { processedText, values };
}

/**
 * Restore numerical values from placeholders back into translated text.
 */
export function restoreNumericalValues(
    text: string,
    values: NumericalValue[]
): string {
    let result = text;
    // Replace longest placeholders first to avoid partial matches
    const sorted = [...values].sort(
        (a, b) => b.placeholder.length - a.placeholder.length
    );
    for (const { placeholder, original } of sorted) {
        result = result.replace(placeholder, original);
    }
    return result;
}

/**
 * Validate that all numerical values survived translation intact.
 *
 * Checks that every original numerical value appears in the translated
 * text (either as the original string or via its placeholder being
 * correctly restored). Returns false if any value is missing — this
 * indicates a medical safety concern.
 */
export function validateNumericalIntegrity(
    original: string,
    translated: string,
    values: NumericalValue[]
): boolean {
    for (const { placeholder, original: numValue } of values) {
        // The value should appear as the original string in the translated text
        // (after placeholder restoration). If a placeholder was NOT restored,
        // that also counts as a failure.
        const hasOriginal = translated.includes(numValue);
        const hasPlaceholder = translated.includes(placeholder);

        if (!hasOriginal && !hasPlaceholder) {
            console.warn(
                `[protected-terms] Numerical integrity check FAILED: ` +
                `"${numValue}" (${placeholder}) missing from translated text`
            );
            return false;
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUTOMATIC MEDICAL NER DETECTION (F3)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Named-entity recognition patterns for biomedical/scientific text.
 * Each entry has a label (for logging/admin review) and a regex.
 */
const NER_PATTERNS: Array<{ label: string; regex: RegExp }> = [
    // Gene symbols: uppercase 2-6 chars optionally followed by digits
    // e.g. BRCA1, TP53, EGFR, HER2, KRAS, BRAF, ALK
    {
        label: 'gene_symbol',
        regex: /\b([A-Z]{2,6}\d{0,2})\b/g,
    },

    // ICD-10 codes: letter + 2 digits + optional .digits
    // e.g. F32.1, J45.0, C50.9, M54.5
    {
        label: 'icd10_code',
        regex: /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g,
    },

    // Clinical trial study IDs: NCT followed by 8 digits
    // e.g. NCT12345678
    {
        label: 'study_id',
        regex: /\b(NCT\d{8})\b/g,
    },

    // DOIs: 10.XXXX/pattern
    // e.g. 10.1038/s41586-021-03819-2
    {
        label: 'doi',
        regex: /\b(10\.\d{4,9}\/[^\s,;)}\]]+)/g,
    },

    // PubMed IDs: PMID: digits or PMID digits
    // e.g. PMID: 12345678, PMID:12345678
    {
        label: 'pmid',
        regex: /\bPMID:?\s*(\d{6,10})\b/g,
    },

    // Latin organism names (abbreviated genus): E. coli, S. aureus, C. elegans, etc.
    {
        label: 'organism_latin',
        regex: /\b([A-Z]\.\s*[a-z]{2,})\b/g,
    },

    // Latin organism names (full genus): Escherichia coli, Staphylococcus aureus
    {
        label: 'organism_latin_full',
        regex: /\b([A-Z][a-z]{3,}\s+[a-z]{2,})\b/g,
    },

    // Drug doses with route-specific patterns: 500 mg PO, 10 mg/kg IV
    // (These overlap with numerical extraction but here we capture the full
    //  clinical expression including route abbreviations for NER flagging)
    {
        label: 'drug_dose',
        regex: /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|mL|IU|U)(?:\s*\/\s*(?:kg|m²|day|dose))?\s*(?:PO|IV|IM|SC|SQ|SL|PR|INH|TOP|TD)?)\b/gi,
    },
];

/**
 * Common English words that would false-positive match the gene symbol regex.
 * Filtered out to reduce noise in NER detection.
 */
const GENE_SYMBOL_EXCLUSIONS = new Set([
    // Common short uppercase words/abbreviations that are NOT gene symbols
    'THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD',
    'HIS', 'HER', 'ITS', 'OUR', 'WHO', 'HOW', 'WHY', 'ALL', 'CAN',
    'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'DAY', 'DID', 'GET',
    'LET', 'SAY', 'SHE', 'TOO', 'USE', 'TWO', 'SET', 'TOP', 'END',
    'FAR', 'RUN', 'TRY', 'ASK', 'MEN', 'OWN', 'PUT', 'BIG', 'FEW',
    'WITH', 'THAT', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'BEEN',
    'HAVE', 'MUCH', 'WHAT', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME',
    'ALSO', 'MADE', 'FIND', 'HERE', 'THAN', 'EACH', 'MAKE', 'LIKE',
    'LONG', 'LOOK', 'MANY', 'MOST', 'OVER', 'SUCH', 'TAKE', 'THEM',
    'WELL', 'WERE', 'BACK', 'JUST', 'ONLY', 'TELL', 'WORK', 'CALL',
    'KEEP', 'LAST', 'SAME', 'SHOW', 'MUST', 'NAME', 'EVEN', 'NEXT',
    // Already in GLOBAL_PROTECTED_TERMS — these are known, not "new"
    'WHO', 'FDA', 'EMA', 'NIH', 'CDC', 'DOI', 'PDB', 'BMJ', 'DNA',
    'RNA', 'ATP', 'GFP', 'PBS', 'NMR', 'MRI', 'MRT', 'PET',
    'JAMA', 'NEJM', 'EMEA', 'DMSO', 'HPLC', 'ELISA',
]);

/**
 * Run regex-based NER detection on text to find biomedical entities.
 *
 * Returns all detected terms, split into:
 * - `knownTerms`: terms that already appear in the combined protected list
 * - `detectedNewTerms`: unknown terms flagged for admin review
 */
function detectBiomedicalEntities(
    text: string,
    knownTermsSet: Set<string>
): {
    knownTerms: string[];
    detectedNewTerms: string[];
} {
    const allDetected = new Set<string>();

    for (const { label, regex } of NER_PATTERNS) {
        const re = new RegExp(regex.source, regex.flags);
        let match;
        while ((match = re.exec(text)) !== null) {
            const captured = match[1] ?? match[0];
            const trimmed = captured.trim();

            // Skip very short results (likely noise)
            if (trimmed.length < 2) continue;

            // For gene symbols, filter out common English words
            if (label === 'gene_symbol') {
                if (GENE_SYMBOL_EXCLUSIONS.has(trimmed)) continue;
                // Also skip if it looks like a common word (all same case but not gene-like)
                if (trimmed.length <= 2) continue;
            }

            // For organism_latin_full, verify it doesn't match common phrases.
            // A simple heuristic: the first word should be capitalized and the
            // second word should be all lowercase.
            if (label === 'organism_latin_full') {
                const parts = trimmed.split(/\s+/);
                if (parts.length < 2) continue;
                if (parts[0] !== parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase()) continue;
                if (parts[1] !== parts[1].toLowerCase()) continue;
            }

            allDetected.add(trimmed);
        }
    }

    const knownTerms: string[] = [];
    const detectedNewTerms: string[] = [];

    // Build a case-insensitive lookup of known terms
    const knownLower = new Set<string>();
    for (const t of knownTermsSet) {
        knownLower.add(t.toLowerCase());
    }

    for (const term of allDetected) {
        if (knownLower.has(term.toLowerCase())) {
            knownTerms.push(term);
        } else {
            detectedNewTerms.push(term);
        }
    }

    return { knownTerms, detectedNewTerms };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MAIN ENTRY POINT: collectProtectedTerms()
// ═══════════════════════════════════════════════════════════════════════════════

export interface CollectedProtectedTerms {
    /** All protected terms found in the text (deduplicated, sorted by length desc) */
    allTerms: string[];
    /** Text with asterisk syntax removed */
    cleanText: string;
    /** Terms from *asterisk* syntax */
    userTerms: string[];
    /** Extracted numerical values with their placeholders */
    numericalValues: NumericalValue[];
    /** Newly detected biomedical terms not in any existing list (for admin review) */
    detectedNewTerms: string[];
}

/**
 * Collect all protected terms for a given text and category.
 *
 * Merges five sources:
 *   1. Global hardcoded terms
 *   2. Domain-specific hardcoded terms
 *   3. User-defined asterisk terms
 *   4. DB Blacklist terms (cached, async)
 *   5. NER-detected biomedical entities
 *
 * Also extracts numerical/unit values for placeholder replacement (F4).
 */
export async function collectProtectedTerms(
    text: string,
    categoryName?: string
): Promise<CollectedProtectedTerms> {
    // 1. Extract user-defined terms from asterisk syntax
    const { cleanText, userTerms } = extractUserProtectedTerms(text);

    // 2. Collect domain terms for the category
    const domainKey = (categoryName || '').toLowerCase();
    const domainTerms = DOMAIN_TERMS[domainKey] || [];

    // 3. Load DB blacklist terms (with cache + fallback)
    let blacklistTerms: string[] = [];
    try {
        blacklistTerms = await loadBlacklistTerms();
    } catch (error) {
        console.error('[protected-terms] Blacklist loading failed, using hardcoded only:', error);
    }

    // 4. Build combined set of all known terms (for NER comparison)
    const allKnownTermsSet = new Set<string>([
        ...GLOBAL_PROTECTED_TERMS,
        ...domainTerms,
        ...userTerms,
        ...blacklistTerms,
    ]);

    // 5. Extract numerical values and get the text with placeholders
    const { processedText: _textWithPlaceholders, values: numericalValues } =
        extractNumericalValues(cleanText);

    // 6. Run NER detection on the original clean text (before placeholder replacement)
    const { knownTerms: nerKnownTerms, detectedNewTerms } =
        detectBiomedicalEntities(cleanText, allKnownTermsSet);

    // 7. Merge NER-known terms into the full set
    for (const t of nerKnownTerms) {
        allKnownTermsSet.add(t);
    }

    // 8. Filter to only terms that actually appear in the text
    const cleanTextLower = cleanText.toLowerCase();
    const allTerms = Array.from(allKnownTermsSet).filter((term) =>
        cleanTextLower.includes(term.toLowerCase())
    );

    // Sort by length descending to handle overlapping terms correctly
    allTerms.sort((a, b) => b.length - a.length);

    return {
        allTerms,
        cleanText,
        userTerms,
        numericalValues,
        detectedNewTerms,
    };
}
