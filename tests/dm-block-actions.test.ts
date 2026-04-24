import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState: { userId: string | null } = { userId: 'alice' };

vi.mock('@/lib/auth-guards', () => ({
  requireAuth: vi.fn(async () => {
    if (!authState.userId) throw new Error('Unauthorized');
    return { user: { id: authState.userId } };
  }),
}));

type Block = { id: string; blockerId: string; blockedId: string };

const state = { blocks: [] as Block[] };

vi.mock('@/lib/db', () => ({
  default: {
    dmBlock: {
      upsert: vi.fn(async ({ where, create }: {
        where: { blockerId_blockedId: { blockerId: string; blockedId: string } };
        create: { blockerId: string; blockedId: string };
      }) => {
        const existing = state.blocks.find(
          (b) => b.blockerId === where.blockerId_blockedId.blockerId && b.blockedId === where.blockerId_blockedId.blockedId,
        );
        if (existing) return existing;
        const b: Block = { id: `block_${state.blocks.length + 1}`, ...create };
        state.blocks.push(b);
        return b;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { blockerId: string; blockedId: string } }) => {
        const before = state.blocks.length;
        state.blocks = state.blocks.filter(
          (b) => !(b.blockerId === where.blockerId && b.blockedId === where.blockedId),
        );
        return { count: before - state.blocks.length };
      }),
      findUnique: vi.fn(async ({ where }: { where: { blockerId_blockedId: { blockerId: string; blockedId: string } } }) =>
        state.blocks.find(
          (b) => b.blockerId === where.blockerId_blockedId.blockerId && b.blockedId === where.blockerId_blockedId.blockedId,
        ) ?? null,
      ),
    },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { blockUser, unblockUser, getBlockStatus } = await import('@/lib/dm-block-actions');

describe('blockUser / unblockUser', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.blocks = [];
  });

  it('creates a block row', async () => {
    const result = await blockUser({ targetUserId: 'bob' });
    expect(result).toEqual({ success: true });
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toMatchObject({ blockerId: 'alice', blockedId: 'bob' });
  });

  it('rejects blocking yourself', async () => {
    const result = await blockUser({ targetUserId: 'alice' });
    expect(result).toEqual({ error: 'Cannot block yourself' });
    expect(state.blocks).toHaveLength(0);
  });

  it('is idempotent on double-block (upsert)', async () => {
    await blockUser({ targetUserId: 'bob' });
    await blockUser({ targetUserId: 'bob' });
    expect(state.blocks).toHaveLength(1);
  });

  it('unblock removes the row', async () => {
    await blockUser({ targetUserId: 'bob' });
    await unblockUser({ targetUserId: 'bob' });
    expect(state.blocks).toHaveLength(0);
  });

  it('unblock is idempotent when nothing is blocked', async () => {
    const result = await unblockUser({ targetUserId: 'bob' });
    expect(result).toEqual({ success: true });
  });
});

describe('getBlockStatus', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.blocks = [];
  });

  it('reports iBlocked when the caller has blocked the target', async () => {
    state.blocks = [{ id: 'b1', blockerId: 'alice', blockedId: 'bob' }];
    const s = await getBlockStatus('bob');
    expect(s).toEqual({ iBlocked: true, theyBlocked: false });
  });

  it('reports theyBlocked when the target has blocked the caller', async () => {
    state.blocks = [{ id: 'b1', blockerId: 'bob', blockedId: 'alice' }];
    const s = await getBlockStatus('bob');
    expect(s).toEqual({ iBlocked: false, theyBlocked: true });
  });

  it('returns both false when no block exists', async () => {
    const s = await getBlockStatus('bob');
    expect(s).toEqual({ iBlocked: false, theyBlocked: false });
  });

  it('reports both false when querying self', async () => {
    const s = await getBlockStatus('alice');
    expect(s).toEqual({ iBlocked: false, theyBlocked: false });
  });
});
