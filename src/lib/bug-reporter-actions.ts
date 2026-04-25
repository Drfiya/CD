'use server';

/**
 * CR14 — Bug Reporter server actions.
 *
 * All actions are admin-only (requireAdmin). The workflow:
 *   1. `requestScreenshotUploadUrl` — issues a short-lived signed upload URL.
 *      Client uploads directly to Supabase Storage; path is returned.
 *   2. `createBugReport` — persists report + screenshot metadata after upload.
 *   3. `getBugReports` — paginated list with status/priority filters.
 *   4. `updateBugStatus` — status-only mutation for quick triage.
 *   5. `getScreenshotSignedUrl` — issues a 1 h read URL for a screenshot.
 *
 * Storage layout: `{bugReportId}/{screenshotId}/{sanitisedFilename}`
 * (reportId not yet known at upload time → pre-signed paths use a UUID placeholder)
 * Actual layout used: `uploads/{uuid}/{sanitisedFilename}`
 * After createBugReport the paths are stored as-is (they're tied to the bucket,
 * not to a route, so no path-confinement check is needed beyond ownership).
 */

import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth-guards';
import db from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createBugReportSchema,
  updateBugStatusSchema,
  requestScreenshotUploadUrlSchema,
  getBugReportsSchema,
  getScreenshotSignedUrlSchema,
} from '@/lib/validations/bug-reporter';

const BUCKET = 'bug-screenshots';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
const SIGNED_UPLOAD_TTL_SECONDS = 300; // 5 minutes — plenty for a screenshot

function sanitiseFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 200);
}

/**
 * Request a signed upload URL for a bug screenshot.
 * The client uploads directly to Supabase Storage, then passes the returned
 * `path` to `createBugReport` in the `screenshots` array.
 */
export async function requestScreenshotUploadUrl(input: {
  filename: string;
  mime: string;
  size: number;
}) {
  await requireAdmin();

  const parsed = requestScreenshotUploadUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { filename, mime, size } = parsed.data;

  if (size > 5 * 1024 * 1024) {
    return { error: 'Screenshot exceeds 5 MB limit' };
  }

  const sanitised = sanitiseFilename(filename);
  const uploadId = randomUUID();
  const path = `uploads/${uploadId}/${sanitised}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[bug-reporter] createSignedUploadUrl failed:', error);
    return { error: 'Upload URL could not be issued' };
  }

  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
    sanitisedName: sanitised,
    mime,
    size,
    ttlSeconds: SIGNED_UPLOAD_TTL_SECONDS,
  };
}

/**
 * Create a bug report with optional screenshots.
 * The paths in `screenshots` must correspond to objects already uploaded
 * via `requestScreenshotUploadUrl`.
 */
export async function createBugReport(input: {
  title: string;
  description: string;
  priority: string;
  reproducibility: string;
  category: string;
  pageUrl?: string;
  screenshots?: Array<{
    path: string;
    name: string;
    mime: string;
    size: number;
  }>;
}) {
  const session = await requireAdmin();

  const parsed = createBugReportSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { title, description, priority, reproducibility, category, pageUrl, screenshots } =
    parsed.data;

  try {
    const report = await db.bugReport.create({
      data: {
        title,
        description,
        priority: priority as 'P1' | 'P2' | 'P3' | 'P4',
        reproducibility: reproducibility as 'ALWAYS' | 'SOMETIMES' | 'ONCE',
        category,
        pageUrl,
        reporterId: session.user.id,
        screenshots: {
          create: screenshots.map((s) => ({
            path: s.path,
            name: s.name,
            mime: s.mime,
            size: s.size,
          })),
        },
      },
      include: { screenshots: true },
    });

    return { success: true as const, report };
  } catch (err) {
    console.error('[bug-reporter] createBugReport failed:', err);
    return { error: 'Failed to create bug report' };
  }
}

export type BugReportListItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  reproducibility: string;
  category: string;
  pageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  reporter: { id: string; name: string | null; image: string | null };
  _count: { screenshots: number };
};

/**
 * Paginated list of bug reports. Admin-only.
 * Returns `{ items, nextCursor }` for keyset pagination.
 */
export async function getBugReports(opts?: {
  status?: string;
  priority?: string;
  cursor?: string;
  take?: number;
}) {
  await requireAdmin();

  const parsed = getBugReportsSchema.safeParse(opts ?? {});
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { status, priority, cursor, take } = parsed.data;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (priority) where['priority'] = priority;

  const rows = await db.bugReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      title: true,
      priority: true,
      status: true,
      reproducibility: true,
      category: true,
      pageUrl: true,
      createdAt: true,
      updatedAt: true,
      reporter: { select: { id: true, name: true, image: true } },
      _count: { select: { screenshots: true } },
    },
  });

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return { items, nextCursor };
}

/**
 * Update the status of a bug report. Admin-only.
 */
export async function updateBugStatus(input: { id: string; status: string }) {
  await requireAdmin();

  const parsed = updateBugStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { id, status } = parsed.data;

  try {
    const updated = await db.bugReport.update({
      where: { id },
      data: { status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' },
      select: { id: true, status: true },
    });
    return { success: true as const, updated };
  } catch {
    return { error: 'Bug report not found or update failed' };
  }
}

/**
 * Issue a 1-hour signed read URL for a bug screenshot. Admin-only.
 */
export async function getScreenshotSignedUrl(input: { screenshotId: string }) {
  await requireAdmin();

  const parsed = getScreenshotSignedUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const screenshot = await db.bugScreenshot.findUnique({
    where: { id: parsed.data.screenshotId },
    select: { id: true, path: true, mime: true, name: true },
  });
  if (!screenshot) return { error: 'Screenshot not found' };

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(screenshot.path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error('[bug-reporter] createSignedUrl failed:', error);
    return { error: 'Could not issue signed URL' };
  }

  return {
    signedUrl: data.signedUrl,
    expiresInSec: SIGNED_URL_TTL_SECONDS,
    mime: screenshot.mime,
    name: screenshot.name,
  };
}

/**
 * Fetch bug reports for the PDF print route (Open + In Progress only).
 * Returns reports with signed screenshot URLs embedded.
 * Admin-only; called server-side from the print route handler.
 */
export async function getBugReportsForPrint() {
  await requireAdmin();

  const reports = await db.bugReport.findMany({
    where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: {
      reporter: { select: { name: true, image: true } },
      screenshots: { select: { id: true, path: true, mime: true, name: true } },
    },
  });

  const supabase = createAdminClient();

  const reportsWithUrls = await Promise.all(
    reports.map(async (r) => {
      const screenshotsWithUrls = await Promise.all(
        r.screenshots.map(async (s) => {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(s.path, SIGNED_URL_TTL_SECONDS);
          return { ...s, signedUrl: data?.signedUrl ?? null };
        }),
      );
      return { ...r, screenshots: screenshotsWithUrls };
    }),
  );

  return reportsWithUrls;
}
