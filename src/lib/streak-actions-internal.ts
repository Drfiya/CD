import db from '@/lib/db';

/**
 * Internal streak-tracking routine.
 *
 * Not exposed as a `'use server'` module — reachable only from other server
 * code. Callers pass a `userId` that is typically the session user (the person
 * who just posted, commented, liked, or completed a lesson). We never want
 * clients to be able to bump an arbitrary user's streak, which is why the
 * file omits `'use server'`.
 *
 * Design:
 * - Same-UTC-day re-entry → no-op, returns current state
 * - Next consecutive UTC day → streak += 1
 * - Gap of 2 UTC days WITH a freeze token → consume one token, treat as +1
 *   continuation (returns `streakSaved: prevStreak`)
 * - Gap of ≥2 UTC days without tokens → streak reset to 1
 * - `longestStreak` monotonically non-decreasing
 * - Milestones (7 / 14 / 30) only fire on the call that *crosses into* them
 *
 * Streak Freeze (B1):
 * - Auto-awarded at every 7-day boundary (7, 14, 21, 28) up to a cap of 3.
 * - Awarded BEFORE the milestone return so the celebration toast can read the
 *   already-incremented `freezeTokens` count if the UI ever wants to show it.
 * - Capped to prevent indefinite stockpiling.
 */

const MS_PER_DAY = 86_400_000;
const FREEZE_TOKEN_CAP = 3;
const FREEZE_AWARD_INTERVAL = 7;

function startOfUtcDay(d: Date): Date {
  const clone = new Date(d);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / MS_PER_DAY,
  );
}

export interface TouchStreakResult {
  currentStreak: number;
  milestone: number | null;
  /** Set to the streak length that was preserved when a freeze token was consumed (else null). */
  streakSaved: number | null;
}

export async function touchStreak(userId: string): Promise<TouchStreakResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        freezeTokens: true,
      },
    });
    if (!user) return { currentStreak: 0, milestone: null, streakSaved: null };

    const now = new Date();
    const prevStreak = user.currentStreak;
    let newStreak: number;
    let streakSaved: number | null = null;
    let consumedFreezeToken = false;

    if (!user.lastActivityDate) {
      newStreak = 1;
    } else {
      const diff = daysBetween(now, user.lastActivityDate);
      if (diff === 0) {
        // Already counted today — no update needed
        return { currentStreak: prevStreak, milestone: null, streakSaved: null };
      } else if (diff === 1) {
        newStreak = prevStreak + 1;
      } else if (diff < 0) {
        // Clock skew or DST weirdness — defensive same-day treatment
        return { currentStreak: prevStreak, milestone: null, streakSaved: null };
      } else if (diff === 2 && user.freezeTokens > 0) {
        // Single missed day, freeze token available — preserve the streak.
        newStreak = prevStreak + 1;
        consumedFreezeToken = true;
        streakSaved = prevStreak;
      } else {
        newStreak = 1;
      }
    }

    // Award freeze tokens when crossing every 7-day boundary, capped.
    const prevMilestoneTokens = Math.floor(prevStreak / FREEZE_AWARD_INTERVAL);
    const newMilestoneTokens = Math.floor(newStreak / FREEZE_AWARD_INTERVAL);
    const tokensToAward = Math.max(0, newMilestoneTokens - prevMilestoneTokens);

    const tokensAfterConsume = consumedFreezeToken
      ? user.freezeTokens - 1
      : user.freezeTokens;
    const newFreezeTokens = Math.min(
      FREEZE_TOKEN_CAP,
      tokensAfterConsume + tokensToAward,
    );

    const newLongest = Math.max(user.longestStreak, newStreak);

    await db.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: now,
        freezeTokens: newFreezeTokens,
      },
    });

    const milestones = [7, 14, 30];
    const milestone =
      milestones.includes(newStreak) && newStreak > prevStreak ? newStreak : null;

    return { currentStreak: newStreak, milestone, streakSaved };
  } catch {
    // Never break the caller's action because the streak hook failed
    return { currentStreak: 0, milestone: null, streakSaved: null };
  }
}

// Exported for unit tests that want to pin deterministic date math.
export const __test__ = {
  startOfUtcDay,
  daysBetween,
  FREEZE_TOKEN_CAP,
  FREEZE_AWARD_INTERVAL,
};
