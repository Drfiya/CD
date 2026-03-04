'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError('Invalid credentials');
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold mb-1.5 text-gray-700">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-gray-50 focus:bg-white"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold mb-1.5 text-gray-700">
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-gray-50 focus:bg-white"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
