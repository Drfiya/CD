import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getFeatureIdeas } from '@/lib/feature-idea-actions';
import { FeatureIdeasList } from '@/components/admin/feature-ideas-list';
import type { FeatureIdeaStatus } from '@/generated/prisma/client';

export const metadata: Metadata = {
    title: 'Feature Ideas | Admin',
};

interface Props {
    searchParams: Promise<{ status?: string; sort?: string }>;
}

export default async function AdminFeatureIdeasPage({ searchParams }: Props) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const params = await searchParams;
    const validStatuses = ['NEW', 'UNDER_REVIEW', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'];
    const status = validStatuses.includes(params.status?.toUpperCase() || '')
        ? (params.status!.toUpperCase() as FeatureIdeaStatus)
        : undefined;
    const validSorts = ['upvotes', 'newest', 'oldest'] as const;
    type SortOption = typeof validSorts[number];
    const sort: SortOption = validSorts.includes(params.sort as SortOption)
        ? (params.sort as SortOption)
        : 'upvotes';

    const ideas = await getFeatureIdeas({ status, sort });

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Feature Ideas
                </h1>
                <p className="text-muted-foreground mt-1">
                    Collect, discuss, and prioritize feature ideas with your admin team.
                </p>
            </div>

            <FeatureIdeasList
                ideas={ideas}
                currentFilter={status}
                currentSort={sort}
            />
        </div>
    );
}
