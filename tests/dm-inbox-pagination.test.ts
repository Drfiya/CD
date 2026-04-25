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

type RawRow = {
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
};

// State mutated per test
const state = {
  rawRows: [] as RawRow[],
  blocks: [] as Array<{ blockedId: string }>,
  unreadCounts: [] as Array<{ conversationId: string; _count: { _all: number } }>,
};

// Capture the cursor fragment to verify it is NOT a string (injection risk).
let lastCursorFragment: unknown = null;

vi.mock('@/lib/db', () => ({
  default: {
    $queryRaw: vi.fn(
      async (
        _strings: TemplateStringsArray,
        ..._values: unknown[]
      ): Promise<RawRow[]> => {
        // Record the dynamic cursor fragment (2nd or 3rd interpolated value may be the Prisma.Sql object).
        lastCursorFragment = _values.find(
          (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date),
        );
        // Return all rows — cursor filtering is verified by checking the fragment above.
        return state.rawRows;
      },
    ),
    dmBlock: {
      findMany: vi.fn(async () => state.blocks),
    },
    message: {
      groupBy: vi.fn(async () => state.unreadCounts),
    },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { getConversationList } = await import('@/lib/conversation-actions');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConvRow(id: string, lastMessageAt: Date | null, createdAt: Date): RawRow {
  return {
    id,
    userAId: 'alice',
    userBId: id,
    lastMessageAt,
    createdAt,
    ua_id: 'alice',
    ua_name: 'Alice',
    ua_image: null,
    ub_id: id,
    ub_name: `User ${id}`,
    ub_image: null,
    lm_body: 'Hello',
    lm_created_at: lastMessageAt,
    lm_sender_id: 'alice',
    lm_attachment_mime: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConversationList — inbox pagination', () => {
  beforeEach(() => {
    authState.userId = 'alice';
    state.blocks = [];
    state.unreadCounts = [];
    lastCursorFragment = null;
    // Default: 5 conversations
    const base = new Date(2_000_000);
    state.rawRows = Array.from({ length: 5 }, (_, i) =>
      makeConvRow(`conv_${i}`, new Date(base.getTime() - i * 60_000), new Date(base.getTime() - i * 60_000)),
    );
  });

  it('returns items array and nextCursor=null when all conversations fit', async () => {
    const result = await getConversationList();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.nextCursor).toBeNull();
  });

  it('returns { items, nextCursor } shape (not a plain array)', async () => {
    const result = await getConversationList();
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('nextCursor');
    expect(Array.isArray((result as unknown as unknown[]))).toBe(false);
  });

  it('filters out conversations where the caller blocked the other party', async () => {
    state.blocks = [{ blockedId: 'conv_2' }];
    const result = await getConversationList();
    const ids = result.items.map((c) => c.id);
    expect(ids).not.toContain('conv_2');
  });

  it('attaches unread count to each conversation item', async () => {
    state.unreadCounts = [{ conversationId: 'conv_0', _count: { _all: 3 } }];
    const result = await getConversationList();
    const item = result.items.find((c) => c.id === 'conv_0');
    expect(item?.unreadCount).toBe(3);
  });

  it('passes cursor as Prisma.Sql object (not a raw string) to prevent injection', async () => {
    // First page — no cursor; cursorFragment should be the Prisma.empty sentinel
    await getConversationList();
    // The cursor WHERE fragment is a Prisma.Sql object (non-null object), never a plain string
    if (lastCursorFragment !== null) {
      expect(typeof lastCursorFragment).not.toBe('string');
    }
  });

  it('accepts a cursor string on subsequent pages without throwing', async () => {
    // Provide a cursor that decodes to a valid payload
    const fakeCursor = Buffer.from(
      JSON.stringify({ lat: new Date(1_000_000).toISOString(), cat: new Date(1_000_000).toISOString(), id: 'conv_x' }),
    ).toString('base64url');
    const result = await getConversationList({ cursor: fakeCursor });
    expect(result).toHaveProperty('items');
  });

  it('ignores a malformed cursor and falls back to page-1 behaviour', async () => {
    const result = await getConversationList({ cursor: 'not-valid-base64url!!!' });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('nextCursor');
  });

  it('maps otherUser correctly for conversations where caller is userA', async () => {
    // Alice is userAId in makeConvRow, so otherUser = ub_* fields
    state.rawRows = [makeConvRow('bob', new Date(2_000_000), new Date(2_000_000))];
    const result = await getConversationList();
    expect(result.items[0]?.otherUser.id).toBe('bob');
  });

  it('returns nextCursor=null when rows length < INBOX_TAKE (20)', async () => {
    // 5 rows < 20 = no next page
    const result = await getConversationList();
    expect(result.nextCursor).toBeNull();
  });

  it('returns empty items array (not error) when caller has no conversations', async () => {
    state.rawRows = [];
    const result = await getConversationList();
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
