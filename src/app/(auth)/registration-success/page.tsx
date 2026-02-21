import Link from 'next/link';

export default function RegistrationSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center space-y-6">
                {/* Success icon */}
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                        className="h-8 w-8 text-green-500"
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

                <h1 className="text-2xl font-bold">Welcome to the Community!</h1>

                <p className="text-gray-600">
                    Your payment was successful and your membership is now active.
                    You have full access to all community features, courses, and events.
                </p>

                <Link
                    href="/login"
                    className="inline-block w-full px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Sign In to Get Started
                </Link>
            </div>
        </div>
    );
}
