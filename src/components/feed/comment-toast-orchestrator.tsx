'use client';

import { useEffect, useRef, useState } from 'react';
import type { BadgeType } from '@/generated/prisma/client';
import { BADGE_CONFIG } from '@/components/gamification/badge-config';
import { COMMENT_TOAST_OFFSETS } from './comment-toast-offsets';

/**
 * Celebration toast state + renderer for the comment input.
 *
 * Owns the 5-toast coordination logic that was previously inlined in
 * CommentInput. Each toast has its own setter, its own auto-dismiss timer,
 * and its own stair-step vertical offset imported from
 * `comment-toast-offsets.ts` so the convention stays in one place.
 *
 * Usage:
 *   const toasts = useCommentToasts();
 *   toasts.firePoints();
 *   toasts.fireLevelUp(N);
 *   // ...
 *   return <div className="relative">{sendButton} <toasts.Toasts /></div>;
 */
export function useCommentToasts() {
  const [showPoints, setShowPoints] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [streakSaved, setStreakSaved] = useState<number | null>(null);
  const [badge, setBadge] = useState<BadgeType | null>(null);

  // Each toast gets its own timer ref so re-firing one doesn't cancel the others.
  const pointsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unmount cleanup so a quick-navigating user doesn't leak timers.
  useEffect(() => {
    return () => {
      if (pointsTimer.current) clearTimeout(pointsTimer.current);
      if (levelTimer.current) clearTimeout(levelTimer.current);
      if (streakTimer.current) clearTimeout(streakTimer.current);
      if (streakSavedTimer.current) clearTimeout(streakSavedTimer.current);
      if (badgeTimer.current) clearTimeout(badgeTimer.current);
    };
  }, []);

  function firePoints() {
    if (pointsTimer.current) clearTimeout(pointsTimer.current);
    setShowPoints(true);
    pointsTimer.current = setTimeout(() => setShowPoints(false), 950);
  }

  function fireLevelUp(level: number) {
    if (levelTimer.current) clearTimeout(levelTimer.current);
    setLevelUp(level);
    levelTimer.current = setTimeout(() => setLevelUp(null), 1600);
  }

  function fireStreak(day: number) {
    if (streakTimer.current) clearTimeout(streakTimer.current);
    setStreak(day);
    streakTimer.current = setTimeout(() => setStreak(null), 2000);
  }

  function fireStreakSaved(day: number) {
    if (streakSavedTimer.current) clearTimeout(streakSavedTimer.current);
    setStreakSaved(day);
    streakSavedTimer.current = setTimeout(() => setStreakSaved(null), 2100);
  }

  function fireBadge(type: BadgeType) {
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    setBadge(type);
    badgeTimer.current = setTimeout(() => setBadge(null), 2400);
  }

  function Toasts() {
    return (
      <>
        {showPoints && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute ${COMMENT_TOAST_OFFSETS.points} left-1/2 -translate-x-1/2 text-xs font-semibold text-green-500 dark:text-green-400 whitespace-nowrap animate-points-float`}
          >
            +2 pts
          </span>
        )}
        {levelUp && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute ${COMMENT_TOAST_OFFSETS.level} left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-500 dark:text-yellow-400 whitespace-nowrap animate-level-burst`}
          >
            Level {levelUp}!
          </span>
        )}
        {streak && (
          <span
            role="status"
            aria-live="polite"
            className={`pointer-events-none absolute ${COMMENT_TOAST_OFFSETS.streak} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/40 text-xs font-semibold whitespace-nowrap shadow-sm animate-streak-pop`}
          >
            <span aria-hidden="true">🔥</span>
            <span>{streak}-day streak!</span>
          </span>
        )}
        {streakSaved && (
          <span
            role="status"
            aria-live="polite"
            className={`pointer-events-none absolute ${COMMENT_TOAST_OFFSETS.streakSaved} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold whitespace-nowrap shadow-sm animate-streak-saved`}
          >
            <span aria-hidden="true">🛡️</span>
            <span>{streakSaved}-day streak saved!</span>
          </span>
        )}
        {badge && (
          <span
            role="status"
            aria-live="polite"
            className={`pointer-events-none absolute ${COMMENT_TOAST_OFFSETS.badge} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold whitespace-nowrap shadow-sm animate-badge-pop`}
          >
            <span aria-hidden="true">{BADGE_CONFIG[badge].emoji}</span>
            <span>Badge unlocked: {BADGE_CONFIG[badge].label}!</span>
          </span>
        )}
      </>
    );
  }

  return {
    firePoints,
    fireLevelUp,
    fireStreak,
    fireStreakSaved,
    fireBadge,
    Toasts,
  };
}
