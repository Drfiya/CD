import { Suspense } from 'react';
import { Metadata } from 'next';
import { getLaunchChecklist } from '@/lib/dev-tracker/actions';
import { LaunchControl } from '@/components/admin/dev-tracker/launch-control';

export const metadata: Metadata = {
    title: 'Launch Control | Admin',
};

async function LaunchContent() {
    const items = await getLaunchChecklist();
    return <LaunchControl initialItems={items} />;
}

export default function LaunchPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">Launch Control</h1>
                <p className="text-muted-foreground mt-1">
                    Track launch readiness across technical, content, legal, payments, testing, and operations.
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground">
                        Loading checklist…
                    </div>
                }
            >
                <LaunchContent />
            </Suspense>
        </div>
    );
}
