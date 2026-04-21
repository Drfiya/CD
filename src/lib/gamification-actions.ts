'use server';

import db from '@/lib/db';
import { POINTS, calculateLevel, getGamificationConfig } from '@/lib/gamification-config';
import { requireAuth } from '@/lib/auth-guards';

export type PointAction = keyof typeof POINTS;

export async function awardPoints(
  userId: string,
  action: PointAction
): Promise<{ levelUp: boolean; newLevel?: number; leveledUp: number | null }> {
  await requireAuth();

  // Read config from DB (cached per request), fall back to defaults
  const config = await getGamificationConfig();
  const amount = config.points[action];

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

    // 3. Check if user crossed level threshold (using DB thresholds)
    const newLevel = calculateLevel(user.points, config.levelThresholds);
    if (newLevel > user.level) {
      await tx.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
      return { levelUp: true, newLevel, leveledUp: newLevel };
    }

    return { levelUp: false, leveledUp: null };
  });

  return result;
}

