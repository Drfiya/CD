import db from '@/lib/db';
import { BadgeType } from '@/generated/prisma/client';
import { isProfileComplete } from '@/lib/profile-helpers';
import type { ActivationState } from '@/types/activation';

/**
 * Internal activation-state reader.
 *
 * This file deliberately does NOT carry `'use server'` — it is module-level
 * server code and is NOT reachable as a Next.js server-action endpoint. Only
 * code running inside the Node runtime can import and call it.
 *
 * Accepts an arbitrary `userId` argument; callers must supply a value they
 * already own (typically `session.user.id`). Because no RPC endpoint is
 * attached, forged-`userId` requests via a crafted POST are impossible.
 *
 * Design pattern mirrors `badge-actions-internal.ts` / `notification-actions-internal.ts`
 * (codified in `directives/common_issues.md` → Module Architecture, CR5 R2).
 */
export async function getActivationState(userId: string): Promise<ActivationState> {
  const [user, enrollmentCount, postCount, welcomeBadge] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, bio: true, image: true, activationChecklistDismissedAt: true },
    }),
    db.enrollment.count({ where: { userId } }),
    db.post.count({ where: { authorId: userId } }),
    db.badge.findUnique({
      where: { userId_type: { userId, type: BadgeType.WELCOME } },
      select: { id: true },
    }),
  ]);

  return {
    signals: {
      signUp: true,
      profile: user ? isProfileComplete(user) : false,
      enrollment: enrollmentCount >= 1,
      firstPost: postCount >= 1,
    },
    welcomeEarned: !!welcomeBadge,
    dismissed: !!user?.activationChecklistDismissedAt,
  };
}
