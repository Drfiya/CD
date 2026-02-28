'use client';

/**
 * Command Center sub-navigation — Board | Resources | Launch Control
 * Sits below the main admin tabs within the command center section.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SUB_TABS = [
    { href: '/admin/dev-tracker', label: 'Board', exact: true },
    { href: '/admin/dev-tracker/resources', label: 'Resources' },
    { href: '/admin/dev-tracker/launch', label: 'Launch Control' },
];

export function DevTrackerNav() {
    const pathname = usePathname();

    return (
        <div className="flex gap-2 border-b border-gray-100 px-6 pt-4 -mt-2">
            {SUB_TABS.map(({ href, label, exact }) => {
                const isActive = exact
                    ? pathname === href
                    : pathname.startsWith(href);

                return (
                    <Link
                        key={href}
                        href={href}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${isActive
                            ? 'border-primary text-primary bg-red-50/50 dark:bg-red-900/10'
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
