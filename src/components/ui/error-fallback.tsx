'use client';

interface ErrorFallbackProps {
    error: Error & { digest?: string };
    reset: () => void;
    title?: string;
    description?: string;
}

export function ErrorFallback({
    error,
    reset,
    title = 'Something went wrong',
    description = 'An unexpected error occurred. Please try again.',
}: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-red-500"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                </svg>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">
                {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6 max-w-sm">
                {description}
            </p>

            <button
                onClick={reset}
                className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-colors shadow-sm"
                style={{ backgroundColor: '#D94A4A' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C43E3E'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D94A4A'; }}
            >
                Try again
            </button>

            {process.env.NODE_ENV === 'development' && error.message && (
                <details className="mt-6 text-left w-full max-w-lg">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                        Error details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 dark:bg-neutral-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto whitespace-pre-wrap break-words">
                        {error.message}
                        {error.digest ? `\nDigest: ${error.digest}` : ''}
                    </pre>
                </details>
            )}
        </div>
    );
}
