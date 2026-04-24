import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState: { userId: string | null } = { userId: 'alice' };

vi.mock('@/lib/auth-guards', () => ({
  requireAuth: vi.fn(async () => {
    if (!authState.userId) throw new Error('Unauthorized');
    return { user: { id: authState.userId } };
  }),
}));

// Rate limit mock — controllable per-test
const rlState = { allowed: true, remaining: 29, resetTime: Date.now() + 60_000 };
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimitAsync: vi.fn(async () => ({
    allowed: rlState.allowed,
    remaining: rlState.remaining,
    resetTime: rlState.resetTime,
  })),
}));

// Supabase admin broadcast mock — records calls, never makes network
const broadcastCalls: Array<{ channel: string; payload: unknown }> = [];
const supabaseStorageRemoveCalls: Array<{ paths: string[] }> = [];
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    channel: (channel: string) => ({
      send: async ({ payload }: { payload: unknown }) => {
        broadcastCalls.push({ channel, payload });
      },
    }),
    removeChannel: vi.fn(),
    // Round 3 / Item 5 — storage surface needed because sendMessage now calls
    // finaliseAttachment internally, which reaches into supabase.storage.
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          supabaseStorageRemoveCalls.push({ paths });
          return { data: null, error: null };
        },
      }),
    },
  })),
}));

type Convo = { id: string; userAId: string; userBId: string };
type Block = { blockerId: string; blockedId: string };
type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  clientMessageId: string | null;
  createdAt: Date;
  readAt: Date | null;
  attachmentPath?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  attachmentName?: string | null;
};

const state = {
  conversations: [] as Convo[],
  blocks: [] as Block[],
  messages: [] as Message[],
  updateManyCalls: 0,
  // Round 2 / B1 — when true, `message.create` throws a Prisma P2002 error
  // on the NEXT call with a clientMessageId that matches an existing row.
  enforceClientMessageIdUnique: false,
};

