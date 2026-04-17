'use server';

import db from '@/lib/db';
import { POINTS, calculateLevel } from '@/lib/gamification-config';
import { requireAuth } from '@/lib/auth-guards';

export type PointAction = keyof typeof POINTS;

export async function awardPoints(
  userId: string,
  action: PointAction
): Promise<{ levelUp: boolean; newLevel?: number }> {
  await requireAuth();
  const amount = POINTS[action];

  // Use transaction to ensure atomicity
  const result = await db.$transaction(async (tx) => {
    // 1. Log the points event (for time-based leaderboards)
    await tx.pointsEvent.create({
      data: {
        userId,
        amount,
        action,
      },
    });

    // 2. Atomic increment points and get updated user
    const user = await tx.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
      select: { points: true, level: true },
    });

    // 3. Check if user crossed level threshold
    const newLevel = calculateLevel(user.points);
    if (newLevel > user.level) {
      await tx.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
      return { levelUp: true, newLevel };
    }

    return { levelUp: false };
  });

  return result;
}
