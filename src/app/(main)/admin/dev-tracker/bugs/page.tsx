import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getBugReports } from '@/lib/bug-reporter-actions';
import { BugTable } from '@/components/admin/bug-reporter/bug-table';

export const metadata: Metadata = {
    title: 'Bug Reports | Admin',
};

async function BugTableContent() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        redirect('/login');
    }

    const result = await getBugReports({ take: 25 });

    if ('error' in result) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                Failed to load bug reports: {result.error}
            </div>
        );
    }

    return (
        <BugTable
            initialItems={result.items as Parameters<typeof BugTable>[0]['initialItems']}
            initialNextCursor={result.nextCursor}
        />
    );
}

export default function BugReportsPage() {
    return (
        <div className="space-y-4 p-6 pb-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
                        🐛 Bug Reports
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Triage and track bugs submitted by the team.
                    </p>
                </div>
                <a
                    href="/admin/dev-tracker/bugs/print"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-gray-200 dark:border-neutral-700 px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                    Export PDF ↗
                </a>
            </div>

            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        Loading bug reports…
                    </div>
                }
            >
                <BugTableContent />
            </Suspense>
        </div>
    );
}
