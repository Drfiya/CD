'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { profileSchema, avatarSchema } from '@/lib/validations/profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAndAwardBadgesInternal } from '@/lib/badge-actions-internal';
import { LANGUAGE_COOKIE_NAME } from '@/lib/i18n/geolocation';

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const validatedFields = profileSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio'),
    languageCode: formData.get('languageCode') || undefined,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, bio, languageCode } = validatedFields.data;
  const emailNotifications = formData.get('emailNotifications') !== 'false';

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name,
      bio,
      emailNotifications,
      ...(languageCode && { languageCode }),
    },
  });

  // Mirror the saved language to the cookie so SSR (and the next /api/translate
  // request) sees the new preference without waiting for a separate set-language
  // round-trip. Keeps DB / cookie / client state in sync after profile save.
  if (languageCode) {
    const cookieStore = await cookies();
    cookieStore.set(LANGUAGE_COOKIE_NAME, languageCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // Fire-and-forget: profile update may complete the activation funnel (WELCOME badge)
  void checkAndAwardBadgesInternal(session.user.id).catch(() => {});

  revalidatePath('/profile/edit');
  revalidatePath(`/members/${session.user.id}`);

  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const file = formData.get('avatar');

  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  const validatedFields = avatarSchema.safeParse({ file });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = createAdminClient();

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${session.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filename, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;

  await db.user.update({
    where: { id: session.user.id },
    data: { image: publicUrl },
  });

  // Fire-and-forget: new avatar may complete the activation funnel (WELCOME badge)
  void checkAndAwardBadgesInternal(session.user.id).catch(() => {});

  revalidatePath('/profile/edit');
  revalidatePath(`/members/${session.user.id}`);

  return { success: true, url: publicUrl };
}
