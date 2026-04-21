/**
 * Mention parsing utilities.
 *
 * Matches `@name` where name is 2–32 characters of [A-Za-z0-9_-].
 * The pattern is intentionally strict to avoid matching email addresses
 * or stray `@` characters in prose.
 *
 * Used by:
 *   - comment-actions.ts / post-actions.ts — to fire MENTION notifications
 *   - MentionChip renderer — to split body text into chips + plain segments
 */

export const MENTION_REGEX = /@([A-Za-z0-9_-]{2,32})/g;

/**
 * Extract unique mention names from a body of text.
 * Returns at most `limit` names in first-seen order.
 */
export function extractMentions(text: string | null | undefined, limit = 20): string[] {
  if (!text) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}
