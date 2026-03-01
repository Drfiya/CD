/**
 * Protected Terms System
 *
 * Three-tier terminology protection:
 * 1. Global platform terms (admin-maintained)
 * 2. Domain-specific terms (per category/channel)
 * 3. User-defined terms (asterisk syntax: *term*)
 */

/**
 * Global protected terms that should never be translated
 * These are platform names, scientific journals, and universal abbreviations
 */
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

/**
 * Domain-specific protected terms, keyed by category name (lowercase)
 */
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

/**
 * Collect all protected terms for a given text and category
 */
export function collectProtectedTerms(
    text: string,
    categoryName?: string
): {
    allTerms: string[];
    cleanText: string;
    userTerms: string[];
} {
    // 1. Extract user-defined terms from asterisk syntax
    const { cleanText, userTerms } = extractUserProtectedTerms(text);

    // 2. Collect domain terms for the category
    const domainKey = (categoryName || '').toLowerCase();
    const domainTerms = DOMAIN_TERMS[domainKey] || [];

    // 3. Combine all terms (deduplicate)
    const allTermsSet = new Set<string>([
        ...GLOBAL_PROTECTED_TERMS,
        ...domainTerms,
        ...userTerms,
    ]);

    // 4. Filter to only terms that actually appear in the text
    const allTerms = Array.from(allTermsSet).filter(term =>
        cleanText.toLowerCase().includes(term.toLowerCase())
    );

    // Sort by length descending to handle overlapping terms
    allTerms.sort((a, b) => b.length - a.length);

    return { allTerms, cleanText, userTerms };
}
