import { Suspense } from 'react';
import { Metadata } from 'next';
import { getUnifiedBoard } from '@/lib/dev-tracker/actions';
import { TrackerBoard } from '@/components/admin/dev-tracker/tracker-board';

export const metadata: Metadata = {
    title: 'Command Center | Admin',
};

async function BoardContent() {
    let initialData = null;
    try {
        initialData = await getUnifiedBoard();
    } catch {
        // Will show the "click sync" empty state
    }

    return <TrackerBoard initialData={initialData} />;
}

export default function CommandCenterPage() {
    return (
        <div className="space-y-3 p-6 pb-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Command Center</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Track features, tasks, and deployment readiness — all in one place.
                    </p>
                </div>
            </div>

            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground">
                        Loading board…
                    </div>
                }
            >
                <BoardContent />
            </Suspense>
        </div>
    );
}
