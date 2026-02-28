'use client';

import Link from 'next/link';

interface AiToolData {
    id: string;
    name: string;
    url: string;
    openInNewTab: boolean;
    position: number;
}

interface AiToolsSidebarProps {
    title?: string;
    viewAllLabel?: string;
    tools?: AiToolData[];
    className?: string;
}

export function AiToolsSidebar({
    title = 'AI Tools',
    viewAllLabel = 'View all',
    tools = [],
    className = '',
}: AiToolsSidebarProps) {
    // Hide the box entirely if there are no tools
    if (tools.length === 0) return null;

    return (
        <div
            className={`bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700 ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {/* Beaker icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500 dark:text-neutral-400"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                        />
                    </svg>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                        {title}
                    </h3>
                </div>
                <Link
                    href="/ai-tools"
                    className="text-sm font-medium hover:underline"
                    style={{ color: '#D94A4A' }}
                >
                    {viewAllLabel}
                </Link>
            </div>

            <div>
                {tools.map((tool, index) => (
                    <div key={tool.id}>
                        {/* Separator line — indented, only between entries */}
                        {index > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-neutral-700" />
                        )}
                        <a
                            href={tool.url}
                            target={tool.openInNewTab ? '_blank' : '_self'}
                            rel={tool.openInNewTab ? 'noopener noreferrer' : undefined}
                            className="flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg py-2.5 px-1.5 -mx-1.5 transition-colors"
                        >
                            <span className="w-5 text-sm font-medium text-gray-400 shrink-0 pt-0.5">
                                {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-neutral-100 leading-snug notranslate">
                                {tool.name}
                            </span>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
