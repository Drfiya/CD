'use server';

/**
 * CR9 F2: Cross-device theme preference.
 *
 * Session-scoped: writes only to `session.user.id`, never accepts a userId arg,
 * so there is no IDOR surface. Fire-and-forget from `ThemeToggle` (non-blocking).
 *
 * Keeping this file as a public `'use server'` is safe per the CR5 rule: the
 * function trusts ONLY the session identity, not any caller-provided field.
 * Do NOT move to `theme-actions-internal.ts`.
 */

import { z } from 'zod';
import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';

const themeSchema = z.enum(['dark', 'light']);

export async function updateThemePreference(
  theme: 'dark' | 'light'
): Promise<{ success?: boolean; error?: string }> {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return { error: 'Not authenticated' };
  }

  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) {
    return { error: 'Invalid theme' };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { themePreference: parsed.data },
    });
    return { success: true };
  } catch {
    return { error: 'Update failed' };
  }
}
