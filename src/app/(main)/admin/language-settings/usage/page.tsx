import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getTranslationUsageData } from '@/lib/language-settings/actions';
import { TranslationUsageDashboard } from '@/components/admin/language-settings/translation-usage-dashboard';

export const metadata: Metadata = {
    title: 'API Usage | Language Settings',
};

export default async function TranslationUsagePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const usageData = await getTranslationUsageData();

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Translation API Usage
                </h1>
                <p className="text-muted-foreground mt-1">
                    Monitor DeepL API consumption, cache performance and cost
                    projections. Data refreshes automatically every 30 seconds.
                </p>
            </div>

            <TranslationUsageDashboard initialData={usageData} />
        </div>
    );
}
