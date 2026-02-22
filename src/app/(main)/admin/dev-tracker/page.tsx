import { Suspense } from 'react';
import { Metadata } from 'next';
import { syncDevTracker } from '@/lib/dev-tracker/actions';
import { TrackerBoard } from '@/components/admin/dev-tracker/tracker-board';

export const metadata: Metadata = {
    title: 'Dev Tracker | Admin',
};

async function BoardContent() {
    // Attempt initial sync — falls back to empty state if GITHUB_PAT not set
    let initialData = null;
    try {
        initialData = await syncDevTracker();
    } catch {
        // Will show the "click sync" empty state
    }

    return <TrackerBoard initialData={initialData} />;
}

export default function DevTrackerPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dev Tracker</h1>
                <p className="text-muted-foreground mt-1">
                    Track features, branches, and deployment readiness — powered by GitHub.
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground">
                        Syncing with GitHub…
                    </div>
                }
            >
                <BoardContent />
            </Suspense>
        </div>
    );
}
