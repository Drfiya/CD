'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { startConversationSchema } from '@/lib/validations/dm';

// ---------------------------------------------------------------------------
// Inbox pagination constants + cursor helpers
// ---------------------------------------------------------------------------

const INBOX_TAKE = 20;

type CursorPayload = {
  /** lastMessageAt ISO string, or null for conversations without messages. */
  lat: string | null;
  /** createdAt ISO string — secondary sort key for tie-breaking. */
  cat: string;
  /** Conversation id — final tie-breaker. */
  id: string;
};

function encodeCursor(lat: Date | null, cat: Date, id: string): string {
  const payload: CursorPayload = { lat: lat?.toISOString() ?? null, cat: cat.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!raw || typeof raw.id !== 'string' || typeof raw.cat !== 'string') return null;
    return { lat: typeof raw.lat === 'string' ? raw.lat : null, cat: raw.cat, id: raw.id };
  } catch {
    return null;
  }
}

// Raw row shape returned by the $queryRaw LATERAL JOIN in getConversationList.
interface ConvRow {
  id: string;
  userAId: string;
  userBId: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  ua_id: string;
  ua_name: string | null;
  ua_image: string | null;
  ub_id: string;
  ub_name: string | null;
  ub_image: string | null;
  lm_body: string | null;
  lm_created_at: Date | null;
  lm_sender_id: string | null;
  lm_attachment_mime: string | null;
}

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
    /** Round 6 / A2 — MIME of the last message's attachment, if any. */
    attachmentMime: string | null;
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
 * List conversations for the caller, sorted by `lastMessageAt` DESC NULLS LAST.
 * Returns a page of `INBOX_TAKE` items plus an opaque `nextCursor` for
 * continuation. Returns `{ items: [], nextCursor: null }` when the inbox is
 * empty or there are no more pages.
 *
 * A3 — Uses a single `$queryRaw` with a LATERAL subquery to fetch the last
 * message per conversation in one round-trip instead of N+1.
 */
export async function getConversationList(
  opts?: { cursor?: string },
): Promise<{ items: ConversationListItem[]; nextCursor: string | null }> {
  const session = await requireAuth();
  const me = session.user.id;

  const decoded = opts?.cursor ? decodeCursor(opts.cursor) : null;

  // Build the cursor WHERE fragment for keyset pagination.
  // Sort order: lastMessageAt DESC NULLS LAST, createdAt DESC, id DESC.
  const cursorWhere: Prisma.Sql = decoded === null
    ? Prisma.empty
    : decoded.lat !== null
      ? Prisma.sql`AND (
          c."lastMessageAt" < ${new Date(decoded.lat)}::timestamptz
          OR (c."lastMessageAt" = ${new Date(decoded.lat)}::timestamptz AND c."createdAt" < ${new Date(decoded.cat)}::timestamptz)
          OR (c."lastMessageAt" = ${new Date(decoded.lat)}::timestamptz AND c."createdAt" = ${new Date(decoded.cat)}::timestamptz AND c.id < ${decoded.id})
          OR c."lastMessageAt" IS NULL
        )`
      : Prisma.sql`AND (
          c."lastMessageAt" IS NULL
          AND (
            c."createdAt" < ${new Date(decoded.cat)}::timestamptz
            OR (c."createdAt" = ${new Date(decoded.cat)}::timestamptz AND c.id < ${decoded.id})
          )
        )`;

  // Fetch INBOX_TAKE + 1 so we can detect whether a next page exists.
  const rows = await db.$queryRaw<ConvRow[]>`
    SELECT
      c.id,
      c."userAId",
      c."userBId",
      c."lastMessageAt",
      c."createdAt",
      ua.id        AS ua_id,
      ua.name      AS ua_name,
      ua.image     AS ua_image,
      ub.id        AS ub_id,
      ub.name      AS ub_name,
      ub.image     AS ub_image,
      lm.body           AS lm_body,
      lm."createdAt"    AS lm_created_at,
      lm."senderId"     AS lm_sender_id,
      lm."attachmentMime" AS lm_attachment_mime
    FROM "Conversation" c
    INNER JOIN "User" ua ON ua.id = c."userAId"
    INNER JOIN "User" ub ON ub.id = c."userBId"
    LEFT JOIN LATERAL (
      SELECT m.body, m."createdAt", m."senderId", m."attachmentMime"
      FROM "Message" m
      WHERE m."conversationId" = c.id
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) lm ON true
    WHERE (c."userAId" = ${me} OR c."userBId" = ${me})
    ${cursorWhere}
    ORDER BY c."lastMessageAt" DESC NULLS LAST, c."createdAt" DESC, c.id DESC
    LIMIT ${INBOX_TAKE + 1}
  `;

  if (rows.length === 0) return { items: [], nextCursor: null };

  const hasMore = rows.length > INBOX_TAKE;
  const page = hasMore ? rows.slice(0, INBOX_TAKE) : rows;

  // Load blocks and unread counts in parallel — neither depends on the other.
  const [myBlocks, counts] = await Promise.all([
    db.dmBlock.findMany({
      where: { blockerId: me },
      select: { blockedId: true },
    }),
    db.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: page.map((r) => r.id) },
        senderId: { not: me },
        readAt: null,
      },
      _count: { _all: true },
    }),
  ]);

  const blockedSet = new Set(myBlocks.map((b) => b.blockedId));
  const unreadByConv = new Map(counts.map((c) => [c.conversationId, c._count._all]));

  const items = page
    .map((r) => {
      // Mirror the original ORM logic: userAId === me → other is userB.
      const other =
        r.userAId === me
          ? { id: r.ub_id, name: r.ub_name, image: r.ub_image }
          : { id: r.ua_id, name: r.ua_name, image: r.ua_image };
      return {
        id: r.id,
        otherUser: other,
        lastMessage:
          r.lm_sender_id !== null
            ? {
                body: r.lm_body ?? '',
                createdAt: r.lm_created_at!,
                senderId: r.lm_sender_id,
                attachmentMime: r.lm_attachment_mime ?? null,
              }
            : null,
        unreadCount: unreadByConv.get(r.id) ?? 0,
        lastMessageAt: r.lastMessageAt,
      };
    })
    .filter((c) => !blockedSet.has(c.otherUser.id));

  const lastRow = page[page.length - 1];
  const nextCursor = hasMore
    ? encodeCursor(lastRow.lastMessageAt, lastRow.createdAt, lastRow.id)
    : null;

  return { items, nextCursor };
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
    // NOTE: .reverse() mutates `messages` in place. After the call above,
    // messages[0] is the OLDEST message in the page (lowest createdAt).
    // The cursor points here so the next `createdAt < cursor` fetch returns
    // the preceding batch with no overlap.
    nextCursor: messages.length === limit ? messages[0]?.createdAt.toISOString() ?? null : null,
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
