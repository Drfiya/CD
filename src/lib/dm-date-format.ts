/**
 * Round 5 / Item 1 — Pure timestamp formatter for DM message bubbles.
 *
 * Extracted so unit tests can import this helper without pulling in the
 * full `message-bubble.tsx` import chain (which includes server actions
 * that need DATABASE_URL). No React, no server imports, no env access.
 *
 * Returns:
 *   - "Today, HH:MM"      — for messages sent today
 *   - "Yesterday, HH:MM"  — for messages sent yesterday
 *   - "Weekday, HH:MM"    — for messages within the last 7 days
 *   - "DD Mon YYYY, HH:MM"— for older messages
 *
 * @param now — injectable reference time (defaults to `new Date()`), enables
 *              deterministic unit tests without `vi.useFakeTimers()`.
 *              Passing `now` makes this a pure function with no side effects.
 */
export function formatMessageTimestamp(
  date: Date,
  todayLabel: string,
  yesterdayLabel: string,
  now?: Date,
): string {
  const ref = now ?? new Date();

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isToday =
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate();

  if (isToday) return `${todayLabel}, ${timeStr}`;

  // Construct yesterday as a new Date — no mutation of `ref`.
  const yd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yd.getFullYear() &&
    date.getMonth() === yd.getMonth() &&
    date.getDate() === yd.getDate();

  if (isYesterday) return `${yesterdayLabel}, ${timeStr}`;

  const msPerDay = 86_400_000;
  const daysDiff = Math.floor((ref.getTime() - date.getTime()) / msPerDay);

  if (daysDiff < 7) {
    const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
    return `${weekday}, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr}, ${timeStr}`;
}
