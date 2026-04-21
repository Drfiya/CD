import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

// CR10 A2: keep auth surfaces out of search indexes.
export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Forgot password?</h1>
        <p className="text-gray-600 dark:text-neutral-400 mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center text-sm text-gray-600 dark:text-neutral-400">
        Remember your password?{' '}
        <Link href="/login" className="text-[var(--color-brand,#D94A4A)] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
