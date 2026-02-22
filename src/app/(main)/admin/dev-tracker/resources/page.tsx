import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getResources } from '@/lib/dev-tracker/actions';
import { ResourceLibrary } from '@/components/admin/dev-tracker/resource-library';

export const metadata: Metadata = {
    title: 'Dev Resources | Admin',
};

async function ResourcesContent() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');

    const resources = await getResources();

    return (
        <ResourceLibrary
            initialResources={resources}
            userId={session.user.id}
        />
    );
}

export default function DevResourcesPage() {
    return (
        <div className="space-y-6 p-6">
            <Suspense
                fallback={
                    <div className="p-8 text-center text-muted-foreground">
                        Loading resources…
                    </div>
                }
            >
                <ResourcesContent />
            </Suspense>
        </div>
    );
}
