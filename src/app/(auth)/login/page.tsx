import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

// CR10 A2: keep auth surfaces out of search indexes.
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Welcome back</h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 text-sm">Sign in to your account</p>
      </div>

      <LoginForm />

      <div className="text-center text-sm">
        <Link href="/forgot-password" className="text-[var(--color-brand,#D94A4A)] hover:text-red-600 dark:hover:text-red-400 transition-colors">
          Forgot password?
        </Link>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-neutral-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[var(--color-brand,#D94A4A)] hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors">
          Sign up
        </Link>
      </div>
    </div>
  );
}
