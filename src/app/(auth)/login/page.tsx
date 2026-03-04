import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
      </div>

      <LoginForm />

      <div className="text-center text-sm">
        <Link href="/forgot-password" className="text-red-500 hover:text-red-600 transition-colors">
          Forgot password?
        </Link>
      </div>

      <div className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-red-500 hover:text-red-600 font-medium transition-colors">
          Sign up
        </Link>
      </div>
    </div>
  );
}
