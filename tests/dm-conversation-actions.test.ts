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

type Convo = { id: string; userAId: string; userBId: string };
type Block = { blockerId: string; blockedId: string };

const state = {
  conversations: [] as Convo[],
  blocks: [] as Block[],
  users: new Set<string>(),
  upsertCalls: [] as { where: { userAId: string; userBId: string } }[],
};

vi.mock('@/lib/db', () => ({
  default: {
    dmBlock: {
      findFirst: vi.fn(async ({ where }: { where: { OR: Array<{ blockerId: string; blockedId: string }> } }) => {
        for (const clause of where.OR) {
          const hit = state.blocks.find(
            (b) => b.blockerId === clause.blockerId && b.blockedId === clause.blockedId,
          );
          if (hit) return hit;
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: { where: { blockerId: string } }) =>
        state.blocks.filter((b) => b.blockerId === where.blockerId),
      ),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.users.has(where.id) ? { id: where.id } : null,
      ),
    },
    conversation: {
      upsert: vi.fn(async ({ where, create }: {
        where: { userAId_userBId: { userAId: string; userBId: string } };
        create: { userAId: string; userBId: string };
      }) => {
        state.upsertCalls.push({ where: where.userAId_userBId });
        const existing = state.conversations.find(
          (c) => c.userAId === where.userAId_userBId.userAId && c.userBId === where.userAId_userBId.userBId,
        );
        if (existing) return { id: existing.id };
        const id = `conv_${state.conversations.length + 1}`;
        state.conversations.push({ id, ...create });
        return { id };
      }),
      findMany: vi.fn(async () => []),
    },
    message: {
      groupBy: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { startOrGetConversation } = await import('@/lib/conversation-actions');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startOrGetConversation', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.conversations = [];
    state.blocks = [];
    state.users = new Set(['alice', 'bob']);
    state.upsertCalls = [];
  });

  it('rejects self-messaging', async () => {
    const result = await startOrGetConversation({ otherUserId: 'alice' });
    expect(result).toEqual({ error: 'Cannot message yourself' });
  });

  it('uses canonical (lexicographic) ordering for the pair — alice,bob', async () => {
    authState.userId = 'alice';
    const result = await startOrGetConversation({ otherUserId: 'bob' });
    expect('conversationId' in result).toBe(true);
    expect(state.upsertCalls[0].where).toEqual({ userAId: 'alice', userBId: 'bob' });
  });

  it('uses canonical ordering when caller is the lexicographically greater user (bob → alice)', async () => {
    authState.userId = 'bob';
    const result = await startOrGetConversation({ otherUserId: 'alice' });
    expect('conversationId' in result).toBe(true);
    // Same canonical pair — NOT bob,alice
    expect(state.upsertCalls[0].where).toEqual({ userAId: 'alice', userBId: 'bob' });
  });

  it('returns the same conversation for both directions (idempotent by canonical pair)', async () => {
    authState.userId = 'alice';
    const first = await startOrGetConversation({ otherUserId: 'bob' });

    authState.userId = 'bob';
    const second = await startOrGetConversation({ otherUserId: 'alice' });

    expect('conversationId' in first).toBe(true);
    expect('conversationId' in second).toBe(true);
    if ('conversationId' in first && 'conversationId' in second) {
      expect(first.conversationId).toBe(second.conversationId);
    }
  });

  it('rejects when the other user has blocked the caller', async () => {
    state.blocks = [{ blockerId: 'bob', blockedId: 'alice' }];
    const result = await startOrGetConversation({ otherUserId: 'bob' });
    expect(result).toEqual({ error: 'Cannot start conversation with this user' });
  });

  it('rejects when the caller has blocked the other user', async () => {
    state.blocks = [{ blockerId: 'alice', blockedId: 'bob' }];
    const result = await startOrGetConversation({ otherUserId: 'bob' });
    expect(result).toEqual({ error: 'Cannot start conversation with this user' });
  });

  it('returns an error if the other user does not exist', async () => {
    const result = await startOrGetConversation({ otherUserId: 'ghost' });
    expect(result).toEqual({ error: 'User not found' });
  });

  it('throws when unauthenticated', async () => {
    authState.userId = null;
    await expect(startOrGetConversation({ otherUserId: 'bob' })).rejects.toThrow('Unauthorized');
  });
});
