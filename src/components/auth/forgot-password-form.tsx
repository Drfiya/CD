'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { requestPasswordReset } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('email', data.email);

    await requestPasswordReset(formData);

    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-900">
          If an account with that email exists, we&apos;ve sent a password reset link.
        </div>
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          Check your inbox and spam folder.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-200">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
