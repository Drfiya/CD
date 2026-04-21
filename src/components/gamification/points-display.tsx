import { getPointsToNextLevel } from '@/lib/gamification-config';

import type { Messages } from '@/lib/i18n/messages/en';

interface PointsDisplayProps {
  points: number;
  level: number;
  messages?: Messages;
}

export function PointsDisplay({ points, level, messages }: PointsDisplayProps) {
  const progress = getPointsToNextLevel(points, level);

  const levelText = messages ? messages.gamification.level : 'Level';
  const pointsText = messages ? messages.gamification.points : 'points';
  const ptsToLevelTpl = messages ? messages.gamification.ptsToLevel : 'pts to Level {level}';
  const pointsToLevelFullTpl = messages ? messages.gamification.pointsToLevelFull : '{current} of {required} points to Level {level}';
  const maxLevelReached = messages ? messages.gamification.maxLevelReached : 'Max level reached!';

  return (
    <div className="space-y-2">
      {/* Current stats */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{levelText} {level}</span>
        <span className="text-sm font-medium">{points} {pointsText}</span>
      </div>

      {/* Progress bar (if not max level) */}
      {progress && (
        <div className="space-y-1">
          <div
            className="h-2 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.required}
            aria-label={pointsToLevelFullTpl
              .replace('{current}', String(progress.current))
              .replace('{required}', String(progress.required))
              .replace('{level}', String(level + 1))
            }
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(progress.progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress.current}/{progress.required} {ptsToLevelTpl.replace('{level}', String(level + 1))}
          </p>
        </div>
      )}

      {/* Max level message */}
      {!progress && (
        <p className="text-xs text-muted-foreground text-center">
          {maxLevelReached}
        </p>
      )}
    </div>
  );
}
