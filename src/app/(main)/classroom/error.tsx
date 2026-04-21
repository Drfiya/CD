'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function ClassroomError({
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
            title="Could not load the classroom"
            description="There was a problem loading courses. Please try again."
        />
    );
}
