'use client';

import { useState, useTransition } from 'react';
import { toggleLanguageActive, type LanguageConfigEntry } from '@/lib/language-settings/actions';

interface LanguageConfigManagerProps {
    initialConfigs: LanguageConfigEntry[];
}

export function LanguageConfigManager({ initialConfigs }: LanguageConfigManagerProps) {
    const [configs, setConfigs] = useState(initialConfigs);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleToggle = (code: string, newActive: boolean) => {
        setError(null);

        // Optimistic update
        setConfigs(prev =>
            prev.map(c => (c.code === code ? { ...c, isActive: newActive } : c))
        );

        startTransition(async () => {
            try {
                await toggleLanguageActive(code, newActive);
            } catch (err) {
                // Revert on error
                setConfigs(prev =>
                    prev.map(c => (c.code === code ? { ...c, isActive: !newActive } : c))
                );
                setError(err instanceof Error ? err.message : 'Failed to update language');
            }
        });
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                English is always active and cannot be deactivated — it is the permanent fallback language.
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/40">
                            <th className="text-left px-5 py-3 font-medium text-gray-700 dark:text-neutral-300">Language</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-700 dark:text-neutral-300">Code</th>
                            <th className="text-right px-5 py-3 font-medium text-gray-700 dark:text-neutral-300">Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                        {configs.map((lang) => (
                            <tr key={lang.code} className="hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors">
                                <td className="px-5 py-4">
                                    <span className="mr-2 text-lg" aria-hidden="true">{lang.flag}</span>
                                    <span className="font-medium text-gray-900 dark:text-neutral-100">{lang.name}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono text-gray-600 dark:text-neutral-400">
                                        {lang.code}
                                    </code>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <button
                                        role="switch"
                                        aria-checked={lang.isActive}
                                        aria-label={`Toggle ${lang.name}`}
                                        disabled={lang.code === 'en' || isPending}
                                        onClick={() => handleToggle(lang.code, !lang.isActive)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                            lang.isActive
                                                ? 'bg-green-500 focus-visible:ring-green-500'
                                                : 'bg-gray-200 dark:bg-neutral-600 focus-visible:ring-gray-400'
                                        }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                lang.isActive ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isPending && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 text-center">Saving…</p>
            )}
        </div>
    );
}
