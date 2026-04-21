import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

// CR10 A2: keep auth surfaces out of search indexes.
export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Invalid reset link</h1>
        <p className="text-gray-600 dark:text-neutral-400">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-[var(--color-brand,#D94A4A)] hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Reset your password</h1>
        <p className="text-gray-600 dark:text-neutral-400 mt-1">Enter your new password below</p>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  );
}
