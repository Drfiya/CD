'use client';

/**
 * Language Settings sub-navigation — Blacklist | Glossary | Rules | Feedback | Usage
 * Sits below the main admin tabs within the Language Settings section.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SUB_TABS = [
    { href: '/admin/language-settings', label: 'Blacklist', exact: true },
    { href: '/admin/language-settings/glossary', label: 'Glossary' },
    { href: '/admin/language-settings/rules', label: 'Translation Rules' },
    { href: '/admin/language-settings/feedback', label: 'Feedback' },
    { href: '/admin/language-settings/usage', label: 'API Usage' },
    { href: '/admin/language-settings/languages', label: 'Languages' },
];

export function LanguageSettingsNav() {
    const pathname = usePathname();

    return (
        <div className="flex gap-2 border-b border-gray-100 dark:border-neutral-700">
            {SUB_TABS.map(({ href, label, exact }) => {
                const isActive = exact
                    ? pathname === href
                    : pathname.startsWith(href);

                return (
                    <Link
                        key={href}
                        href={href}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${isActive
                            ? 'border-primary text-primary bg-gray-100 dark:bg-neutral-700/60'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}
