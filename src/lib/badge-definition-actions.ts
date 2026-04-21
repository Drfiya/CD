'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guards';
import { BadgeType } from '@/generated/prisma/client';

/**
 * Admin-facing server actions for BadgeDefinition.
 *
 * All mutations are session-scoped to admins via `requireAdmin()`. Public API:
 *  - updateBadgeDefinition: edit label / description / emoji / color / condition
 *  - createCustomBadgeDefinition: new manual-grant custom badge
 *  - deleteBadgeDefinition: remove a custom badge (system badges are protected)
 *  - grantCustomBadge: manually award a custom badge to a user
 *  - revokeCustomBadge: remove an admin-granted badge from a user
 */

const KEY_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const definitionUpdateSchema = z.object({
  label: z.string().min(1).max(60).trim(),
  description: z.string().min(1).max(280).trim(),
  emoji: z.string().min(1).max(16).trim(),
  colorHex: z.string().regex(HEX_REGEX, 'Invalid hex color'),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.coerce.boolean(),
});

const customCreateSchema = z.object({
  key: z.string().regex(KEY_REGEX, 'Key must be lowercase kebab-case').min(3).max(40),
  label: z.string().min(1).max(60).trim(),
  description: z.string().min(1).max(280).trim(),
  emoji: z.string().min(1).max(16).trim(),
  colorHex: z.string().regex(HEX_REGEX, 'Invalid hex color'),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(500),
});

function firstFieldError(errors: Record<string, string[] | undefined>): string | null {
  for (const v of Object.values(errors)) {
    if (v && v.length > 0) return v[0];
  }
  return null;
}

export async function updateBadgeDefinition(
  id: string,
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized — admin role required' };
  }

  const parsed = definitionUpdateSchema.safeParse({
    label: formData.get('label'),
    description: formData.get('description'),
    emoji: formData.get('emoji'),
    colorHex: formData.get('colorHex'),
    sortOrder: formData.get('sortOrder') ?? 100,
    isActive: formData.get('isActive') === 'true' || formData.get('isActive') === 'on',
  });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? 'Invalid input' };
  }

  const iconUrlRaw = formData.get('iconUrl');
  const iconUrl =
    typeof iconUrlRaw === 'string' && iconUrlRaw.trim().length > 0 ? iconUrlRaw.trim() : null;

  await db.badgeDefinition.update({
    where: { id },
    data: {
      ...parsed.data,
      iconUrl,
    },
  });

  revalidatePath('/admin/badges');
  return { success: true };
}

export async function createCustomBadgeDefinition(
  formData: FormData
): Promise<{ success?: true; id?: string; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized — admin role required' };
  }

  const parsed = customCreateSchema.safeParse({
    key: formData.get('key'),
    label: formData.get('label'),
    description: formData.get('description'),
    emoji: formData.get('emoji'),
    colorHex: formData.get('colorHex'),
    sortOrder: formData.get('sortOrder') ?? 500,
  });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? 'Invalid input' };
  }

  const existing = await db.badgeDefinition.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return { error: `A badge with key "${parsed.data.key}" already exists` };
  }

  const created = await db.badgeDefinition.create({
    data: {
      ...parsed.data,
      type: null,
      condition: 'manual',
    },
  });

  revalidatePath('/admin/badges');
  return { success: true, id: created.id };
}

export async function deleteBadgeDefinition(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized — admin role required' };
  }

  const def = await db.badgeDefinition.findUnique({ where: { id } });
  if (!def) return { error: 'Badge definition not found' };
  if (def.type !== null) {
    return { error: 'System badges cannot be deleted (only edited)' };
  }

  await db.badgeDefinition.delete({ where: { id } });

  revalidatePath('/admin/badges');
  return { success: true };
}

/**
 * Manually grant a custom (condition='manual') badge to a user. Idempotent via
 * the partial @@unique([userId, customDefinitionId]) constraint.
 */
export async function grantCustomBadge(
  userId: string,
  definitionId: string
): Promise<{ success?: true; alreadyOwned?: true; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized — admin role required' };
  }

  if (!userId || !definitionId) return { error: 'Missing userId or definitionId' };

  const def = await db.badgeDefinition.findUnique({ where: { id: definitionId } });
  if (!def) return { error: 'Badge definition not found' };
  if (def.type !== null) {
    return { error: 'Only custom badges can be manually granted' };
  }
  if (!def.isActive) {
    return { error: 'Badge is inactive' };
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { error: 'User not found' };

  try {
    await db.badge.create({
      data: {
        userId,
        type: null,
        customDefinitionId: definitionId,
      } as unknown as {
        userId: string;
        type: BadgeType | null;
        customDefinitionId: string;
      },
    });
  } catch {
    // Partial @@unique violation — user already has this custom badge.
    return { success: true, alreadyOwned: true };
  }

  revalidatePath('/admin/badges');
  revalidatePath(`/members/${userId}`);
  return { success: true };
}

export async function revokeCustomBadge(
  userId: string,
  definitionId: string
): Promise<{ success?: true; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized — admin role required' };
  }

  const deleted = await db.badge.deleteMany({
    where: { userId, customDefinitionId: definitionId },
  });

  if (deleted.count === 0) return { error: 'User does not have this badge' };

  revalidatePath('/admin/badges');
  revalidatePath(`/members/${userId}`);
  return { success: true };
}
