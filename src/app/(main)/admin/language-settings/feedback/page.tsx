import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import {
    getTranslationFeedback,
    getFeedbackStats,
} from '@/lib/language-settings/actions';
import { FeedbackDashboard } from '@/components/admin/language-settings/feedback-dashboard';

export const metadata: Metadata = {
    title: 'Feedback | Language Settings',
};

export default async function FeedbackPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const [feedback, stats] = await Promise.all([
        getTranslationFeedback(),
        getFeedbackStats(),
    ]);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Translation Feedback
                </h1>
                <p className="text-muted-foreground mt-1">
                    Review user-submitted translation corrections. Approve
                    corrections to update the glossary or blacklist with a
                    single click.
                </p>
            </div>

            <FeedbackDashboard initialFeedback={feedback} stats={stats} />
        </div>
    );
}
