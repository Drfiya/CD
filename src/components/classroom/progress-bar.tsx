import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ value, className, showPercentage = true }: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${clampedValue}%`}
        className="h-2 w-full rounded-full bg-gray-200 dark:bg-neutral-700"
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: clampedValue === 100 ? '#22c55e' : '#D94A4A',
          }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs font-semibold text-gray-600 dark:text-neutral-400 tabular-nums whitespace-nowrap">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
