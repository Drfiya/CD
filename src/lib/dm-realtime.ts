/**
 * CR12 — DM Realtime channel contract.
 *
 * Two kinds of channels:
 *
 * 1. **Per-conversation (`dm:conv:<conversationId>`)** — used by the open
 *    chat window. Delivered via Supabase Postgres Changes (INSERT on
 *    `Message` filtered by `conversationId`).
 *
 * 2. **Per-user inbox (`dm:inbox:<userId>`)** — Supabase Broadcast channel.
 *    The sender's server action pushes a `new-message` event to the
 *    *recipient's* inbox channel after the row is committed. The recipient's
 *    header badge and inbox list listen here and re-query.
 *
 * We intentionally do NOT subscribe the global badge to Postgres Changes on
 * `Message`, because Supabase Realtime filters can only match one column
 * value (we'd have to fan out a channel per conversation per user). A
 * dedicated broadcast channel gives us O(1) subscriptions per active user
 * and keeps payload size bounded.
 *
 * Broadcast payload shape:
 *   { conversationId: string, messageId: string, senderId: string, createdAtISO: string }
 *
 * Reconnect contract:
 * - On `SUBSCRIBED` (initial or recovery), the client re-fetches via the
 *   server action (`getConversationList`, `getMessages`). The Realtime
 *   broadcast is a *hint* to re-query, not a source of truth — this
 *   guarantees zero ghost-messages after a disconnect/reconnect.
 */

export function dmConversationChannel(conversationId: string): string {
  return `dm:conv:${conversationId}`;
}

export function dmInboxChannel(userId: string): string {
  return `dm:inbox:${userId}`;
}

export interface DmInboxBroadcast {
  conversationId: string;
  messageId: string;
  senderId: string;
  createdAtISO: string;
}

export const DM_INBOX_EVENT = 'new-message' as const;

/**
 * Round 2 / A2 — Read-Event Broadcast.
 *
 * Fired by `markConversationRead` on the reader's own `dm:inbox:<userId>`
 * channel whenever one or more rows actually flipped from unread → read.
 * Listeners (`UnreadBadge`, `ConversationList`) re-query their server action
 * instead of forcing a `router.refresh()` on the (main) layout. This is the
 * surgical alternative to blanket revalidation.
 */
export const DM_READ_EVENT = 'dm:read' as const;

export interface DmReadBroadcast {
  conversationId: string;
  readAt: string;
}
