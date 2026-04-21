'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BadgeType } from '@/generated/prisma/client';
import { checkAndAwardBadgesInternal } from '@/lib/badge-actions-internal';

/**
 * Public server action — callable from client and other server modules.
 *
 * IDOR guard: caller must have a valid session AND the requested userId must
 * match `session.user.id`. This prevents arbitrary clients from invoking the
 * 5-query parallel badge computation against other users' ids (compute-DoS).
 *
 * For server-internal awards to a different user (e.g. post author of a liked
 * post), call `checkAndAwardBadgesInternal` directly (import from
 * `@/lib/badge-actions-internal`). That module is not marked `'use server'`
 * and therefore has no RPC endpoint attached.
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeType[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  if (session.user.id !== userId) return [];
  return checkAndAwardBadgesInternal(userId);
}
