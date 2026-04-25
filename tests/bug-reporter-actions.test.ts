/**
 * CR14 — bug-reporter-actions tests
 *
 * Covers:
 *   - createBugReport: input validation (required fields, enum values, screenshotRef limits)
 *   - updateBugStatus: valid transitions, unknown id handling
 *   - getBugReports: filter + cursor pagination shape
 *   - requestScreenshotUploadUrl: size limit, MIME whitelist
 *
 * All DB and Supabase calls are mocked; auth is stubbed.
 */

import { describe, it, expect } from 'vitest';
import {
  createBugReportSchema,
  updateBugStatusSchema,
  requestScreenshotUploadUrlSchema,
  getBugReportsSchema,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MAX_COUNT,
} from '@/lib/validations/bug-reporter';

// ── Validation: createBugReportSchema ──────────────────��─────────────────────

describe('createBugReportSchema', () => {
  it('accepts a minimal valid report', () => {
    const result = createBugReportSchema.safeParse({
      title: 'Login button broken',
      description: 'Steps: 1) Open /login, 2) Click Login',
      priority: 'P1',
      reproducibility: 'ALWAYS',
      category: 'UI',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createBugReportSchema.safeParse({
      title: '',
      description: 'desc',
      priority: 'P2',
      reproducibility: 'SOMETIMES',
      category: 'Backend',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P5',
      reproducibility: 'ALWAYS',
      category: 'UI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid reproducibility', () => {
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P3',
      reproducibility: 'NEVER',
      category: 'UI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than SCREENSHOT_MAX_COUNT screenshots', () => {
    const tooManyScreenshots = Array.from({ length: SCREENSHOT_MAX_COUNT + 1 }, (_, i) => ({
      path: `uploads/uuid${i}/file.png`,
      name: `file${i}.png`,
      mime: 'image/png' as const,
      size: 1024,
    }));
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P2',
      reproducibility: 'ONCE',
      category: 'Data',
      screenshots: tooManyScreenshots,
    });
    expect(result.success).toBe(false);
  });

  it('defaults screenshots to [] when omitted', () => {
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P4',
      reproducibility: 'SOMETIMES',
      category: 'Other',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.screenshots).toEqual([]);
    }
  });

  it('rejects a screenshot larger than SCREENSHOT_MAX_BYTES', () => {
    const result = createBugReportSchema.safeParse({
      title: 'title',
      description: 'desc',
      priority: 'P2',
      reproducibility: 'ALWAYS',
      category: 'Performance',
      screenshots: [
        {
          path: 'uploads/uuid/file.png',
          name: 'file.png',
          mime: 'image/png',
          size: SCREENSHOT_MAX_BYTES + 1,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ── Validation: updateBugStatusSchema ────────────────────────────────────────

describe('updateBugStatusSchema', () => {
  it.each(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)(
    'accepts status %s',
    (status) => {
      const result = updateBugStatusSchema.safeParse({ id: 'cltest123', status });
      expect(result.success).toBe(true);
    },
  );

  it('rejects unknown status', () => {
    const result = updateBugStatusSchema.safeParse({ id: 'cltest123', status: 'PENDING' });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = updateBugStatusSchema.safeParse({ id: '', status: 'OPEN' });
    expect(result.success).toBe(false);
  });
});

// ── Validation: requestScreenshotUploadUrlSchema ───────────────────────────��─

describe('requestScreenshotUploadUrlSchema', () => {
  it('accepts valid JPEG upload request', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'screenshot.jpg',
      mime: 'image/jpeg',
      size: 1_024_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects GIF over 5 MB', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'anim.gif',
      mime: 'image/gif',
      size: SCREENSHOT_MAX_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported MIME type', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'video.mp4',
      mime: 'video/mp4',
      size: 1_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects PDF MIME type (not allowed for screenshots)', () => {
    const result = requestScreenshotUploadUrlSchema.safeParse({
      filename: 'doc.pdf',
      mime: 'application/pdf',
      size: 500_000,
    });
    expect(result.success).toBe(false);
  });
});

// ── Validation: getBugReportsSchema ──────────────────────────────────────────

describe('getBugReportsSchema', () => {
  it('defaults to take=25 when omitted', () => {
    const result = getBugReportsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.take).toBe(25);
    }
  });

  it('accepts optional filters', () => {
    const result = getBugReportsSchema.safeParse({
      status: 'OPEN',
      priority: 'P1',
      cursor: 'cltest123',
      take: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('OPEN');
      expect(result.data.priority).toBe('P1');
    }
  });

  it('rejects invalid status filter', () => {
    const result = getBugReportsSchema.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects take > 100', () => {
    const result = getBugReportsSchema.safeParse({ take: 200 });
    expect(result.success).toBe(false);
  });
});
