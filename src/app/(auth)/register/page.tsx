import type { Metadata } from 'next';
import Link from 'next/link';
import { RegistrationWizard } from '@/components/auth/registration-wizard';

// CR10 A2: keep auth surfaces out of search indexes.
export const metadata: Metadata = {
  title: 'Create your account',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Join the Community</h1>
        <p className="text-gray-600 dark:text-neutral-400 mt-1">Create your account and get started</p>
      </div>

      <RegistrationWizard />

      <div className="text-center text-sm text-gray-600 dark:text-neutral-400">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--color-brand,#D94A4A)] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
