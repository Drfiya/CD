import type { Metadata } from 'next';
import Link from 'next/link';

// CR10 A2: keep auth surfaces out of search indexes.
export const metadata: Metadata = {
    title: 'Welcome',
    robots: { index: false, follow: false },
};

export default function RegistrationSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 px-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-lg shadow-md p-8 text-center space-y-6 border border-gray-100 dark:border-neutral-800">
                {/* Success icon — green is intentionally semantic (success state), retained across themes. */}
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                    <svg
                        className="h-8 w-8 text-green-500 dark:text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Welcome to the Community!</h1>

                <p className="text-gray-600 dark:text-neutral-400">
                    Your payment was successful and your membership is now active.
                    You have full access to all community features, courses, and events.
                </p>

                <Link
                    href="/login"
                    className="inline-block w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                    Sign In to Get Started
                </Link>
            </div>
        </div>
    );
}
