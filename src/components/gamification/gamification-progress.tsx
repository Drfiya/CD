import { getPointsToNextLevel } from '@/lib/gamification-config';
import { BadgeDisplay } from '@/components/gamification/badge-display';
import type { BadgeType } from '@/generated/prisma/client';

interface GamificationProgressProps {
  points: number;
  level: number;
  name: string | null;
  badges?: { type: BadgeType | null; customDefinitionId?: string | null }[];
  currentStreak?: number;
  longestStreak?: number;
  streakPromptLabel?: string;
  streakDayLabel?: string;
  streakBestLabel?: string;
}

export function GamificationProgress({
  points,
  level,
  name,
  badges = [],
  currentStreak = 0,
  longestStreak = 0,
  streakPromptLabel = 'Start your streak! Post or comment today.',
  streakDayLabel = 'day streak',
  streakBestLabel = 'Best',
}: GamificationProgressProps) {
  const progress = getPointsToNextLevel(points, level);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-neutral-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">Your Progress</h3>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-neutral-400">
          {name ? name.split(' ')[0] : 'You'}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
          Level {level}
        </span>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 dark:text-neutral-500">{points} pts total</span>
        {progress && (
          <span className="text-xs text-gray-500 dark:text-neutral-500">
            {progress.current}/{progress.required} to Level {level + 1}
          </span>
        )}
      </div>

      {progress ? (
        <div className="w-full bg-gray-100 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, progress.progress)}%`,
              backgroundColor: '#D94A4A',
            }}
          />
        </div>
      ) : (
        <div className="text-xs text-center text-gray-500 dark:text-neutral-400 py-1">
          Max level reached 🎉
        </div>
      )}

      {/* Streak row */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700">
        {currentStreak > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <span aria-hidden="true">🔥</span>
            <span>{currentStreak}-{streakDayLabel}</span>
            {longestStreak > currentStreak && (
              <span className="text-xs text-muted-foreground ml-auto">{streakBestLabel}: {longestStreak}</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-neutral-400">{streakPromptLabel}</div>
        )}
      </div>

      {badges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700 flex justify-end">
          <BadgeDisplay badges={badges} maxVisible={4} />
        </div>
      )}
    </div>
  );
}
