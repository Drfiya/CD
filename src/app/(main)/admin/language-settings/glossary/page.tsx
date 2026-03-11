import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import {
    getGlossaryEntries,
    getGlossaryDomains,
    getGlossaryLanguagePairs,
} from '@/lib/language-settings/actions';
import GlossaryManager from '@/components/admin/language-settings/glossary-manager';

export const metadata: Metadata = {
    title: 'Glossary | Language Settings',
};

export default async function GlossaryPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const [entries, domains, languagePairs] = await Promise.all([
        getGlossaryEntries(),
        getGlossaryDomains(),
        getGlossaryLanguagePairs(),
    ]);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Glossary (Controlled Translations)
                </h1>
                <p className="text-muted-foreground mt-1">
                    Define how specific terms should be translated per language
                    pair. These entries are synced to the DeepL Glossary API for
                    consistent, domain-specific translations.
                </p>
            </div>

            <GlossaryManager
                initialEntries={entries}
                domains={domains}
                languagePairs={languagePairs}
            />
        </div>
    );
}
