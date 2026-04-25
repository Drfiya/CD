import { z } from 'zod';

export const BUG_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const BUG_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_REPRODUCIBILITIES = ['ALWAYS', 'SOMETIMES', 'ONCE'] as const;
export type BugReproducibility = (typeof BUG_REPRODUCIBILITIES)[number];

export const BUG_CATEGORIES = [
  'UI',
  'Performance',
  'Backend',
  'Auth',
  'Data',
  'Other',
] as const;
export type BugCategory = (typeof BUG_CATEGORIES)[number];

export const SCREENSHOT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export type ScreenshotMime = (typeof SCREENSHOT_ALLOWED_MIMES)[number];

export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const SCREENSHOT_MAX_COUNT = 5;

const screenshotRefSchema = z.object({
  path: z.string().min(1).max(512),
  name: z.string().min(1).max(255),
  mime: z.enum(SCREENSHOT_ALLOWED_MIMES),
  size: z
    .number()
    .int()
    .positive()
    .max(SCREENSHOT_MAX_BYTES, 'Screenshot exceeds 5 MB limit'),
});

export type ScreenshotRef = z.infer<typeof screenshotRefSchema>;

export const createBugReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(10_000, 'Description too long'),
  priority: z.enum(BUG_PRIORITIES),
  reproducibility: z.enum(BUG_REPRODUCIBILITIES),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  pageUrl: z.string().max(2048, 'URL too long').default(''),
  screenshots: z
    .array(screenshotRefSchema)
    .max(SCREENSHOT_MAX_COUNT, `Max ${SCREENSHOT_MAX_COUNT} screenshots`)
    .default([]),
});

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;

export const updateBugStatusSchema = z.object({
  id: z.string().min(1, 'Bug report id required'),
  status: z.enum(BUG_STATUSES),
});

export const requestScreenshotUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.enum(SCREENSHOT_ALLOWED_MIMES),
  size: z
    .number()
    .int()
    .positive()
    .max(SCREENSHOT_MAX_BYTES, 'Screenshot exceeds 5 MB limit'),
});

export const getBugReportsSchema = z.object({
  status: z.enum(BUG_STATUSES).optional(),
  priority: z.enum(BUG_PRIORITIES).optional(),
  cursor: z.string().optional(),
  take: z.number().int().positive().max(100).default(25),
});

export const getScreenshotSignedUrlSchema = z.object({
  screenshotId: z.string().min(1),
});