vi.mock('@/lib/db', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.conversations.find((c) => c.id === where.id) ?? null,
      ),
      update: vi.fn(async () => ({})),
    },
    dmBlock: {
      findFirst: vi.fn(async ({ where }: { where: { OR: Array<Block> } }) => {
        for (const clause of where.OR) {
          const hit = state.blocks.find(
            (b) => b.blockerId === clause.blockerId && b.blockedId === clause.blockedId,
          );
          if (hit) return hit;
        }
        return null;
      }),
    },
    message: {
      create: vi.fn(async ({ data }: { data: Omit<Message, 'id' | 'readAt'> }) => {
        // Round 2 / B1 — simulate the partial unique index on
        // (clientMessageId, senderId) WHERE clientMessageId IS NOT NULL.
        if (
          state.enforceClientMessageIdUnique &&
          data.clientMessageId &&
          state.messages.some(
            (existing) =>
              existing.clientMessageId === data.clientMessageId &&
              existing.senderId === data.senderId,
          )
        ) {
          const err = new Error(
            'Unique constraint failed on the fields: (`clientMessageId`,`senderId`)',
          ) as Error & { code?: string };
          err.code = 'P2002';
          throw err;
        }
        const m: Message = {
          id: `msg_${state.messages.length + 1}`,
          readAt: null,
          ...data,
        };
        state.messages.push(m);
        return m;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { clientMessageId: string; senderId: string };
        }) =>
          state.messages.find(
            (m) =>
              m.clientMessageId === where.clientMessageId &&
              m.senderId === where.senderId,
          ) ?? null,
      ),
      updateMany: vi.fn(async ({ where }: { where: { conversationId: string; senderId: { not: string }; readAt: null } }) => {
        state.updateManyCalls++;
        let count = 0;
        for (const m of state.messages) {
          if (
            m.conversationId === where.conversationId &&
            m.senderId !== where.senderId.not &&
            m.readAt === null
          ) {
            m.readAt = new Date();
            count++;
          }
        }
        return { count };
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { sendMessage, markConversationRead } = await import('@/lib/message-actions');

describe('sendMessage', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.conversations = [{ id: 'conv1', userAId: 'alice', userBId: 'bob' }];
    state.blocks = [];
    state.messages = [];
    state.updateManyCalls = 0;
    state.enforceClientMessageIdUnique = false;
    rlState.allowed = true;
    rlState.remaining = 29;
    rlState.resetTime = Date.now() + 60_000;
    broadcastCalls.length = 0;
  });

  it('persists a message on the happy path', async () => {
    const result = await sendMessage({ conversationId: 'conv1', body: 'hello' });
    expect('message' in result).toBe(true);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ senderId: 'alice', body: 'hello' });
  });

  it('broadcasts to the recipient inbox channel after persist', async () => {
    await sendMessage({ conversationId: 'conv1', body: 'hello' });
    expect(broadcastCalls).toHaveLength(1);
    expect(broadcastCalls[0].channel).toBe('dm:inbox:bob');
  });

  it('rejects when rate-limited', async () => {
    rlState.allowed = false;
    rlState.resetTime = Date.now() + 30_000;
    const result = await sendMessage({ conversationId: 'conv1', body: 'spam' });
    expect(result).toMatchObject({ error: 'rate_limited' });
    expect(state.messages).toHaveLength(0);
  });

  it('rejects when the caller has blocked the recipient', async () => {
    state.blocks = [{ blockerId: 'alice', blockedId: 'bob' }];
    const result = await sendMessage({ conversationId: 'conv1', body: 'hi' });
    expect(result).toEqual({ error: 'Cannot send to this user' });
    expect(state.messages).toHaveLength(0);
  });

  it('rejects when the recipient has blocked the caller', async () => {
    state.blocks = [{ blockerId: 'bob', blockedId: 'alice' }];
    const result = await sendMessage({ conversationId: 'conv1', body: 'hi' });
    expect(result).toEqual({ error: 'Cannot send to this user' });
    expect(state.messages).toHaveLength(0);
  });

  it('rejects when caller is not a participant', async () => {
    authState.userId = 'eve';
    const result = await sendMessage({ conversationId: 'conv1', body: 'snoop' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('trims whitespace-only bodies and rejects them', async () => {
    const result = await sendMessage({ conversationId: 'conv1', body: '   \n  ' });
    expect('error' in result).toBe(true);
    expect(state.messages).toHaveLength(0);
  });

  // Round 3 / Item 5 — attachment schema rejection happens in Zod, before
  // the rate-limit gate and before any DB write.
  it('rejects an attachment whose size exceeds the 10 MB cap (Zod guard)', async () => {
    const result = await sendMessage({
      conversationId: 'conv1',
      body: 'hi',
      attachment: {
        path: 'conv1/u/huge.png',
        mime: 'image/png',
        size: 11 * 1024 * 1024,
        name: 'huge.png',
      },
    });
    expect('error' in result).toBe(true);
    expect(state.messages).toHaveLength(0);
  });

  // Round 3 / Item 5 — text-only sends must still round-trip clientMessageId
  // idempotency even though the select now also pulls the four attachment
  // columns. Regression-guards the `messageSelect` change in message-actions.
  it('preserves idempotency for text-only retry with attachment select columns added', async () => {
    state.enforceClientMessageIdUnique = true;
    const input = {
      conversationId: 'conv1',
      body: 'hello',
      clientMessageId: '33333333-3333-4333-8333-333333333333',
    };
    const first = await sendMessage(input);
    const second = await sendMessage(input);
    expect('message' in first).toBe(true);
    expect('message' in second).toBe(true);
    if ('message' in first && 'message' in second && first.message && second.message) {
      expect(second.message.id).toBe(first.message.id);
    }
    expect(state.messages).toHaveLength(1);
  });

  // Round 2 / B1 — Previously the adversarial probe B8 asserted "both persist"
  // for a duplicate clientMessageId. The partial unique index + P2002 catch
  // in sendMessage flip that behaviour to idempotent: one DB row, both calls
  // return the same server row.
  it('is idempotent on duplicate clientMessageId (Round 2 / B1)', async () => {
    state.enforceClientMessageIdUnique = true;
    const first = await sendMessage({
      conversationId: 'conv1',
      body: 'hello',
      clientMessageId: '11111111-1111-4111-8111-111111111111',
    });
    const second = await sendMessage({
      conversationId: 'conv1',
      body: 'hello',
      clientMessageId: '11111111-1111-4111-8111-111111111111',
    });

    expect('message' in first).toBe(true);
    expect('message' in second).toBe(true);
    if ('message' in first && 'message' in second && first.message && second.message) {
      // Both calls resolve to the SAME row.
      expect(second.message.id).toBe(first.message.id);
      expect(second.message.clientMessageId).toBe(
        '11111111-1111-4111-8111-111111111111',
      );
    }
    // Exactly one row in the database.
    expect(state.messages).toHaveLength(1);
  });
});

describe('markConversationRead', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.conversations = [{ id: 'conv1', userAId: 'alice', userBId: 'bob' }];
    state.messages = [
      { id: 'm1', conversationId: 'conv1', senderId: 'bob', body: 'hi', clientMessageId: null, createdAt: new Date(), readAt: null },
      { id: 'm2', conversationId: 'conv1', senderId: 'bob', body: 'yo', clientMessageId: null, createdAt: new Date(), readAt: null },
      { id: 'm3', conversationId: 'conv1', senderId: 'alice', body: 'sup', clientMessageId: null, createdAt: new Date(), readAt: null },
    ];
    state.updateManyCalls = 0;
    broadcastCalls.length = 0;
  });

  it('marks only the other party’s unread messages as read', async () => {
    const result = await markConversationRead({ conversationId: 'conv1' });
    expect(result).toEqual({ marked: 2 });
    // alice's own message m3 stays unread
    expect(state.messages.find((m) => m.id === 'm3')?.readAt).toBeNull();
    expect(state.messages.find((m) => m.id === 'm1')?.readAt).not.toBeNull();
  });

  it('is idempotent — a second call marks 0', async () => {
    await markConversationRead({ conversationId: 'conv1' });
    const second = await markConversationRead({ conversationId: 'conv1' });
    expect(second).toEqual({ marked: 0 });
  });

  it('rejects callers who are not participants', async () => {
    authState.userId = 'eve';
    const result = await markConversationRead({ conversationId: 'conv1' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  // Round 2 / A2 — Replaces the old revalidatePath() path. When rows actually
  // flip, fire a DM_READ_EVENT broadcast on the reader's own inbox channel
  // so the UnreadBadge + ConversationList can re-query surgically.
  it('fires DM_READ_EVENT broadcast when rows were flipped', async () => {
    const result = await markConversationRead({ conversationId: 'conv1' });
    expect(result).toEqual({ marked: 2 });
    // Single broadcast on the reader's own inbox channel.
    expect(broadcastCalls).toHaveLength(1);
    expect(broadcastCalls[0].channel).toBe('dm:inbox:alice');
    const payload = broadcastCalls[0].payload as {
      conversationId: string;
      readAt: string;
    };
    expect(payload.conversationId).toBe('conv1');
    expect(typeof payload.readAt).toBe('string');
    // ISO 8601 shape check (cheap sanity).
    expect(new Date(payload.readAt).toString()).not.toBe('Invalid Date');
  });

  it('does NOT fire DM_READ_EVENT broadcast when no rows flipped (idempotent second call)', async () => {
    await markConversationRead({ conversationId: 'conv1' });
    broadcastCalls.length = 0;
    const second = await markConversationRead({ conversationId: 'conv1' });
    expect(second).toEqual({ marked: 0 });
    expect(broadcastCalls).toHaveLength(0);
  });
});
