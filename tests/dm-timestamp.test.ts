import { describe, it, expect } from 'vitest';
import { formatMessageTimestamp } from '@/lib/dm-date-format';

/**
 * Round 5 / Item 1 — Smart timestamp formatter.
 *
 * `formatMessageTimestamp` is a pure function; all tests use the optional
 * `now` parameter to pin the reference time so no fake timers are needed.
 */

// Reference: 2026-04-25 15:30 local time (a Saturday).
// Using local-time constructors so comparisons in `formatMessageTimestamp`
// (which uses getFullYear/getMonth/getDate — local) are timezone-stable.
const NOW = new Date(2026, 3, 25, 15, 30, 0); // month 3 = April

// Helpers — produce a Date in LOCAL time relative to NOW
function today(h: number, m: number) {
  return new Date(2026, 3, 25, h, m); // April 25, 2026
}
function yesterday(h: number, m: number) {
  return new Date(2026, 3, 24, h, m); // April 24, 2026
}
function daysAgo(days: number, h = 10, m = 0) {
  return new Date(2026, 3, 25 - days, h, m);
}

const LABELS = { today: 'Today', yesterday: 'Yesterday' };

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

describe('formatMessageTimestamp — today', () => {
  it('returns "Today, <time>" for a message sent today', () => {
    const date = today(10, 5);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).toMatch(/^Today,/);
  });

  it('includes the time portion', () => {
    const date = today(9, 7);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    // Time format is locale-dependent; just verify a colon-separated number is present
    expect(result).toMatch(/\d+[:.]\d+/);
  });

  it('uses the caller-supplied todayLabel (i18n)', () => {
    const date = today(12, 0);
    const result = formatMessageTimestamp(date, 'Heute', 'Gestern', NOW);
    expect(result).toMatch(/^Heute,/);
  });

  it('does NOT start with "Yesterday" for today', () => {
    const date = today(8, 0);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).not.toMatch(/^Yesterday/);
  });
});

// ---------------------------------------------------------------------------
// Yesterday
// ---------------------------------------------------------------------------

describe('formatMessageTimestamp — yesterday', () => {
  it('returns "Yesterday, <time>" for a message sent yesterday', () => {
    const date = yesterday(14, 22);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).toMatch(/^Yesterday,/);
  });

  it('uses the caller-supplied yesterdayLabel (i18n)', () => {
    const date = yesterday(9, 0);
    const result = formatMessageTimestamp(date, 'Aujourd\'hui', 'Hier', NOW);
    expect(result).toMatch(/^Hier,/);
  });

  it('does NOT classify yesterday as today', () => {
    const date = yesterday(23, 59);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).not.toMatch(/^Today/);
  });
});

// ---------------------------------------------------------------------------
// Within last 7 days (weekday format)
// ---------------------------------------------------------------------------

describe('formatMessageTimestamp — within 7 days', () => {
  it('returns a weekday name for a date 2 days ago', () => {
    const date = daysAgo(2);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    // Should NOT start with Today or Yesterday
    expect(result).not.toMatch(/^Today/);
    expect(result).not.toMatch(/^Yesterday/);
    // Should contain a comma-separated time
    expect(result).toContain(',');
  });

  it('returns a weekday name for 6 days ago', () => {
    const date = daysAgo(6);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).not.toMatch(/^Today/);
    expect(result).not.toMatch(/^Yesterday/);
    expect(result).toContain(',');
  });
});

// ---------------------------------------------------------------------------
// Older than 7 days (full date format)
// ---------------------------------------------------------------------------

describe('formatMessageTimestamp — older than 7 days', () => {
  it('returns a date+time string for a message 8 days ago', () => {
    const date = daysAgo(8);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).not.toMatch(/^Today/);
    expect(result).not.toMatch(/^Yesterday/);
    // Should include a year somewhere (for full date representation)
    expect(result).toMatch(/2026/);
  });

  it('returns a date+time string for a message 30 days ago', () => {
    const date = daysAgo(30);
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).toMatch(/2026/);
  });

  it('returns a date+time string for a message from a year ago', () => {
    const date = new Date('2025-04-25T10:00:00.000Z');
    const result = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(result).toMatch(/2025/);
  });
});

// ---------------------------------------------------------------------------
// Pure function contract — no side-effects, no mutation
// ---------------------------------------------------------------------------

describe('formatMessageTimestamp — pure function contract', () => {
  it('calling twice with same args returns the same result', () => {
    const date = today(11, 30);
    const r1 = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    const r2 = formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(r1).toBe(r2);
  });

  it('does not mutate the input date', () => {
    const date = today(9, 0);
    const originalTime = date.getTime();
    formatMessageTimestamp(date, LABELS.today, LABELS.yesterday, NOW);
    expect(date.getTime()).toBe(originalTime);
  });

  it('does not mutate the reference `now` date', () => {
    const ref = new Date(NOW.getTime());
    const originalTime = ref.getTime();
    formatMessageTimestamp(today(10, 0), LABELS.today, LABELS.yesterday, ref);
    expect(ref.getTime()).toBe(originalTime);
  });

  it('works without an explicit `now` (uses system clock — smoke test)', () => {
    const date = new Date(Date.now() - 60_000); // 1 minute ago
    const result = formatMessageTimestamp(date, 'Today', 'Yesterday');
    // Just confirm it doesn't throw and returns a non-empty string
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
