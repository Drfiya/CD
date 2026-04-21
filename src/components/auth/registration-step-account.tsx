'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';

interface RegistrationStepAccountProps {
  onComplete: (data: RegisterInput) => void;
  defaultValues?: Partial<RegisterInput>;
}

export function RegistrationStepAccount({
  onComplete,
  defaultValues,
}: RegistrationStepAccountProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues,
  });

  const onSubmit = (data: RegisterInput) => {
    onComplete(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-200">
          Name
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

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

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-200">
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.password && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.password.message}</p>
        )}
        <p className="text-gray-500 dark:text-neutral-400 text-xs mt-1">At least 8 characters</p>
      </div>

      <Button type="submit" className="w-full">
        Continue to Payment
      </Button>
    </form>
  );
}
