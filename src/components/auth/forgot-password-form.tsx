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
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('email', data.email);

      const result = await requestPasswordReset(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 bg-green-100 text-green-700 rounded">
          If an account with that email exists, we&apos;ve sent a password reset link.
        </div>
        <p className="text-sm text-gray-600">
          Check your inbox and spam folder.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
