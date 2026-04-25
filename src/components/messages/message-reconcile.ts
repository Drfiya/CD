/**
 * Round 2 / B2 — Pure reconcile primitives for the ChatWindow message list.
 *
 * Two operations own the anti-dupe / anti-ghost guarantee of the DM surface:
 *
 *   `upsertIncoming(prev, incoming)`
 *       Apply a single Realtime INSERT / UPDATE payload (already normalised
 *       to a `ChatMessage`) onto the current message list. Reconciles by
 *       `clientMessageId` first (my own optimistic send arriving back),
 *       then by server `id`; appends when neither matches.
 *
 *   `mergeRefetch(prev, fresh, since)`
 *       After a `SUBSCRIBED` event the channel asks the server for a fresh
 *       page of messages. This merges the fresh page into the current list,
 *       deduping by `id` + `clientMessageId` and filtering out anything at
 *       or before the `since` watermark (the last createdAt we have already
 *       integrated).
 *
 * Extracting the logic keeps `chat-window.tsx` as an orchestration shell and
 * lets Vitest drive the five reconnect scenarios from the Creative Director
 * Round 2 brief (`creative_prompts_round_2.md` §6.1–§6.5) without a DOM.
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  clientMessageId: string | null;
  createdAt: Date;
  readAt: Date | null;
  isPending?: boolean;
  isFailed?: boolean;
  // Round 3 / Item 5 — append-only attachment metadata. Reconcile primitives
  // don't inspect these fields; they only round-trip them via upsertIncoming
  // / mergeRefetch so the existing reconnect scenarios remain valid.
  attachmentPath?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  attachmentName?: string | null;
}

export function upsertIncoming(
  prev: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  // First: reconcile with my own optimistic row by clientMessageId.
  if (incoming.clientMessageId) {
    const idx = prev.findIndex(
      (m) => m.clientMessageId === incoming.clientMessageId,
    );
    if (idx !== -1) {
      const next = prev.slice();
      next[idx] = incoming;
      return next;
    }
  }
  // Otherwise: if this server `id` is already present, update in place
  // (e.g. a subsequent UPDATE on readAt).
  const byIdIdx = prev.findIndex((m) => m.id === incoming.id);
  if (byIdIdx !== -1) {
    const next = prev.slice();
    next[byIdIdx] = { ...incoming, isPending: false, isFailed: false };
    return next;
  }
  // New message — append.
  return [...prev, incoming];
}

/**
 * Merge a server-refetched message page into the current list.
 *
 * @param since ISO-8601 string: last `createdAt` already integrated into `prev`.
 *              Fresh messages older-or-equal are skipped (they were seen
 *              before the disconnect). Pass `null` to integrate everything.
 */
export function mergeRefetch(
  prev: ChatMessage[],
  fresh: ChatMessage[],
  since: string | null,
): ChatMessage[] {
  const seenIds = new Set(prev.map((m) => m.id));
  const seenClientIds = new Set(
    prev.map((m) => m.clientMessageId).filter(Boolean) as string[],
  );
  const sinceMs = since ? new Date(since).getTime() : null;

  const merged = [...prev];
  for (const m of fresh) {
    // Use strict `<` (not `<=`) so a message whose createdAt equals the watermark
    // timestamp is NOT dropped. The ID-based dedup below prevents actual duplicates.
    if (sinceMs !== null && m.createdAt.getTime() < sinceMs) continue;
    if (seenIds.has(m.id)) continue;
    if (m.clientMessageId && seenClientIds.has(m.clientMessageId)) continue;
    merged.push(m);
    seenIds.add(m.id);
    if (m.clientMessageId) seenClientIds.add(m.clientMessageId);
  }
  merged.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return merged;
}
