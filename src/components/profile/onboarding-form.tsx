'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { profileSchema } from '@/lib/validations/profile';
import { updateProfile } from '@/lib/profile-actions';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { BioTextarea } from '@/components/profile/bio-textarea';

// Use input type for form fields (before transform/default)
type ProfileFormValues = z.input<typeof profileSchema>;

interface OnboardingFormProps {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    image: string | null;
  };
}

export function OnboardingForm({ user }: OnboardingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      bio: user.bio || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('bio', data.bio || '');

      const result = await updateProfile(formData);

      if ('error' in result) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : 'Failed to update profile';
        setError(errorMsg);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Welcome!</h1>
        <p className="text-muted-foreground mt-2">
          Let&apos;s set up your profile
        </p>
      </div>

      <div className="space-y-8">
        <AvatarUpload currentAvatarUrl={user.image} userName={user.name} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <BioTextarea
            register={register('bio')}
            defaultValue={user.bio || ''}
            error={errors.bio?.message}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip for now
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete setup'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
