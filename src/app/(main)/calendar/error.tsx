'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function CalendarError({
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
            title="Could not load the calendar"
            description="There was a problem loading events. Please try again."
        />
    );
}
