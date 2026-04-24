import { describe, it, expect } from 'vitest';
import {
  sanitiseAttachmentName,
  verifyMagicBytes,
  buildAttachmentStoragePath,
} from '@/lib/dm-attachment-utils';
import {
  attachmentMetadataSchema,
  sendMessageSchema,
  DM_ATTACHMENT_MAX_BYTES,
} from '@/lib/validations/dm';

/**
 * Round 3 / Item 5 — Pure-function validation coverage.
 *
 * Magic-byte + filename + schema checks drive the security story. None of
 * these depend on Supabase, the DB, or React — they are the hot core of the
 * defence-in-depth model, so they deserve dense, cheap coverage.
 */

describe('sanitiseAttachmentName', () => {
  it('collapses path-traversal attempts to their basename', () => {
    expect(sanitiseAttachmentName('../etc/passwd')).toBe('passwd');
    expect(sanitiseAttachmentName('..\\windows\\win.ini')).toBe('win.ini');
    expect(sanitiseAttachmentName('/absolute/path/file.pdf')).toBe('file.pdf');
  });

  it('strips null bytes and ASCII control characters', () => {
    expect(sanitiseAttachmentName('photo\x00\x01\x1f.png')).toBe('photo.png');
  });

  it('strips leading dots (blocks `.htaccess`-style filenames)', () => {
    expect(sanitiseAttachmentName('.htaccess')).toBe('htaccess');
    expect(sanitiseAttachmentName('...diagram.pdf')).toBe('diagram.pdf');
  });

  it('falls back to "file" when the sanitised string is empty', () => {
    expect(sanitiseAttachmentName('../../..')).toBe('file'); // basename "" → fallback
    expect(sanitiseAttachmentName('\x00\x01\x02')).toBe('file');
    expect(sanitiseAttachmentName('/')).toBe('file');
  });

  it('normalises Unicode to NFC', () => {
    // "café" as decomposed (e + combining accent) vs precomposed.
    const decomposed = 'café.png';
    const composed = 'café.png';
    expect(sanitiseAttachmentName(decomposed)).toBe(composed);
  });

  it('collapses runs of internal whitespace', () => {
    expect(sanitiseAttachmentName('my    file    name.pdf')).toBe('my file name.pdf');
  });

  it('clamps to 200 characters while preserving a short extension', () => {
    const name = 'a'.repeat(250) + '.png';
    const sanitised = sanitiseAttachmentName(name);
    expect(sanitised.length).toBeLessThanOrEqual(200);
    expect(sanitised.endsWith('.png')).toBe(true);
  });

  it('clamps without preservation when there is no usable extension', () => {
    const name = 'x'.repeat(250);
    expect(sanitiseAttachmentName(name).length).toBe(200);
  });
});

describe('verifyMagicBytes', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // %PDF-1
  // RIFF....WEBP: 4 bytes R I F F, 4 bytes size, 4 bytes W E B P
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46,
    0x00, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ]);
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // Windows MZ

  it('accepts matching signatures for all four whitelisted MIMEs', () => {
    expect(verifyMagicBytes(jpeg, 'image/jpeg')).toBe(true);
    expect(verifyMagicBytes(png, 'image/png')).toBe(true);
    expect(verifyMagicBytes(webp, 'image/webp')).toBe(true);
    expect(verifyMagicBytes(pdf, 'application/pdf')).toBe(true);
  });

  it('rejects a GIF file masquerading as PNG (trust bytes, not headers)', () => {
    expect(verifyMagicBytes(gif, 'image/png')).toBe(false);
  });

  it('rejects an EXE file claiming any allowed type', () => {
    expect(verifyMagicBytes(exe, 'image/jpeg')).toBe(false);
    expect(verifyMagicBytes(exe, 'image/png')).toBe(false);
    expect(verifyMagicBytes(exe, 'image/webp')).toBe(false);
    expect(verifyMagicBytes(exe, 'application/pdf')).toBe(false);
  });

  it('rejects a truncated buffer shorter than the signature', () => {
    expect(verifyMagicBytes(new Uint8Array([0xff]), 'image/jpeg')).toBe(false);
    expect(verifyMagicBytes(new Uint8Array([]), 'application/pdf')).toBe(false);
  });

  it('rejects WebP when only RIFF is present but WEBP marker is missing', () => {
    // Valid WAV file also starts with RIFF — we must reject it.
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, // WAVE not WEBP
    ]);
    expect(verifyMagicBytes(wav, 'image/webp')).toBe(false);
  });
});

