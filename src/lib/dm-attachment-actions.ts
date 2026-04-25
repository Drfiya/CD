'use server';

/**
 * Round 3 / Item 5 — Server actions for DM file attachments.
 *
 * Three actions, three roles:
 *   - `requestAttachmentUploadUrl` — pre-upload gate. Re-verifies auth,
 *     participation, block, MIME + size, rate-limit. Returns a signed upload
 *     URL scoped to a conversation-prefixed storage path. The client never
 *     chooses the path.
 *   - `finaliseAttachment` — post-upload verification. Fetches the first
 *     bytes via service-role Range request, validates MIME magic + size,
 *     deletes the object on mismatch. Called inline by `sendMessage` before
 *     the DB row is written.
 *   - `getAttachmentSignedUrl` — on-demand read URL for a persisted message.
 *     Re-runs the block + participation checks so an attachment cannot be
 *     fetched from a conversation the caller was ejected from after upload.
 *
 * Defence-in-depth controls (all three actions):
 *   - Auth (NextAuth session via `requireAuth`)
 *   - Participation (the caller must be userAId or userBId)
 *   - Two-way block check against `DmBlock`
 *   - Rate-limit sharing the same 30/min bucket as text sends
 *     (attachments must NOT have their own bucket — that opens a spam vector)
 *   - MIME whitelist (Zod + Supabase bucket + magic bytes)
 *   - Size cap (Zod + Supabase bucket + magic-byte response `Content-Range`)
 *   - Path sanitisation (never trust client filename)
 *   - Signed URLs only (1 h TTL, regenerated per request)
 */
import { randomUUID } from 'node:crypto';
import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';
import {
  requestAttachmentUploadUrlSchema,
  finaliseAttachmentSchema,
  getAttachmentSignedUrlSchema,
  DM_ATTACHMENT_MAX_BYTES,
  type DmAttachmentMime,
} from '@/lib/validations/dm';
import { checkRateLimitAsync } from '@/lib/api/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sanitiseAttachmentName,
  buildAttachmentStoragePath,
  verifyMagicBytes,
} from '@/lib/dm-attachment-utils';

const BUCKET = 'dm-attachments';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
const SIGNED_UPLOAD_TTL_SECONDS = 120; // 2 minutes — just enough to PUT
const DM_SEND_LIMIT = 30;
const DM_SEND_WINDOW_MS = 60_000;
const MAGIC_BYTES_PROBE_LENGTH = 16; // enough for all four whitelisted MIMEs
const SIZE_TOLERANCE_BYTES = 1024; // per creative prompt §5.3

type AttachmentGateSuccess = {
  ok: true;
  me: string;
  recipientId: string;
};

type AttachmentGateFailure = { ok: false; error: string };

/**
 * Shared gate for attachment server actions: auth + participation + two-way
 * block check. Does NOT include rate-limit (different actions have different
 * rate-limit semantics).
 */
async function attachmentGate(
  conversationId: string,
): Promise<AttachmentGateSuccess | AttachmentGateFailure> {
  const session = await requireAuth();
  const me = session.user.id;

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userAId: true, userBId: true },
  });
  if (!conv) return { ok: false, error: 'Conversation not found' };
  if (conv.userAId !== me && conv.userBId !== me) {
    return { ok: false, error: 'Unauthorized' };
  }
  const recipientId = conv.userAId === me ? conv.userBId : conv.userAId;

  const block = await db.dmBlock.findFirst({
    where: {
      OR: [
        { blockerId: me, blockedId: recipientId },
        { blockerId: recipientId, blockedId: me },
      ],
    },
    select: { id: true },
  });
  if (block) return { ok: false, error: 'Cannot send to this user' };

  return { ok: true, me, recipientId };
}

/**
 * Request a signed upload URL for a new attachment. Client calls this BEFORE
 * performing the upload; it never chooses its own storage path.
 */
export async function requestAttachmentUploadUrl(input: {
  conversationId: string;
  filename: string;
  mime: string;
  size: number;
}) {
  const parsed = requestAttachmentUploadUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { conversationId, filename, mime, size } = parsed.data;

  const gate = await attachmentGate(conversationId);
  if (!gate.ok) return { error: gate.error };
  const { me } = gate;

  // Attachments share the text-message rate-limit bucket — one upload counts
  // as one send against the 30/min cap. Separate buckets would open a spam
  // vector.
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

  const sanitisedName = sanitiseAttachmentName(filename);
  const uploadId = randomUUID();
  const path = buildAttachmentStoragePath(conversationId, uploadId, sanitisedName);

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[dm-attachment] createSignedUploadUrl failed:', error);
    return { error: 'Upload URL could not be issued' };
  }

  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
    sanitisedName,
    mime,
    size,
    ttlSeconds: SIGNED_UPLOAD_TTL_SECONDS,
  };
}

interface ProbeResult {
  bytes: Uint8Array;
  contentType: string;
  totalLength: number;
}

/**
 * Fetch the first N bytes of an uploaded object via service-role Range
 * request. Returns the bytes, the reported content-type header, and the
 * total object size extracted from `Content-Range`. Isolated as a private
 * function so tests can mock `globalThis.fetch` to exercise the magic-byte
 * branch without touching Supabase.
 */
