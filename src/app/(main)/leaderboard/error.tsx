'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function LeaderboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <ErrorFallback
            error={error}
            reset={reset}
            title="Could not load the leaderboard"
            description="There was a problem loading rankings. Please try again."
        />
    );
}