describe('buildAttachmentStoragePath', () => {
  it('always prefixes with conversationId for per-conversation isolation', () => {
    const p = buildAttachmentStoragePath('conv123', 'uuid-abc', 'photo.png');
    expect(p.startsWith('conv123/')).toBe(true);
    expect(p).toBe('conv123/uuid-abc/photo.png');
  });

  it('keeps the sanitised filename intact — no further mangling', () => {
    const p = buildAttachmentStoragePath('c', 'u', 'my file.pdf');
    expect(p).toBe('c/u/my file.pdf');
  });
});

describe('attachmentMetadataSchema', () => {
  const baseValid = {
    path: 'convX/uuid1/photo.png',
    mime: 'image/png' as const,
    size: 12345,
    name: 'photo.png',
  };

  it('accepts a valid image attachment', () => {
    const result = attachmentMetadataSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('rejects disallowed MIME types (e.g. image/gif, application/zip, text/html)', () => {
    for (const mime of ['image/gif', 'application/zip', 'text/html', 'video/mp4']) {
      const result = attachmentMetadataSchema.safeParse({ ...baseValid, mime });
      expect(result.success).toBe(false);
    }
  });

  it('accepts exactly 10 MB (boundary inclusive)', () => {
    const result = attachmentMetadataSchema.safeParse({
      ...baseValid,
      size: DM_ATTACHMENT_MAX_BYTES,
    });
    expect(result.success).toBe(true);
  });

  it('rejects 10 MB + 1 byte', () => {
    const result = attachmentMetadataSchema.safeParse({
      ...baseValid,
      size: DM_ATTACHMENT_MAX_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative size', () => {
    expect(
      attachmentMetadataSchema.safeParse({ ...baseValid, size: 0 }).success,
    ).toBe(false);
    expect(
      attachmentMetadataSchema.safeParse({ ...baseValid, size: -100 }).success,
    ).toBe(false);
  });

  it('rejects empty name and path', () => {
    expect(
      attachmentMetadataSchema.safeParse({ ...baseValid, name: '' }).success,
    ).toBe(false);
    expect(
      attachmentMetadataSchema.safeParse({ ...baseValid, path: '' }).success,
    ).toBe(false);
  });

  it('rejects path and name over their length limits', () => {
    expect(
      attachmentMetadataSchema.safeParse({
        ...baseValid,
        path: 'x'.repeat(513),
      }).success,
    ).toBe(false);
    expect(
      attachmentMetadataSchema.safeParse({
        ...baseValid,
        name: 'y'.repeat(256),
      }).success,
    ).toBe(false);
  });
});

describe('sendMessageSchema (Round 3 / Item 5 — body-or-attachment rule)', () => {
  const validAttachment = {
    path: 'convX/u/photo.png',
    mime: 'image/png' as const,
    size: 1024,
    name: 'photo.png',
  };

  it('accepts a text-only message (existing behaviour)', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'hello',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an attachment-only message (empty body)', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: '',
      attachment: validAttachment,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a message with both body and attachment', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'check this diagram',
      attachment: validAttachment,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body AND no attachment', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: '   ', // whitespace-only → trimmed to empty
    });
    expect(result.success).toBe(false);
  });

  it('rejects an attachment whose size exceeds the 10 MB cap', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: '',
      attachment: {
        ...validAttachment,
        size: DM_ATTACHMENT_MAX_BYTES + 1024,
      },
    });
    expect(result.success).toBe(false);
  });
});
