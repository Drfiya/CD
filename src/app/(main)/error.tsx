'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function MainError({
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
            title="Something went wrong"
            description="An unexpected error occurred. Please try again or refresh the page."
        />
    );
}
