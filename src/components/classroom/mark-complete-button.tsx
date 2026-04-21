'use client';

import { useOptimistic, useTransition, useState, useRef, useEffect } from 'react';
import { toggleLessonComplete } from '@/lib/progress-actions';
import { BADGE_CONFIG } from '@/components/gamification/badge-config';
import type { BadgeType } from '@/generated/prisma/client';
import { MARK_COMPLETE_TOAST_OFFSETS } from '@/components/feed/comment-toast-offsets';

interface MarkCompleteButtonProps {
  lessonId: string;
  initialCompleted: boolean;
}

export function MarkCompleteButton({
  lessonId,
  initialCompleted,
}: MarkCompleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [badgeToast, setBadgeToast] = useState<BadgeType | null>(null);
  const [streakToast, setStreakToast] = useState<number | null>(null);
  const [streakSavedToast, setStreakSavedToast] = useState<number | null>(null);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
      if (streakSavedTimerRef.current) clearTimeout(streakSavedTimerRef.current);
    };
  }, []);

  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    initialCompleted,
    (_state: boolean, newCompleted: boolean) => newCompleted
  );

  const handleClick = () => {
    const newCompleted = !optimisticCompleted;

    startTransition(async () => {
      setOptimisticCompleted(newCompleted);
      const result = await toggleLessonComplete(lessonId);
      if ('newBadges' in result && result.newBadges && result.newBadges.length > 0) {
        const latest = result.newBadges[result.newBadges.length - 1];
        setBadgeToast(latest);
        if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = setTimeout(() => setBadgeToast(null), 2400);
      }
      if ('streakMilestone' in result && result.streakMilestone) {
        setStreakToast(result.streakMilestone);
        if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
        streakTimerRef.current = setTimeout(() => setStreakToast(null), 2000);
      }
      if ('streakSaved' in result && result.streakSaved) {
        setStreakSavedToast(result.streakSaved);
        if (streakSavedTimerRef.current) clearTimeout(streakSavedTimerRef.current);
        streakSavedTimerRef.current = setTimeout(() => setStreakSavedToast(null), 2100);
      }
    });
  };

  return (
    <div className="relative inline-block">
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        optimisticCompleted
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={optimisticCompleted ? 'Mark as incomplete' : 'Mark as complete'}
    >
      {optimisticCompleted ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
          Completed
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
          Mark Complete
        </>
      )}
    </button>
      {badgeToast && (
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute ${MARK_COMPLETE_TOAST_OFFSETS.badge} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold whitespace-nowrap shadow-sm animate-badge-pop`}
        >
          <span aria-hidden="true">{BADGE_CONFIG[badgeToast].emoji}</span>
          <span>Badge unlocked: {BADGE_CONFIG[badgeToast].label}!</span>
        </span>
      )}
      {streakToast && (
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute ${MARK_COMPLETE_TOAST_OFFSETS.streak} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold whitespace-nowrap shadow-sm animate-streak-pop`}
        >
          <span aria-hidden="true">🔥</span>
          <span>{streakToast}-day streak!</span>
        </span>
      )}
      {streakSavedToast && (
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute ${MARK_COMPLETE_TOAST_OFFSETS.streakSaved} left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold whitespace-nowrap shadow-sm animate-streak-saved`}
        >
          <span aria-hidden="true">🛡️</span>
          <span>{streakSavedToast}-day streak saved!</span>
        </span>
      )}
    </div>
  );
}
