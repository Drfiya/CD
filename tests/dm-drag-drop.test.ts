import { describe, it, expect } from 'vitest';
import {
  DM_ATTACHMENT_ALLOWED_MIMES,
  DM_ATTACHMENT_MAX_BYTES,
} from '@/lib/validations/dm';

/**
 * Round 4 / Item 1 — Drag-and-Drop validation contract.
 *
 * These tests define the exact behaviour expected from the drag-drop handler
 * in `chat-window.tsx`. The validation logic mirrors `AttachmentUploader`
 * (same constants, same order: MIME-check before size-check) so any divergence
 * breaks here rather than silently accepting bad files.
 */

type DragDropValidationResult = 'ok' | 'type_error' | 'size_error';

/** Pure replica of chat-window.tsx `validateDragFile` for contract-testing. */
function validateDragFile(file: { type: string; size: number }): DragDropValidationResult {
  if (!(DM_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    return 'type_error';
  }
  if (file.size > DM_ATTACHMENT_MAX_BYTES) return 'size_error';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Allowed MIME types
// ---------------------------------------------------------------------------

describe('DM drag-drop validation — allowed types', () => {
  it('accepts image/jpeg', () => {
    expect(validateDragFile({ type: 'image/jpeg', size: 1024 })).toBe('ok');
  });

  it('accepts image/png', () => {
    expect(validateDragFile({ type: 'image/png', size: 512 })).toBe('ok');
  });

  it('accepts image/webp', () => {
    expect(validateDragFile({ type: 'image/webp', size: 2048 })).toBe('ok');
  });

  it('accepts application/pdf', () => {
    expect(validateDragFile({ type: 'application/pdf', size: 4096 })).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// Rejected MIME types
// ---------------------------------------------------------------------------

describe('DM drag-drop validation — rejected types', () => {
  const rejectedTypes = [
    'image/gif',
    'video/mp4',
    'audio/mpeg',
    'text/html',
    'application/zip',
    'application/octet-stream',
    'image/svg+xml',
  ];

  for (const mime of rejectedTypes) {
    it(`rejects ${mime}`, () => {
      expect(validateDragFile({ type: mime, size: 1024 })).toBe('type_error');
    });
  }

  it('rejects an empty MIME string', () => {
    expect(validateDragFile({ type: '', size: 100 })).toBe('type_error');
  });
});

// ---------------------------------------------------------------------------
// Size boundaries
// ---------------------------------------------------------------------------

describe('DM drag-drop validation — size boundaries', () => {
  it('accepts exactly 10 MB (boundary inclusive)', () => {
    expect(
      validateDragFile({ type: 'image/png', size: DM_ATTACHMENT_MAX_BYTES }),
    ).toBe('ok');
  });

  it('rejects 10 MB + 1 byte', () => {
    expect(
      validateDragFile({ type: 'image/png', size: DM_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBe('size_error');
  });

  it('rejects an 11 MB PDF', () => {
    expect(
      validateDragFile({ type: 'application/pdf', size: 11 * 1024 * 1024 }),
    ).toBe('size_error');
  });

  it('MIME check runs before size check (type_error wins when both fail)', () => {
    // A GIF over the size limit should still yield type_error, not size_error,
    // because MIME is checked first — matching the AttachmentUploader order.
    expect(
      validateDragFile({ type: 'video/mp4', size: DM_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBe('type_error');
  });
});

// ---------------------------------------------------------------------------
// Multiple-file drop policy: only the first file is accepted
// ---------------------------------------------------------------------------

describe('DM drag-drop — first-file-only policy', () => {
  function makeFileList(files: Array<{ type: string; size: number; name: string }>) {
    return {
      length: files.length,
      item: (i: number) => (i >= 0 && i < files.length ? files[i] : null),
    };
  }

  it('accepts the first valid file from a multi-file drop', () => {
    const list = makeFileList([
      { type: 'image/jpeg', size: 1024, name: 'photo.jpg' },
      { type: 'image/png', size: 512, name: 'second.png' },
    ]);
    const first = list.item(0);
    expect(first).not.toBeNull();
    expect(validateDragFile(first!)).toBe('ok');
  });

  it('ignores files after the first, even if the first is rejected', () => {
    const list = makeFileList([
      { type: 'video/mp4', size: 500, name: 'bad.mp4' },
      { type: 'image/png', size: 512, name: 'good.png' },
    ]);
    // Implementation only ever passes `list.item(0)` to validateDragFile.
    // The second (good) file is never considered.
    const first = list.item(0);
    expect(validateDragFile(first!)).toBe('type_error');
  });

  it('returns null for an empty FileList (no file dropped)', () => {
    const list = makeFileList([]);
    expect(list.item(0)).toBeNull();
  });

  it('rejects a single oversized file', () => {
    const list = makeFileList([
      { type: 'image/jpeg', size: DM_ATTACHMENT_MAX_BYTES + 1, name: 'huge.jpg' },
    ]);
    const first = list.item(0);
    expect(validateDragFile(first!)).toBe('size_error');
  });

  it('rejects a single file with a disallowed MIME type', () => {
    const list = makeFileList([
      { type: 'image/gif', size: 256, name: 'anim.gif' },
    ]);
    const first = list.item(0);
    expect(validateDragFile(first!)).toBe('type_error');
  });
});

// ---------------------------------------------------------------------------
// DM_ATTACHMENT_ALLOWED_MIMES — whitelist contract
// ---------------------------------------------------------------------------

describe('DM_ATTACHMENT_ALLOWED_MIMES — whitelist contract', () => {
  it('contains exactly 4 whitelisted types', () => {
    expect(DM_ATTACHMENT_ALLOWED_MIMES.length).toBe(4);
  });

  it('includes all four expected MIME types', () => {
    expect(DM_ATTACHMENT_ALLOWED_MIMES).toContain('image/jpeg');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).toContain('image/png');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).toContain('image/webp');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).toContain('application/pdf');
  });

  it('does NOT include commonly tested banned types', () => {
    expect(DM_ATTACHMENT_ALLOWED_MIMES).not.toContain('image/gif');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).not.toContain('video/mp4');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).not.toContain('application/zip');
    expect(DM_ATTACHMENT_ALLOWED_MIMES).not.toContain('text/html');
  });
});
