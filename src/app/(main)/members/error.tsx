'use client';

import { ErrorFallback } from '@/components/ui/error-fallback';

export default function MembersError({
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
            title="Could not load members"
            description="There was a problem loading the member directory. Please try again."
        />
    );
}
