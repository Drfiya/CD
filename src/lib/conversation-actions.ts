'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';
import { startConversationSchema } from '@/lib/validations/dm';

/**
 * Return the canonical `[userA, userB]` pair for a DM conversation.
 * Ordering is lexicographic so the same unordered pair always maps to the
 * same row via `@@unique([userAId, userBId])`.
 */
function canonicalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

export interface ConversationListItem {
  id: string;
  otherUser: {
    id: string;
    name: string | null;
    image: string | null;
  };
  lastMessage: {
    body: string;
    createdAt: Date;
    senderId: string;
  } | null;
  unreadCount: number;
  lastMessageAt: Date | null;
}

/**
 * Resolve (or create) the 1:1 conversation between the caller and `otherUserId`.
 * Returns the `conversationId` so the UI can navigate to `/messages/[id]`.
 *
 * Safety:
 * - Blocks itself (`otherUserId === me.id`) → error
 * - Rejects if either user has blocked the other (two-way check)
 */
export async function startOrGetConversation(input: { otherUserId: string }) {
  const session = await requireAuth();
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Invalid user id' as const };
  }
  const me = session.user.id;
  const other = parsed.data.otherUserId;

  if (me === other) {
    return { error: 'Cannot message yourself' as const };
  }

  // Two-way block check. Either direction disallows DMs.
  const block = await db.dmBlock.findFirst({
    where: {
      OR: [
        { blockerId: me, blockedId: other },
        { blockerId: other, blockedId: me },
      ],
    },
    select: { id: true },
  });
  if (block) {
    return { error: 'Cannot start conversation with this user' as const };
  }

  // Make sure the other user exists (and is not the current user)
  const otherExists = await db.user.findUnique({ where: { id: other }, select: { id: true } });
  if (!otherExists) {
    return { error: 'User not found' as const };
  }

  const [userAId, userBId] = canonicalPair(me, other);

  const conversation = await db.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
    select: { id: true },
  });

  revalidatePath('/messages');
  return { conversationId: conversation.id };
}

/**
 * List all conversations for the caller, sorted by `lastMessageAt` desc.
 * Filters out conversations where the caller has blocked the counterparty
 * (brief §2.1: "bestehende Conversation wird für Blocker ausgeblendet").
 */
export async function getConversationList(): Promise<ConversationListItem[]> {
  const session = await requireAuth();
  const me = session.user.id;

  // Conversations where I am either userA or userB
  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ userAId: me }, { userBId: me }],
    },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      userAId: true,
      userBId: true,
      lastMessageAt: true,
      userA: { select: { id: true, name: true, image: true } },
      userB: { select: { id: true, name: true, image: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  if (conversations.length === 0) return [];

  // Load my outgoing blocks once, for filtering
  const myBlocks = await db.dmBlock.findMany({
    where: { blockerId: me },
    select: { blockedId: true },
  });
  const blockedSet = new Set(myBlocks.map((b) => b.blockedId));

  // Batch unread counts per conversation
  const counts = await db.message.groupBy({
    by: ['conversationId'],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: me },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadByConv = new Map(counts.map((c) => [c.conversationId, c._count._all]));

  return conversations
    .map((c) => {
      const other = c.userAId === me ? c.userB : c.userA;
      return {
        id: c.id,
        otherUser: other,
        lastMessage: c.messages[0] ?? null,
        unreadCount: unreadByConv.get(c.id) ?? 0,
        lastMessageAt: c.lastMessageAt,
      };
    })
    .filter((c) => !blockedSet.has(c.otherUser.id));
}

/**
 * Load a single conversation's metadata plus its message history (newest-first
 * paginated with a cursor on `createdAt`). Used by `/messages/[id]`.
 */
export async function getConversation(conversationId: string, opts?: { cursor?: string; limit?: number }) {
  const session = await requireAuth();
  const me = session.user.id;
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      userA: { select: { id: true, name: true, image: true } },
      userB: { select: { id: true, name: true, image: true } },
    },
  });
  if (!conv) return { error: 'Conversation not found' as const };

  // Ownership check — the caller must be a participant
  if (conv.userAId !== me && conv.userBId !== me) {
    return { error: 'Unauthorized' as const };
  }

  const other = conv.userAId === me ? conv.userB : conv.userA;

  // Hide the conversation if I've blocked the other party
  const iBlocked = await db.dmBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: me, blockedId: other.id } },
    select: { id: true },
  });
  if (iBlocked) return { error: 'Conversation not found' as const };

  // If the other party blocked me, conversation is read-only (we still show history)
  const theyBlocked = await db.dmBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: other.id, blockedId: me } },
    select: { id: true },
  });

  const messages = await db.message.findMany({
    where: {
      conversationId,
      ...(opts?.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      body: true,
      clientMessageId: true,
      createdAt: true,
      readAt: true,
      // Round 3 / Item 5 — select attachment metadata so the client can
      // render inline (or lazily fetch the signed URL).
      attachmentPath: true,
      attachmentMime: true,
      attachmentSize: true,
      attachmentName: true,
    },
  });

  return {
    conversation: {
      id: conv.id,
      otherUser: other,
      canSend: !theyBlocked,
    },
    messages: messages.reverse(), // return chronological (oldest-first)
    nextCursor: messages.length === limit ? messages[0]?.createdAt.toISOString() : null,
  };
}

/**
 * Global unread-message count across all of the caller's conversations.
 * Used by the header badge. Excludes conversations where the caller has
 * blocked the other party (those conversations are hidden — their unread
 * signals should not count).
 */
export async function getTotalUnreadCount(): Promise<number> {
  const session = await requireAuth();
  const me = session.user.id;

  const myBlocks = await db.dmBlock.findMany({
    where: { blockerId: me },
    select: { blockedId: true },
  });
  const blockedIds = myBlocks.map((b) => b.blockedId);

  return db.message.count({
    where: {
      senderId: { not: me },
      readAt: null,
      conversation: {
        OR: [
          { userAId: me, ...(blockedIds.length ? { userBId: { notIn: blockedIds } } : {}) },
          { userBId: me, ...(blockedIds.length ? { userAId: { notIn: blockedIds } } : {}) },
        ],
      },
    },
  });
}
