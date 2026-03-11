import { LanguageSettingsNav } from '@/components/admin/language-settings/language-settings-nav';

export default function LanguageSettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="px-6 pt-4 -mb-2">
                <LanguageSettingsNav />
            </div>
            {children}
        </div>
    );
}
