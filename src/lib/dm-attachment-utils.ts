/**
 * Round 3 / Item 5 — Pure helpers for DM attachment handling.
 *
 * Extracted from the server actions so Vitest can drive the sensitive paths
 * (filename sanitisation, magic-byte verification, storage path building)
 * deterministically without needing to mock Supabase. Same pattern as
 * `message-reconcile.ts` and `visibility-polling.ts`.
 *
 * No React, no server imports, no env access — safe to use anywhere.
 */
import type { DmAttachmentMime } from '@/lib/validations/dm';

/**
 * Strip characters that are path-traversal-hazardous, non-printable, or that
 * confuse the storage backend, while preserving enough of the original
 * filename that the user recognises their download.
 *
 * Rules:
 *   1. Remove null bytes + control characters (0x00–0x1F, 0x7F).
 *   2. Unicode-normalise to NFC so visually identical strings hash the same.
 *   3. Replace path separators (`/`, `\`) with `_`.
 *   4. Strip leading dots (blocks `.htaccess`, `..` residue).
 *   5. Collapse internal whitespace to single spaces.
 *   6. Fall back to `"file"` if the remaining string is empty.
 *   7. Clamp to 200 chars, preserving the extension when it's a short suffix.
 *
 * The *storage* path still includes a UUID segment (see
 * `buildAttachmentStoragePath`) so two uploads with the same sanitised name
 * never collide.
 */
export function sanitiseAttachmentName(raw: string): string {
  // 1. Basename — take only the last path component. This is the canonical
  //    defence against `../etc/passwd`, `..\\win.ini`, and any concatenation
  //    attack where the client embeds directory separators. Covers both POSIX
  //    and Windows paths without needing to blacklist specific patterns.
  const lastSep = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  let name = lastSep >= 0 ? raw.slice(lastSep + 1) : raw;
  // 2. Strip null bytes + ASCII control characters.
  name = name.replace(/[\x00-\x1f\x7f]/g, '');
  // 3. Unicode NFC normalisation — `é` as one codepoint vs two is identical
  //    on-disk; keep it canonical.
  name = name.normalize('NFC');
  // 4. Strip leading dots (blocks `.htaccess`, hidden dot-files, and any
  //    residual `..` after basename extraction from edge inputs).
  name = name.replace(/^\.+/, '');
  // 5. Collapse whitespace runs.
  name = name.replace(/\s+/g, ' ').trim();
  // 6. Empty fallback.
  if (name.length === 0) return 'file';
  // 7. Clamp to 200 characters with extension preservation.
  if (name.length > 200) {
    const lastDot = name.lastIndexOf('.');
    // Preserve the extension only if it looks like a normal suffix
    // (≤ 10 chars and not at position 0 — e.g. `.pdf`, `.jpeg`, `.webp`).
    if (lastDot > 0 && name.length - lastDot <= 10) {
      const ext = name.slice(lastDot);
      name = name.slice(0, 200 - ext.length) + ext;
    } else {
      name = name.slice(0, 200);
    }
  }
  return name;
}

/**
 * Storage-path builder. Always `{conversationId}/{uploadId}/{sanitisedName}`
 * so a user cannot upload into another conversation's prefix. The
 * `uploadId` is a server-generated UUID — never trusted from the client.
 */
export function buildAttachmentStoragePath(
  conversationId: string,
  uploadId: string,
  sanitisedName: string,
): string {
  return `${conversationId}/${uploadId}/${sanitisedName}`;
}

// Magic-byte signatures. Offsets below are relative to the start of the file.
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] as const; // .PNG
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const; // %PDF
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const; // RIFF
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50] as const; // WEBP

function bytesEqual(
  buf: Uint8Array,
  offset: number,
  magic: readonly number[],
): boolean {
  if (buf.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buf[offset + i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Verify the leading bytes of an uploaded file match the claimed MIME type.
 * `Content-Type` is a client-controlled lie by default — always match bytes
 * before persisting. A caller that can only supply the first ~12 bytes is
 * fine for all four supported types.
 *
 * @returns `true` iff the bytes match the claimed MIME, `false` otherwise.
 */
export function verifyMagicBytes(
  bytes: Uint8Array,
  mime: DmAttachmentMime,
): boolean {
  switch (mime) {
    case 'image/jpeg':
      return bytesEqual(bytes, 0, JPEG_MAGIC);
    case 'image/png':
      return bytesEqual(bytes, 0, PNG_MAGIC);
    case 'image/webp':
      // RIFF....WEBP — 4 bytes RIFF, 4 bytes size, 4 bytes WEBP.
      return bytesEqual(bytes, 0, WEBP_RIFF) && bytesEqual(bytes, 8, WEBP_WEBP);
    case 'application/pdf':
      return bytesEqual(bytes, 0, PDF_MAGIC);
    default: {
      // Exhaustive-check guard — DmAttachmentMime union is closed. If a new
      // MIME is added to the whitelist without a magic-byte signature here,
      // TypeScript will catch it at compile time.
      const _exhaustive: never = mime;
      return _exhaustive;
    }
  }
}
