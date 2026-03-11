import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import {
    getBlacklistEntries,
    getBlacklistCategories,
} from '@/lib/language-settings/actions';
import { BlacklistManager } from '@/components/admin/language-settings/blacklist-manager';

export const metadata: Metadata = {
    title: 'Blacklist | Language Settings',
};

export default async function BlacklistPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const [entries, categories] = await Promise.all([
        getBlacklistEntries(),
        getBlacklistCategories(),
    ]);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Blacklist (Do Not Translate)
                </h1>
                <p className="text-muted-foreground mt-1">
                    Terms on this list will never be translated. They remain in
                    the original language across all translations (e.g. gene
                    symbols, ICD codes, drug names).
                </p>
            </div>

            <BlacklistManager
                initialEntries={entries}
                categories={categories}
            />
        </div>
    );
}
