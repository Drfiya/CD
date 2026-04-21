'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateGamificationConfig } from '@/lib/gamification-config-actions';

interface GamifyFormProps {
  pointsPost: number;
  pointsComment: number;
  pointsLike: number;
  pointsLesson: number;
  levelThresholds: string;
}

const ACTION_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  pointsPost: { label: 'Post created', description: 'Points earned when a member publishes a new post' },
  pointsComment: { label: 'Comment created', description: 'Points earned when a member writes a comment' },
  pointsLike: { label: 'Like received', description: 'Points earned when a member receives a like on their post' },
  pointsLesson: { label: 'Lesson completed', description: 'Points earned when a member completes a course lesson' },
};

export function GamifyForm({ pointsPost, pointsComment, pointsLike, pointsLesson, levelThresholds }: GamifyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [values, setValues] = useState({
    pointsPost,
    pointsComment,
    pointsLike,
    pointsLesson,
  });

  const [thresholds, setThresholds] = useState(levelThresholds);

  const parsedLevels = thresholds.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);
      setSuccess(false);

      const fd = new FormData();
      fd.set('pointsPost', String(values.pointsPost));
      fd.set('pointsComment', String(values.pointsComment));
      fd.set('pointsLike', String(values.pointsLike));
      fd.set('pointsLesson', String(values.pointsLesson));
      fd.set('levelThresholds', thresholds);

      const result = await updateGamificationConfig(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Points per action */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
          Points per Action
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(ACTION_DESCRIPTIONS).map(([key, { label, description }]) => (
            <label key={key} className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{label}</span>
              <span className="block text-xs text-gray-400 dark:text-neutral-500 mb-1.5">{description}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={values[key as keyof typeof values]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#D94A4A)]/50"
                disabled={isPending}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Level thresholds */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
          Level Thresholds
        </h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          Comma-separated point values. Each value is the minimum points needed to reach that level.
          First value must be 0 (Level 1). Values must be ascending.
        </p>

        <textarea
          value={thresholds}
          onChange={(e) => setThresholds(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#D94A4A)]/50 resize-none"
          placeholder="0,50,120,210,320,450,600,770,960,1170"
          disabled={isPending}
        />

        {/* Live preview */}
        {parsedLevels.length >= 2 && (
          <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-neutral-400 font-medium">Level</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-neutral-400 font-medium">Min Points</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-neutral-400 font-medium">Points to next</th>
                </tr>
              </thead>
              <tbody>
                {parsedLevels.map((threshold, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-neutral-700/50">
                    <td className="px-3 py-1.5 text-gray-900 dark:text-neutral-100 font-medium">Level {i + 1}</td>
                    <td className="px-3 py-1.5 text-gray-600 dark:text-neutral-400">{threshold}</td>
                    <td className="px-3 py-1.5 text-gray-600 dark:text-neutral-400">
                      {i < parsedLevels.length - 1 ? parsedLevels[i + 1] - threshold : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-md text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md text-sm border border-green-200 dark:border-green-900">
          ✓ Gamification settings saved!
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
