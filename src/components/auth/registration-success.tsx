'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface RegistrationSuccessProps {
  email: string;
  password: string;
}

export function RegistrationSuccess({ email, password }: RegistrationSuccessProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [isSigningIn, setIsSigningIn] = useState(true);

  useEffect(() => {
    // Auto sign in
    async function autoSignIn() {
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      setIsSigningIn(false);
    }

    autoSignIn();
  }, [email, password]);

  useEffect(() => {
    if (isSigningIn) return;

    // Start countdown after sign-in completes
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          router.refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSigningIn, router]);

  return (
    <div className="text-center space-y-6">
      {/* Success Checkmark */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
          Welcome to the Community!
        </h2>
        <p className="text-gray-600 dark:text-neutral-400 mt-2">
          Your account has been created successfully.
        </p>
      </div>

      {/* Countdown */}
      <div className="text-sm text-gray-500 dark:text-neutral-400">
        {isSigningIn ? (
          <span>Signing you in...</span>
        ) : (
          <span>Redirecting in {countdown} seconds...</span>
        )}
      </div>
    </div>
  );
}
