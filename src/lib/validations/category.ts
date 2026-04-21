import { z } from 'zod';

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be under 50 characters')
    .trim(),
  color: z
    .string()
    .regex(hexColorRegex, 'Color must be a valid hex color (e.g., #6366f1)'),
  description: z
    .string()
    .max(280, 'Description must be under 280 characters')
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CategoryInput = z.infer<typeof categorySchema>;
