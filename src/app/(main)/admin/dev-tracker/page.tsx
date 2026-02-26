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
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">Command Center</h1>
                <p className="text-muted-foreground mt-1">
                    Track features, tasks, and deployment readiness — all in one place.
                </p>
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
