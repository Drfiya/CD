import { z } from 'zod';

// Basic Tiptap document structure validation
const tiptapNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string(),
    content: z.array(tiptapNodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(z.object({ type: z.string() }).passthrough()).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()
);

const tiptapDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema).optional(),
}).passthrough();

// Video embed schema
const videoEmbedSchema = z.object({
  service: z.enum(['youtube', 'vimeo', 'loom']),
  id: z.string().min(1),
  url: z.string().url(),
});

// Post validation schema
export const postSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be 200 characters or less')
    .optional()
    .transform((val) => val?.trim() || null),
  content: z
    .string()
    .min(1, 'Content is required')
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        throw new Error('Invalid JSON content');
      }
    })
    .pipe(tiptapDocumentSchema),
  embeds: z
    .string()
    .optional()
    .default('[]')
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    })
    .pipe(z.array(videoEmbedSchema)),
  gifs: z
    .string()
    .optional()
    .default('[]')
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    })
    .pipe(z.array(z.string().url())),
});

// Input type for forms (before transforms)
export type PostInput = z.input<typeof postSchema>;

// Output type (after transforms)
export type PostData = z.output<typeof postSchema>;
