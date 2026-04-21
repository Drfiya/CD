import db from '@/lib/db';
import { BadgeType } from '@/generated/prisma/client';
import { isProfileComplete } from '@/lib/profile-helpers';

/**
 * Internal badge-awarding routine.
 *
 * This file deliberately does NOT carry `'use server'` — which means it is
 * module-level server code and is NOT reachable as a Next.js server-action
 * endpoint. Only code running inside the Node runtime can import and call it.
 *
 * Use from server modules that legitimately need to award badges to a
 * userId that is NOT the current session user (e.g. like-actions awarding
 * to the post author). Client callers must go through the public
 * `checkAndAwardBadges` in `badge-actions.ts`, which session-scopes the
 * userId to prevent IDOR compute-DoS abuse.
 *
 * Design notes:
 * - Fire-and-forget: must not block the user-facing action response
 * - Idempotent: the `@@unique([userId, type])` constraint silently rejects duplicate awards
 * - Errors swallowed at call site via `.catch(() => {})`
 * - Returns the list of newly-earned badges for client-side toast firing
 */
export async function checkAndAwardBadgesInternal(userId: string): Promise<BadgeType[]> {
  const [user, postCount, commentCount, lessonsCompleted, receivedLikes, leaderboard, enrollmentCount] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { level: true, points: true, currentStreak: true, name: true, bio: true, image: true },
      }),
      db.post.count({ where: { authorId: userId } }),
      db.comment.count({ where: { authorId: userId } }),
      // LessonProgress rows are only created on completion — count = completed count
      db.lessonProgress.count({ where: { userId } }),
      db.postLike.count({ where: { post: { authorId: userId } } }),
      db.user.findMany({
        orderBy: { points: 'desc' },
        take: 10,
        select: { id: true },
      }),
      db.enrollment.count({ where: { userId } }),
    ]);

  if (!user) return [];

  const isTop10 = leaderboard.some((u) => u.id === userId);
  // WELCOME condition: activation funnel complete (profile + ≥1 enrollment + ≥1 post)
  const welcomeEarned =
    isProfileComplete(user) && enrollmentCount >= 1 && postCount >= 1;

  const candidates: { type: BadgeType; condition: boolean }[] = [
    { type: BadgeType.FIRST_POST, condition: postCount >= 1 },
    { type: BadgeType.CONVERSATIONALIST, condition: commentCount >= 10 },
    { type: BadgeType.POPULAR, condition: receivedLikes >= 25 },
    { type: BadgeType.SCHOLAR, condition: lessonsCompleted >= 5 },
    { type: BadgeType.LEVEL_5, condition: (user.level ?? 1) >= 5 },
    { type: BadgeType.TOP_10, condition: isTop10 },
    { type: BadgeType.STREAK_7, condition: (user.currentStreak ?? 0) >= 7 },
    { type: BadgeType.WELCOME, condition: welcomeEarned },
  ];

  const newBadges: BadgeType[] = [];
  for (const { type, condition } of candidates) {
    if (!condition) continue;
    try {
      await db.badge.create({ data: { userId, type } });
      newBadges.push(type);
    } catch {
      // @@unique violation — badge already exists, skip
    }
  }

  return newBadges;
}
