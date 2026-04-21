import { cache } from 'react';
import db from '@/lib/db';

// Default values (used when DB is unavailable or not yet configured)
const DEFAULT_POINTS = {
  POST_CREATED: 5,
  COMMENT_CREATED: 2,
  LIKE_RECEIVED: 1,
  LESSON_COMPLETED: 10,
} as const;

const DEFAULT_LEVEL_THRESHOLDS = [0, 50, 120, 210, 320, 450, 600, 770, 960, 1170];

/**
 * Fetch gamification config from the DB (CommunitySettings).
 * Uses React.cache() so the query runs at most once per request.
 * Falls back to hardcoded defaults if the DB read fails.
 */
export const getGamificationConfig = cache(async () => {
  try {
    const settings = await db.communitySettings.findFirst({
      select: {
        gamifyPointsPost: true,
        gamifyPointsComment: true,
        gamifyPointsLike: true,
        gamifyPointsLesson: true,
        gamifyLevelThresholds: true,
      },
    });

    if (!settings) {
      return { points: DEFAULT_POINTS, levelThresholds: DEFAULT_LEVEL_THRESHOLDS };
    }

    const thresholds = settings.gamifyLevelThresholds
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    return {
      points: {
        POST_CREATED: settings.gamifyPointsPost,
        COMMENT_CREATED: settings.gamifyPointsComment,
        LIKE_RECEIVED: settings.gamifyPointsLike,
        LESSON_COMPLETED: settings.gamifyPointsLesson,
      },
      levelThresholds: thresholds.length >= 2 ? thresholds : DEFAULT_LEVEL_THRESHOLDS,
    };
  } catch {
    // Fail-open: use defaults if DB is unavailable
    return { points: DEFAULT_POINTS, levelThresholds: DEFAULT_LEVEL_THRESHOLDS };
  }
});

// ── Synchronous helpers (used by client components / quick calculations) ──

// Re-export defaults for static/synchronous usage where DB isn't available
export const POINTS = DEFAULT_POINTS;
export const LEVEL_THRESHOLDS = DEFAULT_LEVEL_THRESHOLDS;

export function calculateLevel(points: number, thresholds: readonly number[] = DEFAULT_LEVEL_THRESHOLDS): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getPointsToNextLevel(
  points: number,
  currentLevel: number,
  thresholds: readonly number[] = DEFAULT_LEVEL_THRESHOLDS,
): {
  current: number;
  required: number;
  progress: number;
} | null {
  if (currentLevel >= thresholds.length) return null; // Max level

  const currentThreshold = thresholds[currentLevel - 1];
  const nextThreshold = thresholds[currentLevel];
  const pointsInLevel = points - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;

  return {
    current: pointsInLevel,
    required: pointsNeeded,
    progress: (pointsInLevel / pointsNeeded) * 100,
  };
}
