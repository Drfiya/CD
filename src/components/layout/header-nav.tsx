'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { LanguageSelector } from '@/components/translation/LanguageSelector';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import type { Messages } from '@/lib/i18n/messages/en';

interface NavLink {
    href: string;
    labelKey: 'community' | 'classroom' | 'calendar' | 'members' | 'aiTools';
    icon: ReactNode;
}

const navLinks: NavLink[] = [
    {
        href: '/feed',
        labelKey: 'community',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
        )
    },
    {
        href: '/classroom',
        labelKey: 'classroom',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm0 0v16.5m15-16.5v16.5M9 3.75H4.5M9 20.25H4.5" />
            </svg>
        )
    },
    {
        href: '/calendar',
        labelKey: 'calendar',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
        )
    },
    {
        href: '/members',
        labelKey: 'members',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        )
    },
    {
        href: '/ai-tools',
        labelKey: 'aiTools',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
        )
    },
];

interface HeaderNavProps {
    messages: Messages;
}

/**
 * Inline navigation rendered inside the header row.
 * Desktop: sliding pill indicator behind the active tab.
 * Mobile: hamburger with dropdown.
 */
export function HeaderNav({ messages }: HeaderNavProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Refs for measuring each nav link's position inside the container
    const containerRef = useRef<HTMLDivElement>(null);
    const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    // Slider position state
    const [slider, setSlider] = useState({ left: 0, width: 0, ready: false });

    // Find the active link index
    const activeIndex = navLinks.findIndex(
        (link) => pathname === link.href || pathname.startsWith(`${link.href}/`)
    );

    /** Measure the active link and position the slider */
    const updateSlider = useCallback(() => {
        if (activeIndex < 0 || !containerRef.current) return;
        const activeEl = linkRefs.current[activeIndex];
        if (!activeEl) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const linkRect = activeEl.getBoundingClientRect();
        setSlider({
            left: linkRect.left - containerRect.left,
            width: linkRect.width,
            ready: true,
        });
    }, [activeIndex]);

    // Recalculate on mount, route change, and window resize
    useEffect(() => {
        updateSlider();
        window.addEventListener('resize', updateSlider);
        return () => window.removeEventListener('resize', updateSlider);
    }, [updateSlider]);

    return (
        <>
            {/* Desktop: nav links with sliding pill in a container bar */}
            <div className="hidden lg:flex flex-1 items-center justify-center">
                <div
                    ref={containerRef}
                    className="relative inline-flex items-center gap-0.5 p-1 bg-[#F5F6F8] dark:bg-[#232323] rounded-full border border-gray-200 dark:border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none"
                >
                    {/* Sliding pill indicator */}
                    {slider.ready && activeIndex >= 0 && (
                        <div
                            className="absolute bg-white dark:bg-[#404040] rounded-full shadow-sm dark:shadow-none transition-all duration-300 ease-in-out"
                            style={{
                                left: slider.left,
                                width: slider.width,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 'calc(100% - 6px)',
                            }}
                        />
                    )}

                    {navLinks.map((link, i) => {
                        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                ref={(el) => { linkRefs.current[i] = el; }}
                                className={`
                                    relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-[450] transition-colors
                                    ${isActive
                                        ? 'text-[#0A0A0F] dark:text-white'
                                        : 'text-[#64656A] dark:text-[#C8C8C8] hover:text-[#0A0A0F] dark:hover:text-white'
                                    }
                                `}
                            >
                                {link.icon}
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{messages.nav[link.labelKey]}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Mobile: hamburger button */}
            <div className="flex lg:hidden flex-1 items-center">
                <button
                    className="flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed top-14 left-0 right-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 shadow-lg z-50">
                    <div className="px-4 py-2 space-y-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                                            ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                                            : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-neutral-100'
                                        }
                  `}
                                >
                                    {link.icon}
                                    <span className="whitespace-nowrap">{messages.nav[link.labelKey]}</span>
                                </Link>
                            );
                        })}

                        {/* Language & Theme controls — hidden in header on mobile, shown here */}
                        <div className="border-t border-gray-200 dark:border-neutral-700 pt-2 mt-2 flex items-center justify-between px-4 pb-1">
                            <LanguageSelector dropdownAlign="left" />
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
