import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

/**
 * Round 3 / Item 5 — Server-action coverage for the attachment pipeline.
 *
 * Mocks follow the pattern established by `dm-message-actions.test.ts`:
 * NextAuth, DB, rate-limit, Supabase admin, and the magic-byte Range fetch
 * are all swapped for controllable in-memory doubles so no network, no
 * filesystem, no React.
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

// Supabase storage mock — records every call, returns deterministic values.
type RemoveCall = { paths: string[] };
type SignedUploadUrlResult = {
  data: { signedUrl: string; token: string; path: string } | null;
  error: Error | null;
};
type SignedUrlResult = {
  data: { signedUrl: string } | null;
  error: Error | null;
};

const supabaseState = {
  removeCalls: [] as RemoveCall[],
  createSignedUploadResult: null as SignedUploadUrlResult | null,
  createSignedUrlResult: null as SignedUrlResult | null,
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => {
          if (supabaseState.createSignedUploadResult) {
            return supabaseState.createSignedUploadResult;
          }
          return {
            data: {
              signedUrl: `https://mock/upload/${path}?token=xyz`,
              token: 'tok_xyz',
              path,
            },
            error: null,
          };
        },
        createSignedUrl: async (path: string) => {
          if (supabaseState.createSignedUrlResult) {
            return supabaseState.createSignedUrlResult;
          }
          return {
            data: { signedUrl: `https://mock/read/${path}?sig=abc` },
            error: null,
          };
        },
        remove: async (paths: string[]) => {
          supabaseState.removeCalls.push({ paths });
          return { data: null, error: null };
        },
      }),
    },
  })),
}));

// DB mock — tracks conversations, blocks, and messages.
type Convo = { id: string; userAId: string; userBId: string };
type Block = { blockerId: string; blockedId: string };
type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  attachmentPath: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  attachmentName: string | null;
};

const dbState = {
  conversations: [] as Convo[],
  blocks: [] as Block[],
  messages: [] as Message[],
};

vi.mock('@/lib/db', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        dbState.conversations.find((c) => c.id === where.id) ?? null,
      ),
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
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        dbState.messages.find((m) => m.id === where.id) ?? null,
      ),
    },
  },
}));

// Magic-byte probe mock — sets globalThis.fetch for the attachment-probe fetch
// in `finaliseAttachment`.
const probeState = {
  response: null as null | {
    ok: boolean;
    status: number;
    headers: Map<string, string>;
    bytes: Uint8Array;
  },
};

// Environment needed by probeAttachment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

const originalFetch = globalThis.fetch;
globalThis.fetch = (vi.fn(async () => {
  const r = probeState.response;
  if (!r) throw new Error('probeState.response not set');
  return {
    ok: r.ok,
    status: r.status,
    statusText: '',
    headers: {
      get: (key: string) => r.headers.get(key.toLowerCase()) ?? null,
    },
    arrayBuffer: async () => r.bytes.buffer.slice(
      r.bytes.byteOffset,
      r.bytes.byteOffset + r.bytes.byteLength,
    ) as ArrayBuffer,
  } as unknown as Response;
}) as unknown) as typeof fetch;

const {
  requestAttachmentUploadUrl,
  finaliseAttachment,
  getAttachmentSignedUrl,
} = await import('@/lib/dm-attachment-actions');

function resetAll() {
  authState.userId = 'alice';
  rlState.allowed = true;
  rlState.remaining = 29;
  rlState.resetTime = Date.now() + 60_000;
  supabaseState.removeCalls = [];
  supabaseState.createSignedUploadResult = null;
  supabaseState.createSignedUrlResult = null;
  dbState.conversations = [{ id: 'conv1', userAId: 'alice', userBId: 'bob' }];
  dbState.blocks = [];
  dbState.messages = [];
  probeState.response = null;
}

describe('requestAttachmentUploadUrl', () => {
  beforeEach(resetAll);

  const validInput = {
    conversationId: 'conv1',
    filename: 'photo.png',
    mime: 'image/png',
    size: 12345,
  };

  it('issues a signed upload URL for a valid participant send', async () => {
    const result = await requestAttachmentUploadUrl(validInput);
    expect('uploadUrl' in result).toBe(true);
    if ('uploadUrl' in result && typeof result.path === 'string') {
      expect(result.path.startsWith('conv1/')).toBe(true);
      expect(result.sanitisedName).toBe('photo.png');
      expect(result.uploadUrl).toContain('/upload/');
    }
  });

  it('rejects when the caller is not a participant', async () => {
    authState.userId = 'eve';
    const result = await requestAttachmentUploadUrl(validInput);
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects when either party has blocked the other', async () => {
    dbState.blocks = [{ blockerId: 'bob', blockedId: 'alice' }];
    const result = await requestAttachmentUploadUrl(validInput);
    expect(result).toEqual({ error: 'Cannot send to this user' });
  });

  it('rejects when rate-limited, returning retryAfterSec', async () => {
    rlState.allowed = false;
    rlState.resetTime = Date.now() + 17_000;
    const result = await requestAttachmentUploadUrl(validInput);
    expect(result).toMatchObject({ error: 'rate_limited' });
    if ('retryAfterSec' in result) {
      expect(result.retryAfterSec).toBeGreaterThanOrEqual(16);
      expect(result.retryAfterSec).toBeLessThanOrEqual(17);
    }
  });

  it('rejects disallowed MIME types at the Zod layer', async () => {
    const result = await requestAttachmentUploadUrl({
      ...validInput,
      mime: 'image/gif',
    });
    expect('error' in result).toBe(true);
    expect('uploadUrl' in result).toBe(false);
  });

  it('rejects files over 10 MB at the Zod layer', async () => {
    const result = await requestAttachmentUploadUrl({
      ...validInput,
      size: 11 * 1024 * 1024,
    });
    expect('error' in result).toBe(true);
  });

  it('sanitises path-traversal filenames before issuing the path', async () => {
    const result = await requestAttachmentUploadUrl({
      ...validInput,
      filename: '../../etc/passwd.png',
    });
    expect('uploadUrl' in result).toBe(true);
    if ('uploadUrl' in result && typeof result.path === 'string') {
      expect(result.sanitisedName).toBe('passwd.png');
      expect(result.path).not.toContain('..');
      expect(result.path.startsWith('conv1/')).toBe(true);
    }
  });

  it('surfaces a generic error when Supabase createSignedUploadUrl fails', async () => {
    supabaseState.createSignedUploadResult = {
      data: null,
      error: new Error('network'),
    };
    const result = await requestAttachmentUploadUrl(validInput);
    expect(result).toEqual({ error: 'Upload URL could not be issued' });
  });
});

describe('finaliseAttachment', () => {
  beforeEach(resetAll);

  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const mzBytes = new Uint8Array([
    0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  ]);

  function setProbe(bytes: Uint8Array, contentType: string, totalLength: number) {
    const headers = new Map<string, string>();
    headers.set('content-type', contentType);
    headers.set('content-range', `bytes 0-${bytes.length - 1}/${totalLength}`);
    probeState.response = { ok: false, status: 206, headers, bytes };
  }

  it('accepts a valid PNG with matching magic bytes', async () => {
    setProbe(pngBytes, 'image/png', 12000);
    const result = await finaliseAttachment({
      conversationId: 'conv1',
      path: 'conv1/uuid/photo.png',
      expectedMime: 'image/png',
      expectedSize: 12000,
    });
    expect(result).toEqual({ ok: true });
    expect(supabaseState.removeCalls).toHaveLength(0);
  });

  it('rejects a magic-byte mismatch AND deletes the uploaded object', async () => {
    // Client claimed image/png but the actual bytes are an MZ (Windows EXE).
    setProbe(mzBytes, 'image/png', 12000);
    const result = await finaliseAttachment({
      conversationId: 'conv1',
      path: 'conv1/uuid/photo.png',
      expectedMime: 'image/png',
      expectedSize: 12000,
    });
    expect('error' in result).toBe(true);
    expect(supabaseState.removeCalls).toHaveLength(1);
    expect(supabaseState.removeCalls[0].paths).toEqual([
      'conv1/uuid/photo.png',
    ]);
  });

  it('rejects a cross-conversation path (path confinement)', async () => {
    setProbe(pngBytes, 'image/png', 12000);
    const result = await finaliseAttachment({
      conversationId: 'conv1',
      path: 'conv2/uuid/photo.png', // path claims conv2 but we're acting on conv1
      expectedMime: 'image/png',
      expectedSize: 12000,
    });
    expect(result).toEqual({ error: 'Invalid attachment path' });
    // No probe, no delete — we rejected before even fetching.
    expect(supabaseState.removeCalls).toHaveLength(0);
  });

  it('rejects when the caller is not a participant', async () => {
    authState.userId = 'eve';
    const result = await finaliseAttachment({
      conversationId: 'conv1',
      path: 'conv1/uuid/photo.png',
      expectedMime: 'image/png',
      expectedSize: 12000,
    });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects when the reported total size diverges from expectedSize beyond tolerance', async () => {
    setProbe(pngBytes, 'image/png', 12000 + 5000); // 5 KB drift — well past 1 KB tolerance
    const result = await finaliseAttachment({
      conversationId: 'conv1',
      path: 'conv1/uuid/photo.png',
      expectedMime: 'image/png',
      expectedSize: 12000,
    });
    expect(result).toEqual({ error: 'Attachment size mismatch' });
    expect(supabaseState.removeCalls).toHaveLength(1);
  });
});

describe('getAttachmentSignedUrl', () => {
  beforeEach(resetAll);

  beforeEach(() => {
    dbState.messages.push({
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'alice',
      attachmentPath: 'conv1/uuid/photo.png',
      attachmentMime: 'image/png',
      attachmentSize: 1024,
      attachmentName: 'photo.png',
    });
    dbState.messages.push({
      id: 'msg-noattach',
      conversationId: 'conv1',
      senderId: 'alice',
      attachmentPath: null,
      attachmentMime: null,
      attachmentSize: null,
      attachmentName: null,
    });
  });

  it('returns a signed URL for a valid participant', async () => {
    const result = await getAttachmentSignedUrl({ messageId: 'msg1' });
    expect('signedUrl' in result).toBe(true);
    if ('signedUrl' in result) {
      expect(result.signedUrl).toContain('/read/');
      expect(result.expiresInSec).toBe(3600);
    }
  });

  it('rejects when the caller is blocked by the other party (post-hoc block applies)', async () => {
    dbState.blocks = [{ blockerId: 'bob', blockedId: 'alice' }];
    const result = await getAttachmentSignedUrl({ messageId: 'msg1' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects when the message has no attachment', async () => {
    const result = await getAttachmentSignedUrl({
      messageId: 'msg-noattach',
    });
    expect(result).toEqual({ error: 'Message has no attachment' });
  });

  it('rejects non-participants', async () => {
    authState.userId = 'eve';
    const result = await getAttachmentSignedUrl({ messageId: 'msg1' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects a non-existent messageId', async () => {
    const result = await getAttachmentSignedUrl({ messageId: 'nope' });
    expect(result).toEqual({ error: 'Message not found' });
  });
});

// Restore global fetch after the suite — vitest isolates test files by
// default, but this keeps the mock from leaking if isolation changes.
afterAll(() => {
  globalThis.fetch = originalFetch;
});
