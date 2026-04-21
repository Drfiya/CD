'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { profileSchema } from '@/lib/validations/profile';
import { updateProfile } from '@/lib/profile-actions';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { BioTextarea } from '@/components/profile/bio-textarea';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '@/lib/translation/constants';
import { useTranslation } from '@/components/translation/TranslationContext';

// Use input type for form fields (before transform/default)
type ProfileFormValues = z.input<typeof profileSchema> & { emailNotifications?: boolean };

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    image: string | null;
    languageCode: string | null;
    emailNotifications: boolean;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { currentLanguage, setLanguage } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      bio: user.bio || '',
      languageCode: user.languageCode || 'en',
    },
  });

  // Mirror the header's TranslationContext on mount so the dropdown reflects
  // the language the user is actually seeing the UI in (which may differ from
  // the stale DB value if they switched via the header without saving).
  const mirroredRef = useRef(false);
  useEffect(() => {
    if (mirroredRef.current) return;
    mirroredRef.current = true;
    if (currentLanguage && currentLanguage !== (user.languageCode || 'en')) {
      setValue('languageCode', currentLanguage, { shouldDirty: false });
    }
  }, [currentLanguage, setValue, user.languageCode]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('bio', data.bio || '');
      if (data.languageCode) {
        formData.append('languageCode', data.languageCode);
      }
      formData.append('emailNotifications', String(emailNotifications));

      const result = await updateProfile(formData);

      if ('error' in result) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : 'Failed to update profile';
        setError(errorMsg);
      } else {
        setSuccess(true);
        // Sync the header dropdown to whatever the form just saved so the two
        // surfaces stay aligned even if the user changed languageCode here.
        if (data.languageCode && data.languageCode !== currentLanguage) {
          setLanguage(data.languageCode);
        } else {
          router.refresh();
        }
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <AvatarUpload currentAvatarUrl={user.image} userName={user.name} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 text-green-700 rounded text-sm">
            Profile updated successfully!
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

        <div>
          <label htmlFor="languageCode" className="block text-sm font-medium mb-1">
            Preferred Language
          </label>
          <select
            {...register('languageCode')}
            id="languageCode"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border-gray-300 dark:border-neutral-700"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_NAMES[code]}
              </option>
            ))}
          </select>
          <p className="text-gray-500 text-xs mt-1">
            Content will be automatically translated to your preferred language
          </p>
          {errors.languageCode && (
            <p className="text-red-500 text-sm mt-1">{errors.languageCode.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm font-medium">Email notifications</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Receive emails when someone comments on or likes your posts
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-neutral-600'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
