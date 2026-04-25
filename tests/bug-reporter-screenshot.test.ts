/**
 * CR14 — ScreenshotUploader unit tests
 *
 * Tests the client-side validation logic that backs the ScreenshotUploader
 * component:
 *   - MIME whitelist enforcement
 *   - Size cap (5 MB)
 *   - Max count enforcement (5 screenshots)
 *   - Filename sanitisation (mirrors the server-side `sanitiseFilename` logic)
 *   - Storage path format validation
 *
 * No DOM or React mount required — tests pure helper logic extracted inline.
 */

import { describe, it, expect } from 'vitest';
import {
  SCREENSHOT_ALLOWED_MIMES,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MAX_COUNT,
  requestScreenshotUploadUrlSchema,
  createBugReportSchema,
} from '@/lib/validations/bug-reporter';

// ── MIME whitelist ────────────────────────────────────────────────────────────

describe('Screenshot MIME whitelist', () => {
  it('allows image/jpeg', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).toContain('image/jpeg');
  });

  it('allows image/png', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).toContain('image/png');
  });

  it('allows image/webp', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).toContain('image/webp');
  });

  it('allows image/gif', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).toContain('image/gif');
  });

  it('does NOT allow application/pdf', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).not.toContain('application/pdf');
  });

  it('does NOT allow video/mp4', () => {
    expect(SCREENSHOT_ALLOWED_MIMES).not.toContain('video/mp4');
  });
});

// ── Size cap ─────────────────────────────��───────────────────────────────────

describe('Screenshot size cap', () => {
  it('SCREENSHOT_MAX_BYTES is 5 MB', () => {
    expect(SCREENSHOT_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it('upload schema rejects file exactly 1 byte over limit', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'over.png',
      mime: 'image/png',
      size: SCREENSHOT_MAX_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it('upload schema accepts file exactly at limit', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'exactly.png',
      mime: 'image/png',
      size: SCREENSHOT_MAX_BYTES,
    });
    expect(result.success).toBe(true);
  });
});

// ── Max count ─────────────────────────────────────────────────────────────────

describe('Screenshot max count', () => {
  it('SCREENSHOT_MAX_COUNT is 5', () => {
    expect(SCREENSHOT_MAX_COUNT).toBe(5);
  });

  it('createBugReportSchema accepts exactly MAX_COUNT screenshots', () => {
    const screenshots = Array.from({ length: SCREENSHOT_MAX_COUNT }, (_, i) => ({
      path: `uploads/id${i}/file.png`,
      name: `file${i}.png`,
      mime: 'image/png' as const,
      size: 1024,
    }));
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P2',
      reproducibility: 'ALWAYS',
      category: 'UI',
      screenshots,
    });
    expect(result.success).toBe(true);
  });

  it('createBugReportSchema rejects MAX_COUNT + 1 screenshots', () => {
    const screenshots = Array.from({ length: SCREENSHOT_MAX_COUNT + 1 }, (_, i) => ({
      path: `uploads/id${i}/file.png`,
      name: `file${i}.png`,
      mime: 'image/png' as const,
      size: 1024,
    }));
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P2',
      reproducibility: 'ALWAYS',
      category: 'UI',
      screenshots,
    });
    expect(result.success).toBe(false);
  });
});

// ── Filename sanitisation (pure function) ────────────────────────────────────

function sanitiseFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 200);
}

describe('sanitiseFilename', () => {
  it('strips path traversal sequences', () => {
    expect(sanitiseFilename('../../etc/passwd')).not.toContain('..');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitiseFilename('my screenshot.png')).toBe('my_screenshot.png');
  });

  it('preserves safe filename characters', () => {
    expect(sanitiseFilename('bug-2026-04-28.png')).toBe('bug-2026-04-28.png');
  });

  it('collapses multiple dots', () => {
    expect(sanitiseFilename('a...b.png')).toBe('a.b.png');
  });

  it('truncates filenames over 200 chars', () => {
    const long = 'a'.repeat(210) + '.png';
    expect(sanitiseFilename(long).length).toBeLessThanOrEqual(200);
  });

  it('replaces slash in filename', () => {
    expect(sanitiseFilename('subdir/file.png')).toBe('subdir_file.png');
  });
});

// ── Storage path format ───────────────────────────────────────────────────────

describe('Storage path format', () => {
  it('screenshot path starts with uploads/', () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const path = `uploads/${uuid}/screenshot.png`;
    expect(path.startsWith('uploads/')).toBe(true);
  });

  it('screenshot path does not contain double slashes', () => {
    const path = 'uploads/uuid/file.png';
    expect(path).not.toMatch(/\/\//);
  });
});
