'use client';

import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { updateThemePreference } from '@/lib/theme-actions';

/**
 * Sun/moon toggle for switching between light and dark themes.
 * Renders a placeholder during SSR to avoid hydration mismatch
 * (theme is only known on the client via localStorage / system pref).
 */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch — theme is unknown on the server
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard: theme unknown on server
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        // Placeholder matching the button dimensions to prevent layout shift
        return <div className="w-9 h-9" />;
    }

    const isDark = resolvedTheme === 'dark';

    const handleToggle = () => {
        const next: 'dark' | 'light' = isDark ? 'light' : 'dark';
        setTheme(next);
        // CR9 F2: fire-and-forget DB sync so cross-device login lands in the correct mode.
        // Anonymous visitors skip this; next-themes persists to localStorage either way.
        // Never await — keep the toggle instant per CR7 optimistic-UI pattern.
        if (session?.user) {
            void updateThemePreference(next).catch(() => { /* non-blocking: localStorage remains source of truth for this tab */ });
        }
    };

    return (
        <button
            onClick={handleToggle}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? (
                /* Sun icon — shown in dark mode, click to go light */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
            ) : (
                /* Moon icon — shown in light mode, click to go dark */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
            )}
        </button>
    );
}
