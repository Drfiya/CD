'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

/**
 * Mark the banner dismissed for the current session user.
 * Session-scoped: no other user's record can be modified.
 */
export async function dismissActivationChecklist() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { activationChecklistDismissedAt: new Date() },
    });
  } catch {
    // Fail silently — UI optimistic dismiss is already in place
  }
}
