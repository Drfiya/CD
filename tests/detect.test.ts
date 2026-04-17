/**
 * Language-detection smoke tests. Ensures the local heuristic detector
 * keeps returning the right locale for the three live platform languages
 * (DE / EN / FR) across the adversarial cases the Examiner verified in
 * Round 1 — including the mixed "German post with ICD-10 code" case.
 */

import { describe, it, expect } from 'vitest';
import { detectLanguageSync } from '@/lib/translation/detect';

describe('language detection', () => {
    const cases: Array<{ expected: string; input: string }> = [
        { expected: 'de', input: 'Der Hund läuft schnell durch den Wald und sieht einen Vogel.' },
        { expected: 'en', input: 'The quick brown fox jumps over the lazy dog.' },
        { expected: 'fr', input: 'Le chat mange la souris dans le jardin avec une grande joie.' },
        { expected: 'en', input: '' },
        { expected: 'en', input: 'OpenAI' },
        { expected: 'en', input: 'Hallo' },
        { expected: 'fr', input: 'Garçon' },
        { expected: 'de', input: 'Scheiße' },
        { expected: 'en', input: '中文测试' },
        { expected: 'de', input: 'ICD-10 Z99.9 patient scheint leer, Doktor sagte nicht gut' },
    ];

    for (const c of cases) {
        it(`detects ${c.expected} for "${c.input.slice(0, 30)}"`, () => {
            expect(detectLanguageSync(c.input)).toBe(c.expected);
        });
    }
});
