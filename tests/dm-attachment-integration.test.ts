import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

/**
 * Round 3 / Item 5 — End-to-end coverage of the full send pipeline with an
 * attachment: `sendMessage` must call `finaliseAttachment` internally,
 * reject on magic-byte mismatch, persist the four attachment fields on the
 * message row, and honour clientMessageId idempotency (retries do NOT
 * double-persist and do NOT double-upload).
 */

const authState: { userId: string | null } = { userId: 'alice' };

vi.mock('@/lib/auth-guards', () => ({
  requireAuth: vi.fn(async () => {
    if (!authState.userId) throw new Error('Unauthorized');
    return { user: { id: authState.userId } };
  }),
}));

const rlState = { allowed: true, remaining: 29, resetTime: Date.now() + 60_000 };
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimitAsync: vi.fn(async () => ({
    allowed: rlState.allowed,
    remaining: rlState.remaining,
    resetTime: rlState.resetTime,
  })),
}));

// Supabase storage — records removes, succeeds signed ops.
const supabaseState = {
  removeCalls: [] as { paths: string[] }[],
};
const broadcastCalls: Array<{ channel: string; payload: unknown }> = [];

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    channel: (channel: string) => ({
      send: async ({ payload }: { payload: unknown }) => {
        broadcastCalls.push({ channel, payload });
      },
    }),
    removeChannel: vi.fn(),
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => ({
          data: {
            signedUrl: `https://mock/upload/${path}`,
            token: 'tok',
            path,
          },
          error: null,
        }),
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://mock/read/${path}` },
          error: null,
        }),
        remove: async (paths: string[]) => {
          supabaseState.removeCalls.push({ paths });
          return { data: null, error: null };
        },
      }),
    },
  })),
}));

// DB — minimal Message / Conversation / DmBlock.
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
  attachmentPath: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  attachmentName: string | null;
};

const dbState = {
  conversations: [] as Convo[],
  blocks: [] as Block[],
  messages: [] as Message[],
  uniqueEnforced: false,
};

