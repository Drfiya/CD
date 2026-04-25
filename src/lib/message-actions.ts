'use server';

import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';
import {
  sendMessageSchema,
  markReadSchema,
  type AttachmentMetadata,
} from '@/lib/validations/dm';
import { checkRateLimitAsync } from '@/lib/api/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { finaliseAttachment } from '@/lib/dm-attachment-actions';
import {
  dmInboxChannel,
  DM_INBOX_EVENT,
  DM_READ_EVENT,
  type DmInboxBroadcast,
  type DmReadBroadcast,
} from '@/lib/dm-realtime';
import { sendDmEmailNotification } from '@/lib/dm-email';

const DM_SEND_LIMIT = 30;
const DM_SEND_WINDOW_MS = 60_000;

/**
 * Fire-and-forget broadcast to the recipient's inbox channel. Any failure is
 * swallowed — the message is already persisted, and the recipient's client
 * still has polling/subscription fallbacks.
 */
async function broadcastInboxHint(payload: DmInboxBroadcast, recipientId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(dmInboxChannel(recipientId));
    await channel.send({
      type: 'broadcast',
      event: DM_INBOX_EVENT,
      payload,
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('[dm] broadcastInboxHint failed (non-fatal):', err);
  }
}

/**
 * Round 2 / A2 — Fire a `dm:read` broadcast on the reader's own inbox channel
 * after `markConversationRead` flipped one or more rows. The reader's own
 * `UnreadBadge` + `ConversationList` listen and re-query surgically instead
 * of forcing a layout-wide `router.refresh()`.
 */
async function broadcastReadHint(payload: DmReadBroadcast, readerId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(dmInboxChannel(readerId));
    await channel.send({
      type: 'broadcast',
      event: DM_READ_EVENT,
      payload,
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('[dm] broadcastReadHint failed (non-fatal):', err);
  }
}

export async function sendMessage(input: {
  conversationId: string;
  body: string;
  clientMessageId?: string;
  attachment?: AttachmentMetadata;
}) {
  const session = await requireAuth();
  const me = session.user.id;

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid message' as const };
  }
  const { conversationId, body, clientMessageId, attachment } = parsed.data;

  // Rate limit — 30 messages per 60s per user, Upstash-backed when configured
  const rl = await checkRateLimitAsync({
    scope: 'dm-send',
    limit: DM_SEND_LIMIT,
    windowMs: DM_SEND_WINDOW_MS,
    userId: me,
    req: new Request('http://localhost'),
  });
  if (!rl.allowed) {
    return {
      error: 'rate_limited' as const,
      retryAfterSec: Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000)),
    };
  }

  // Load conversation + verify participation
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userAId: true, userBId: true },
  });
  if (!conv) return { error: 'Conversation not found' as const };
  if (conv.userAId !== me && conv.userBId !== me) return { error: 'Unauthorized' as const };

  const recipientId = conv.userAId === me ? conv.userBId : conv.userAId;

  // Block enforcement — either direction prevents sending
  const block = await db.dmBlock.findFirst({
    where: {
      OR: [
        { blockerId: me, blockedId: recipientId },
        { blockerId: recipientId, blockedId: me },
      ],
    },
    select: { id: true },
  });
  if (block) return { error: 'Cannot send to this user' as const };

  // Round 3 / Item 5 — Re-verify the uploaded attachment BEFORE any DB write.
  // `finaliseAttachment` downloads the first bytes via service-role Range
  // request, validates magic bytes + size, and deletes the object on
  // mismatch. Called here (not client-side) so the client cannot claim a
  // finalised state it did not actually achieve.
  if (attachment) {
    const fin = await finaliseAttachment({
      conversationId,
      path: attachment.path,
      expectedMime: attachment.mime,
      expectedSize: attachment.size,
    });
    if ('error' in fin) {
      return { error: fin.error };
    }
  }

  // Persist + bump conversation `lastMessageAt` in a single transaction.
  //
  // Round 2 / B1 — Idempotency on duplicate `clientMessageId`.
  // A partial unique index on `(clientMessageId, senderId) WHERE clientMessageId
  // IS NOT NULL` (see `20260425_dm_client_message_id_unique/migration.sql`)
  // makes a second insert with the same `(clientMessageId, senderId)` pair
  // fail with Prisma `P2002`. That is the retry happy-path: return the
  // authoritative row instead of erroring out.
  const now = new Date();
  const messageSelect = {
    id: true,
    conversationId: true,
    senderId: true,
    body: true,
    clientMessageId: true,
    createdAt: true,
    readAt: true,
    attachmentPath: true,
    attachmentMime: true,
    attachmentSize: true,
    attachmentName: true,
  } as const;

  type PersistedMessage = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    clientMessageId: string | null;
    createdAt: Date;
    readAt: Date | null;
    attachmentPath: string | null;
    attachmentMime: string | null;
    attachmentSize: number | null;
    attachmentName: string | null;
  };

  let message: PersistedMessage;
  try {
    [message] = await db.$transaction([
      db.message.create({
        data: {
          conversationId,
          senderId: me,
          body,
          clientMessageId: clientMessageId ?? null,
          createdAt: now,
          attachmentPath: attachment?.path ?? null,
          attachmentMime: attachment?.mime ?? null,
          attachmentSize: attachment?.size ?? null,
          attachmentName: attachment?.name ?? null,
        },
        select: messageSelect,
      }),
      db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
    ]);
  } catch (err) {
    // P2002 == Prisma unique constraint violation. The only unique constraint
    // that can hit on Message INSERT is the partial index on
    // `(clientMessageId, senderId)` — so treat it as a retried send and
    // idempotently return the existing row.
    if (
      clientMessageId &&
      err instanceof Error &&
      'code' in err &&
      (err as { code?: unknown }).code === 'P2002'
    ) {
      const existing = await db.message.findFirst({
        where: { clientMessageId, senderId: me },
        select: messageSelect,
      });
      if (existing) {
        return { message: existing };
      }
    }
    throw err;
  }

  // Broadcast to the recipient's inbox for live badge / inbox refresh.
  // The per-conversation Realtime INSERT fires automatically from Postgres
  // Changes — no extra work here.
  void broadcastInboxHint(
    {
      conversationId,
      messageId: message.id,
      senderId: me,
      createdAtISO: message.createdAt.toISOString(),
    },
    recipientId,
  );

  // Round 6 / B2 — Fire-and-forget email fallback for offline recipients.
  // sendDmEmailNotification catches all errors internally; it never rejects.
  // The sender's response is not delayed — email is dispatched asynchronously.
  void sendDmEmailNotification({
    conversationId,
    recipientId,
    senderName: session.user.name ?? null,
    messagePreview: body || '📎 Attachment',
  });

  return { message };
}

/**
 * Mark all unread messages sent by the *other* user in a conversation as read.
 * Idempotent — running twice does nothing. Returns the count of rows that
 * actually flipped to read, so the UI can decrement its badge precisely.
 */
export async function markConversationRead(input: { conversationId: string }) {
  const session = await requireAuth();
  const me = session.user.id;

  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid conversation id' as const };

  const { conversationId } = parsed.data;

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!conv) return { error: 'Conversation not found' as const };
  if (conv.userAId !== me && conv.userBId !== me) return { error: 'Unauthorized' as const };

  const readAt = new Date();
  const result = await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: me },
      readAt: null,
    },
    data: { readAt },
  });

  if (result.count > 0) {
    // Surgical live update — UnreadBadge + ConversationList listen for this
    // broadcast and re-query. No `router.refresh()` → no (main) layout-wide
    // revalidation triggered by opening a conversation.
    void broadcastReadHint(
      { conversationId, readAt: readAt.toISOString() },
      me,
    );
  }

  return { marked: result.count };
}
