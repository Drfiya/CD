import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const authState: { userId: string | null } = { userId: 'alice' };

vi.mock('@/lib/auth-guards', () => ({
  requireAuth: vi.fn(async () => {
    if (!authState.userId) throw new Error('Unauthorized');
    return { user: { id: authState.userId } };
  }),
}));

type MsgRow = {
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

const state = {
  messages: [] as MsgRow[],
  conversations: [] as Array<{
    id: string;
    userAId: string;
    userBId: string;
    createdAt: Date;
    updatedAt: Date;
    userA: { id: string; name: string | null; image: string | null };
    userB: { id: string; name: string | null; image: string | null };
  }>,
  blocks: [] as Array<{ blockerId: string; blockedId: string }>,
};

vi.mock('@/lib/db', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.conversations.find((c) => c.id === where.id) ?? null,
      ),
    },
    dmBlock: {
      findUnique: vi.fn(
        async ({ where }: { where: { blockerId_blockedId: { blockerId: string; blockedId: string } } }) => {
          const { blockerId, blockedId } = where.blockerId_blockedId;
          return (
            state.blocks.find((b) => b.blockerId === blockerId && b.blockedId === blockedId) ?? null
          );
        },
      ),
    },
    message: {
      findMany: vi.fn(
        async ({
          where,
          orderBy,
          take,
        }: {
          where: { conversationId: string; createdAt?: { lt: Date } };
          orderBy: { createdAt: 'asc' | 'desc' };
          take: number;
        }) => {
          let rows = state.messages.filter((m) => m.conversationId === where.conversationId);
          if (where.createdAt?.lt) {
            rows = rows.filter((m) => m.createdAt < where.createdAt!.lt!);
          }
          rows.sort((a, b) =>
            orderBy.createdAt === 'desc'
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : a.createdAt.getTime() - b.createdAt.getTime(),
          );
          return rows.slice(0, take);
        },
      ),
    },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { getConversation } = await import('@/lib/conversation-actions');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(id: string, convId: string, offsetMs: number): MsgRow {
  return {
    id,
    conversationId: convId,
    senderId: 'alice',
    body: `Message ${id}`,
    clientMessageId: null,
    createdAt: new Date(1_000_000 + offsetMs),
    readAt: null,
    attachmentPath: null,
    attachmentMime: null,
    attachmentSize: null,
    attachmentName: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConversation — message history pagination', () => {
  const CONV_ID = 'conv_1';

  beforeEach(() => {
    authState.userId = 'alice';
    state.blocks = [];
    state.conversations = [
      {
        id: CONV_ID,
        userAId: 'alice',
        userBId: 'bob',
        createdAt: new Date(1_000_000),
        updatedAt: new Date(1_000_000),
        userA: { id: 'alice', name: 'Alice', image: null },
        userB: { id: 'bob', name: 'Bob', image: null },
      },
    ];
    // 70 messages, oldest = offset 0, newest = offset 69_000
    state.messages = Array.from({ length: 70 }, (_, i) => makeMessage(`msg_${i}`, CONV_ID, i * 1_000));
  });

  it('returns the 50 most recent messages on first load (no cursor)', async () => {
    const result = await getConversation(CONV_ID);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.messages).toHaveLength(50);
    // Returned chronological (oldest-first)
    const ids = result.messages.map((m) => m.id);
    // Oldest in the page is msg_20 (70 - 50 = 20th), newest is msg_69
    expect(ids[0]).toBe('msg_20');
    expect(ids[49]).toBe('msg_69');
  });

  it('returns a nextCursor when there are more messages', async () => {
    const result = await getConversation(CONV_ID);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns null nextCursor when all messages fit in the limit', async () => {
    state.messages = state.messages.slice(-10); // only 10 messages
    const result = await getConversation(CONV_ID);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.nextCursor).toBeNull();
  });

  it('loads the preceding page when cursor is provided', async () => {
    const page1 = await getConversation(CONV_ID);
    expect('error' in page1).toBe(false);
    if ('error' in page1) return;

    const cursor = page1.nextCursor;
    expect(cursor).not.toBeNull();

    const page2 = await getConversation(CONV_ID, { cursor: cursor! });
    expect('error' in page2).toBe(false);
    if ('error' in page2) return;

    expect(page2.messages.length).toBeGreaterThan(0);
    // Page 2 must contain ONLY messages older than page 1's oldest
    const page1OldestTime = page1.messages[0].createdAt.getTime();
    for (const m of page2.messages) {
      expect(m.createdAt.getTime()).toBeLessThan(page1OldestTime);
    }
  });

  it('two consecutive pages cover all 70 messages without duplicates', async () => {
    const page1 = await getConversation(CONV_ID);
    if ('error' in page1) throw new Error('page1 failed');

    const page2 = await getConversation(CONV_ID, { cursor: page1.nextCursor! });
    if ('error' in page2) throw new Error('page2 failed');

    const allIds = [...page1.messages, ...page2.messages].map((m) => m.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length); // no duplicates
    expect(unique.size).toBe(70); // all 70 messages covered
  });

  it('cursor points to the OLDEST message in the page (no overlap on load-more)', async () => {
    const page1 = await getConversation(CONV_ID);
    if ('error' in page1) throw new Error();

    const page2 = await getConversation(CONV_ID, { cursor: page1.nextCursor! });
    if ('error' in page2) throw new Error();

    const page1Ids = new Set(page1.messages.map((m) => m.id));
    for (const m of page2.messages) {
      expect(page1Ids.has(m.id)).toBe(false);
    }
  });

  it('returns error for a conversation the caller does not participate in', async () => {
    authState.userId = 'charlie';
    const result = await getConversation(CONV_ID);
    expect('error' in result).toBe(true);
  });
});
