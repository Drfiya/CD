/**
 * Regression tests for the content segmenter.
 *
 * The losslessness contract (`segments.join('') === input`) must hold on
 * every input type — plain text, HTML, long unpunctuated text, whitespace.
 * A prior Round 1 bug dropped a single trailing space on long unpunctuated
 * posts; this test fails if that regression reappears.
 */

import { describe, it, expect } from 'vitest';
import { segmentContent } from '@/lib/translation/segmenter';

function rebuild(input: string): string {
    return segmentContent(input).map((s) => s.text).join('');
}

describe('segmenter losslessness', () => {
    const cases: Array<{ name: string; input: string }> = [
        { name: 'html paragraphs', input: '<p>Erstens.</p><p>Zweitens hat einen längeren Satz.</p><p>Drittens.</p>' },
        { name: 'plain paragraphs', input: 'Para one has some content.\n\nPara two with details.' },
        { name: 'single sentence', input: 'x.' },
        { name: 'empty', input: '' },
        { name: 'many short sentences', input: 'A. B. C. D. E. F. G. H. I. J.' },
        { name: 'nested html', input: '<div>Outer<p>Inner paragraph content.</p>Tail</div>' },
        {
            name: 'long unpunctuated text (regression — trim bug)',
            input: ('One really long paragraph ').repeat(80), // ~2080 chars, trailing space
        },
    ];

    for (const c of cases) {
        it(`preserves "${c.name}"`, () => {
            expect(rebuild(c.input)).toBe(c.input);
        });
    }
});
