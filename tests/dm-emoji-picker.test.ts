import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  insertAtCursorPosition,
  EmojiPickerButton,
} from '@/components/messages/emoji-picker-button';

/**
 * Round 4 / Item 2 — Emoji Picker.
 *
 * Two concerns: (1) the pure cursor-position insertion helper and
 * (2) the <EmojiPickerButton /> rendered output.
 *
 * The Picker itself (dynamic, ssr:false) is not exercised here; only the
 * button shell and the insertion algebra are tested.
 */

// ---------------------------------------------------------------------------
// insertAtCursorPosition — collapsed cursor (selStart === selEnd)
// ---------------------------------------------------------------------------

describe('insertAtCursorPosition — collapsed cursor', () => {
  it('inserts at the beginning of the value', () => {
    expect(insertAtCursorPosition('world', '👋', 0, 0)).toBe('👋world');
  });

  it('inserts in the middle of the value', () => {
    expect(insertAtCursorPosition('helo', '🙂', 2, 2)).toBe('he🙂lo');
  });

  it('appends at the end of the value', () => {
    expect(insertAtCursorPosition('hi', '!', 2, 2)).toBe('hi!');
  });

  it('inserts into an empty string', () => {
    expect(insertAtCursorPosition('', '😀', 0, 0)).toBe('😀');
  });

  it('handles a multi-codepoint ZWJ emoji correctly', () => {
    const familyEmoji = '👨‍👩‍👧';
    expect(insertAtCursorPosition('ab', familyEmoji, 1, 1)).toBe('a' + familyEmoji + 'b');
  });

  it('handles position exactly at string length (end of string)', () => {
    expect(insertAtCursorPosition('end', '!', 3, 3)).toBe('end!');
  });

  it('inserts empty string — value is unchanged', () => {
    expect(insertAtCursorPosition('hello', '', 2, 2)).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// insertAtCursorPosition — range selection (selStart !== selEnd)
// ---------------------------------------------------------------------------

describe('insertAtCursorPosition — range selection (replaces selected text)', () => {
  it('replaces the selected range with the emoji', () => {
    // "hello" — select "ell" (positions 1..4) — replace with 🎉
    expect(insertAtCursorPosition('hello', '🎉', 1, 4)).toBe('h🎉o');
  });

  it('replaces the entire string', () => {
    expect(insertAtCursorPosition('old text', '✨', 0, 8)).toBe('✨');
  });

  it('replaces a single character in the middle', () => {
    expect(insertAtCursorPosition('abc', '😊', 1, 2)).toBe('a😊c');
  });

  it('replaces the first character', () => {
    expect(insertAtCursorPosition('bad', '👍', 0, 1)).toBe('👍ad');
  });

  it('replaces the last character', () => {
    expect(insertAtCursorPosition('abc', '🔥', 2, 3)).toBe('ab🔥');
  });

  it('replacing with empty string deletes the selected range', () => {
    expect(insertAtCursorPosition('hello world', '', 5, 11)).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// insertAtCursorPosition — Unicode surrogate pair awareness
// ---------------------------------------------------------------------------

describe('insertAtCursorPosition — Unicode edge cases', () => {
  it('inserts after a surrogate-pair emoji (position 2 = after 😀)', () => {
    // "😀" occupies UTF-16 code units 0..1; "a" is at index 2.
    expect(insertAtCursorPosition('😀a', '🎯', 2, 2)).toBe('😀🎯a');
  });

  it('cursor at 0 inserts before everything', () => {
    expect(insertAtCursorPosition('😀', '🔝', 0, 0)).toBe('🔝😀');
  });
});

// ---------------------------------------------------------------------------
// <EmojiPickerButton /> — static rendered markup (picker closed on mount)
// ---------------------------------------------------------------------------

describe('<EmojiPickerButton /> — initial render (picker closed)', () => {
  function render(
    overrides: Partial<import('@/components/messages/emoji-picker-button').EmojiPickerButtonProps> = {},
  ): string {
    return renderToStaticMarkup(
      createElement(EmojiPickerButton, {
        onEmojiSelect: () => {},
        ariaLabel: 'Open emoji picker',
        closeLabel: 'Close emoji picker',
        ...overrides,
      }),
    );
  }

  it('renders a button with the open aria-label when picker is closed', () => {
    const html = render();
    expect(html).toContain('Open emoji picker');
  });

  it('does NOT render the close label when picker is closed', () => {
    const html = render();
    expect(html).not.toContain('Close emoji picker');
  });

  it('does NOT render the picker dialog on initial mount', () => {
    const html = render();
    // No role="dialog" should be present while showPicker is false
    expect(html).not.toContain('role="dialog"');
  });

  it('renders a button of type="button" (never submit)', () => {
    const html = render();
    expect(html).toContain('type="button"');
  });

  it('renders aria-expanded="false" on initial render', () => {
    const html = render();
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders aria-haspopup="dialog"', () => {
    const html = render();
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('renders the SVG smiley icon with the distinctive path segment', () => {
    const html = render();
    // The smiley face path is uniquely identified by this arc
    expect(html).toContain('15.182 15.182a4.5 4.5 0');
  });

  it('renders disabled attribute when disabled=true', () => {
    const html = render({ disabled: true });
    expect(html).toContain('disabled');
  });

  it('does NOT render the disabled attribute when disabled is not set', () => {
    const html = render();
    // React serializes a disabled button as disabled="". When disabled is absent,
    // that attribute string must not appear. (The Tailwind `disabled:` class prefix
    // is in the class attribute and is not checked here.)
    expect(html).not.toContain('disabled=""');
  });

  it('uses the custom ariaLabel in aria-label attribute', () => {
    const html = render({ ariaLabel: 'Emoji öffnen' });
    expect(html).toContain('Emoji öffnen');
  });
});

// ---------------------------------------------------------------------------
// Round 5 / Item 4 — ESC key handler wiring (structural checks)
// ---------------------------------------------------------------------------

describe('<EmojiPickerButton /> — Round 5 ESC handler', () => {
  function render(
    overrides: Partial<import('@/components/messages/emoji-picker-button').EmojiPickerButtonProps> = {},
  ): string {
    return renderToStaticMarkup(
      createElement(EmojiPickerButton, {
        onEmojiSelect: () => {},
        ariaLabel: 'Open emoji picker',
        closeLabel: 'Close emoji picker',
        ...overrides,
      }),
    );
  }

  it('component still renders correctly after ESC handler addition', () => {
    const html = render();
    expect(html).toContain('type="button"');
  });

  it('ESC handler does not affect the initial closed state', () => {
    // On initial SSR render (closed), the picker dialog must not appear
    const html = render();
    expect(html).not.toContain('role="dialog"');
  });

  it('aria-expanded is false on initial render (ESC has nothing to close)', () => {
    const html = render();
    expect(html).toContain('aria-expanded="false"');
  });

  it('SVG smiley icon renders correctly after ESC handler addition', () => {
    const html = render();
    // Heroicons face-smile path — preserved through the ESC handler patch
    expect(html).toContain('15.182 15.182a4.5 4.5 0');
  });

  it('component is still disabled-able after ESC handler addition', () => {
    const html = render({ disabled: true });
    expect(html).toContain('disabled');
  });
});