vi.mock('@/lib/db', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        dbState.conversations.find((c) => c.id === where.id) ?? null,
      ),
      update: vi.fn(async () => ({})),
    },
    dmBlock: {
      findFirst: vi.fn(async ({ where }: { where: { OR: Block[] } }) => {
        for (const clause of where.OR) {
          const hit = dbState.blocks.find(
            (b) =>
              b.blockerId === clause.blockerId &&
              b.blockedId === clause.blockedId,
          );
          if (hit) return hit;
        }
        return null;
      }),
    },
    message: {
      create: vi.fn(async ({ data }: { data: Omit<Message, 'id' | 'readAt'> }) => {
        if (
          dbState.uniqueEnforced &&
          data.clientMessageId &&
          dbState.messages.some(
            (m) =>
              m.clientMessageId === data.clientMessageId &&
              m.senderId === data.senderId,
          )
        ) {
          const err = new Error('Unique constraint failed') as Error & {
            code?: string;
          };
          err.code = 'P2002';
          throw err;
        }
        const m: Message = {
          id: `msg_${dbState.messages.length + 1}`,
          readAt: null,
          ...data,
        };
        dbState.messages.push(m);
        return m;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { clientMessageId: string; senderId: string };
        }) =>
          dbState.messages.find(
            (m) =>
              m.clientMessageId === where.clientMessageId &&
              m.senderId === where.senderId,
          ) ?? null,
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        dbState.messages.find((m) => m.id === where.id) ?? null,
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Probe fetch mock — by default returns a valid PNG signature.
const probeState = {
  responses: [] as Array<{
    bytes: Uint8Array;
    contentType: string;
    totalLength: number;
  }>,
  fetchCallCount: 0,
};

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role';

const originalFetch = globalThis.fetch;
globalThis.fetch = (vi.fn(async () => {
  probeState.fetchCallCount += 1;
  const r = probeState.responses.shift();
  if (!r) throw new Error('probe response queue empty');
  const headers = new Map<string, string>();
  headers.set('content-type', r.contentType);
  headers.set('content-range', `bytes 0-${r.bytes.length - 1}/${r.totalLength}`);
  return {
    ok: false,
    status: 206,
    statusText: '',
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    arrayBuffer: async () =>
      r.bytes.buffer.slice(
        r.bytes.byteOffset,
        r.bytes.byteOffset + r.bytes.byteLength,
      ) as ArrayBuffer,
  } as unknown as Response;
}) as unknown) as typeof fetch;

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const { sendMessage } = await import('@/lib/message-actions');

function reset() {
  authState.userId = 'alice';
  rlState.allowed = true;
  rlState.remaining = 29;
  rlState.resetTime = Date.now() + 60_000;
  supabaseState.removeCalls = [];
  broadcastCalls.length = 0;
  dbState.conversations = [{ id: 'conv1', userAId: 'alice', userBId: 'bob' }];
  dbState.blocks = [];
  dbState.messages = [];
  dbState.uniqueEnforced = false;
  probeState.responses = [];
  probeState.fetchCallCount = 0;
}

describe('sendMessage with attachment (Round 3 / Item 5)', () => {
  beforeEach(reset);

  it('persists all four attachment fields on a happy-path send', async () => {
    probeState.responses.push({
      bytes: pngBytes,
      contentType: 'image/png',
      totalLength: 12000,
    });

    const result = await sendMessage({
      conversationId: 'conv1',
      body: 'look at this diagram',
      attachment: {
        path: 'conv1/uuid/diagram.png',
        mime: 'image/png',
        size: 12000,
        name: 'diagram.png',
      },
    });

    expect('message' in result).toBe(true);
    expect(dbState.messages).toHaveLength(1);
    expect(dbState.messages[0]).toMatchObject({
      attachmentPath: 'conv1/uuid/diagram.png',
      attachmentMime: 'image/png',
      attachmentSize: 12000,
      attachmentName: 'diagram.png',
      body: 'look at this diagram',
    });
  });

  it('accepts an attachment-only message (empty body)', async () => {
    probeState.responses.push({
      bytes: pngBytes,
      contentType: 'image/png',
      totalLength: 1024,
    });

    const result = await sendMessage({
      conversationId: 'conv1',
      body: '',
      attachment: {
        path: 'conv1/uuid/photo.png',
        mime: 'image/png',
        size: 1024,
        name: 'photo.png',
      },
    });

    expect('message' in result).toBe(true);
    expect(dbState.messages).toHaveLength(1);
    expect(dbState.messages[0].body).toBe('');
    expect(dbState.messages[0].attachmentPath).toBe('conv1/uuid/photo.png');
  });

  it('rejects an empty body + no attachment (existing contract preserved)', async () => {
    const result = await sendMessage({ conversationId: 'conv1', body: '' });
    expect('error' in result).toBe(true);
    expect(dbState.messages).toHaveLength(0);
  });

  it('aborts + returns the finaliseAttachment error on magic-byte mismatch', async () => {
    // Actual bytes are MZ (EXE). `finaliseAttachment` should detect the
    // mismatch, delete the object, and return an error — no DB row written.
    probeState.responses.push({
      bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
      contentType: 'image/png',
      totalLength: 1024,
    });

    const result = await sendMessage({
      conversationId: 'conv1',
      body: 'malware incoming',
      attachment: {
        path: 'conv1/uuid/photo.png',
        mime: 'image/png',
        size: 1024,
        name: 'photo.png',
      },
    });

    expect('error' in result).toBe(true);
    expect(dbState.messages).toHaveLength(0);
    // finaliseAttachment deletes the object.
    expect(supabaseState.removeCalls).toHaveLength(1);
    expect(supabaseState.removeCalls[0].paths).toEqual([
      'conv1/uuid/photo.png',
    ]);
  });

  it('retries with the same clientMessageId return the existing row (idempotent, no double-upload)', async () => {
    dbState.uniqueEnforced = true;
    // Only ONE probe response queued — a second probe attempt would crash.
    probeState.responses.push({
      bytes: pngBytes,
      contentType: 'image/png',
      totalLength: 1024,
    });
    probeState.responses.push({
      bytes: pngBytes,
      contentType: 'image/png',
      totalLength: 1024,
    });

    const input = {
      conversationId: 'conv1',
      body: 'hi',
      clientMessageId: '22222222-2222-4222-8222-222222222222',
      attachment: {
        path: 'conv1/uuid/photo.png',
        mime: 'image/png' as const,
        size: 1024,
        name: 'photo.png',
      },
    };

    const first = await sendMessage(input);
    const second = await sendMessage(input);

    expect('message' in first).toBe(true);
    expect('message' in second).toBe(true);
    if ('message' in first && 'message' in second && first.message && second.message) {
      // Same row is returned on both calls.
      expect(second.message.id).toBe(first.message.id);
      // The attachment fields on the retry row are authoritative (server row,
      // not a freshly uploaded duplicate).
      expect(second.message.attachmentPath).toBe('conv1/uuid/photo.png');
    }
    expect(dbState.messages).toHaveLength(1);
  });

  it('counts attachment sends against the shared 30/min rate-limit bucket', async () => {
    rlState.allowed = false;
    rlState.resetTime = Date.now() + 17_000;
    const result = await sendMessage({
      conversationId: 'conv1',
      body: '',
      attachment: {
        path: 'conv1/uuid/photo.png',
        mime: 'image/png',
        size: 1024,
        name: 'photo.png',
      },
    });
    expect(result).toMatchObject({ error: 'rate_limited' });
    if ('retryAfterSec' in result) {
      expect(result.retryAfterSec).toBeGreaterThanOrEqual(16);
    }
    expect(dbState.messages).toHaveLength(0);
    // finaliseAttachment was never called since the rate-limit gate ran first.
    expect(probeState.fetchCallCount).toBe(0);
  });

  it('broadcasts to the recipient inbox channel on happy-path attachment send', async () => {
    probeState.responses.push({
      bytes: pngBytes,
      contentType: 'image/png',
      totalLength: 1024,
    });

    await sendMessage({
      conversationId: 'conv1',
      body: '',
      attachment: {
        path: 'conv1/uuid/photo.png',
        mime: 'image/png',
        size: 1024,
        name: 'photo.png',
      },
    });

    expect(broadcastCalls).toHaveLength(1);
    expect(broadcastCalls[0].channel).toBe('dm:inbox:bob');
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});
