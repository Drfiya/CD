import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import {
    getTranslationRules,
    getGlossaryDomains,
} from '@/lib/language-settings/actions';
import { TranslationRulesManager } from '@/components/admin/language-settings/translation-rules-manager';

export const metadata: Metadata = {
    title: 'Translation Rules | Language Settings',
};

export default async function TranslationRulesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const [rules, domains] = await Promise.all([
        getTranslationRules(),
        getGlossaryDomains(),
    ]);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Translation Rules
                </h1>
                <p className="text-muted-foreground mt-1">
                    Configure translation behavior per community section.
                    Control formality, glossary assignment, caching, context
                    depth and auto-translation settings.
                </p>
            </div>

            <TranslationRulesManager
                initialRules={rules}
                domains={domains}
            />
        </div>
    );
}
