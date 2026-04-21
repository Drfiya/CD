import { getLanguageConfigs } from '@/lib/language-settings/actions';
import { LanguageConfigManager } from '@/components/admin/language-settings/language-config-manager';

export default async function LanguageConfigPage() {
    const configs = await getLanguageConfigs();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Active Languages</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                    Toggle which languages are available for translation. Changes take effect immediately across the platform.
                </p>
            </div>

            <LanguageConfigManager initialConfigs={configs} />
        </div>
    );
}
