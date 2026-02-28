import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getFeatureIdea } from '@/lib/feature-idea-actions';
import { FeatureIdeaDetail } from '@/components/admin/feature-idea-detail';

export const metadata: Metadata = {
    title: 'Feature Idea | Admin',
};

interface Props {
    params: Promise<{ ideaId: string }>;
}

export default async function AdminFeatureIdeaDetailPage({ params }: Props) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const { ideaId } = await params;
    const idea = await getFeatureIdea(ideaId);

    if (!idea) {
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <FeatureIdeaDetail idea={idea} />
        </div>
    );
}
