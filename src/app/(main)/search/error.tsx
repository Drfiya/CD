'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function SearchError({
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
            title="Search unavailable"
            description="There was a problem with the search service. Please try again."
        />
    );
}