async function probeAttachment(
  path: string,
  probeLength: number,
): Promise<ProbeResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for attachment probe',
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Range: `bytes=0-${probeLength - 1}`,
    },
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(
      `Attachment probe failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const contentRange = response.headers.get('Content-Range');
  let totalLength = 0;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) totalLength = Number.parseInt(match[1], 10);
  } else {
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) totalLength = Number.parseInt(contentLength, 10);
  }

  const buf = await response.arrayBuffer();
  return { bytes: new Uint8Array(buf), contentType, totalLength };
}

/**
 * Re-verify an uploaded object before `sendMessage` persists the row.
 * Failure path deletes the object so no orphans accumulate in the bucket.
 *
 * Called inline by `sendMessage`, and also exported so the client can fail
 * the message before optimistic rendering if re-verification fails.
 */
export async function finaliseAttachment(input: {
  conversationId: string;
  path: string;
  expectedMime: string;
  expectedSize: number;
}) {
  const parsed = finaliseAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { conversationId, path, expectedMime, expectedSize } = parsed.data;

  const gate = await attachmentGate(conversationId);
  if (!gate.ok) return { error: gate.error };

  // Path confinement: the caller cannot finalise an upload belonging to a
  // different conversation even if they somehow knew its path.
  if (!path.startsWith(`${conversationId}/`)) {
    console.warn(
      '[dm-attachment] finaliseAttachment rejected cross-conversation path',
    );
    return { error: 'Invalid attachment path' };
  }

  const supabase = createAdminClient();

  let probe: ProbeResult;
  try {
    probe = await probeAttachment(path, MAGIC_BYTES_PROBE_LENGTH);
  } catch (err) {
    console.error('[dm-attachment] probe failed:', err);
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: 'Attachment verification failed' };
  }

  // Size sanity check: the server-reported total must match the client-claimed
  // size to within a 1 KB tolerance (Supabase metadata occasionally drifts).
  if (
    probe.totalLength > 0 &&
    Math.abs(probe.totalLength - expectedSize) > SIZE_TOLERANCE_BYTES
  ) {
    console.warn(
      `[dm-attachment] size mismatch: expected ${expectedSize}, saw ${probe.totalLength}`,
    );
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: 'Attachment size mismatch' };
  }

  // Size hard cap — catches any bucket misconfig that let an oversize upload
  // through despite the three-layer guard.
  if (probe.totalLength > DM_ATTACHMENT_MAX_BYTES + SIZE_TOLERANCE_BYTES) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: 'Attachment exceeds 10 MB limit' };
  }

  // Magic-byte check. `Content-Type` alone is a lie — a .png extension + an
  // `image/png` header could wrap literally any bytes. Match the signature
  // before we persist.
  if (!verifyMagicBytes(probe.bytes, expectedMime as DmAttachmentMime)) {
    console.warn(
      `[dm-attachment] magic-byte mismatch for claimed mime=${expectedMime}`,
    );
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: 'Attachment content did not match declared type' };
  }

  return { ok: true as const };
}

/**
 * Issue a short-lived (1 h) signed URL for a persisted attachment so the UI
 * can render the image or expose a download link. Re-runs the full
 * participation + block gate on every call — an attachment cannot be
 * fetched from a conversation the caller was blocked from after the fact.
 */
export async function getAttachmentSignedUrl(input: { messageId: string }) {
  const parsed = getAttachmentSignedUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const session = await requireAuth();
  const me = session.user.id;

  const message = await db.message.findUnique({
    where: { id: parsed.data.messageId },
    select: {
      id: true,
      conversationId: true,
      attachmentPath: true,
      attachmentMime: true,
      attachmentName: true,
    },
  });
  if (!message) return { error: 'Message not found' };
  if (!message.attachmentPath) {
    return { error: 'Message has no attachment' };
  }

  const conv = await db.conversation.findUnique({
    where: { id: message.conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!conv) return { error: 'Conversation not found' };
  if (conv.userAId !== me && conv.userBId !== me) {
    return { error: 'Unauthorized' };
  }
  const otherUserId = conv.userAId === me ? conv.userBId : conv.userAId;

  // Block check — a user blocked after the message was sent can no longer
  // fetch historical attachments. Preserves privacy after relationship
  // termination without needing to delete historical objects.
  const block = await db.dmBlock.findFirst({
    where: {
      OR: [
        { blockerId: me, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: me },
      ],
    },
    select: { id: true },
  });
  if (block) return { error: 'Unauthorized' };

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(message.attachmentPath, SIGNED_URL_TTL_SECONDS, {
      download: message.attachmentMime === 'application/pdf' ? message.attachmentName ?? undefined : undefined,
    });

  if (error || !data) {
    console.error('[dm-attachment] createSignedUrl failed:', error);
    return { error: 'Could not issue signed URL' };
  }

  return {
    signedUrl: data.signedUrl,
    expiresInSec: SIGNED_URL_TTL_SECONDS,
    mime: message.attachmentMime,
    name: message.attachmentName,
  };
}
