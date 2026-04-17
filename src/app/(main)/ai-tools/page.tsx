import Link from 'next/link';
import { getActiveAiTools } from '@/lib/ai-tool-actions';
import { getAdminTools } from '@/lib/admin-tool-actions';

export default async function AiToolsPage() {
    const [tools, adminTools] = await Promise.all([
        getActiveAiTools(),
        getAdminTools(),
    ]);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-500/30 dark:to-orange-500/30 flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 text-red-600 dark:text-red-300"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">AI Tools</h1>
                </div>
                <p className="text-gray-500 dark:text-neutral-400 text-sm">
                    AI-powered tools for regulatory science, study design, and data analysis.
                </p>
            </div>

            {/* Existing AI Tools Grid */}
            {tools.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tools.map((tool) => (
                        <a
                            key={tool.id}
                            href={tool.url}
                            target={tool.openInNewTab ? '_blank' : '_self'}
                            rel={tool.openInNewTab ? 'noopener noreferrer' : undefined}
                            className="group bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-4 h-4 text-gray-500 dark:text-neutral-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 leading-tight notranslate">
                                    {tool.name}
                                </h2>
                            </div>
                            {tool.description && (
                                <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-4">
                                    {tool.description}
                                </p>
                            )}
                            <div className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Open Tool
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {/* Admin Tools Section */}
            {adminTools.length > 0 && (
                <div className={tools.length > 0 ? 'mt-10' : ''}>
                    {tools.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 dark:from-purple-500/30 dark:to-blue-500/30 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-purple-600 dark:text-purple-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">External Tools</h2>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {adminTools.map((tool) => (
                            <a
                                key={tool.id}
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 hover:border-purple-200 dark:hover:border-purple-900/50 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-neutral-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 leading-tight notranslate">
                                        {tool.name}
                                    </h2>
                                </div>
                                {tool.description && (
                                    <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-4">
                                        {tool.description}
                                    </p>
                                )}
                                <div className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                    Open Tool
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state when both are empty */}
            {tools.length === 0 && adminTools.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-400 dark:text-neutral-500">No AI tools available yet.</p>
                </div>
            )}

            {/* Back link */}
            <div className="mt-8">
                <Link
                    href="/feed"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Back to Community
                </Link>
            </div>
        </div>
    );
}

