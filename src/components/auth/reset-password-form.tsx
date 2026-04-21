'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { resetPassword } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormInput = z.infer<typeof formSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormInput) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('token', token);
    formData.append('password', data.password);

    const result = await resetPassword(formData);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-900">
          Password reset successfully!
        </div>
        <Button onClick={() => router.push('/login')} className="w-full">
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-200">
          New Password
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.password && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.password.message}</p>
        )}
        <p className="text-gray-500 dark:text-neutral-400 text-xs mt-1">At least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-200">
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          id="confirmPassword"
          className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset password'}
      </Button>
    </form>
  );
}
