'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { canEditSettings } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit-actions';
import { settingsSchema, logoSchema } from '@/lib/validations/settings';
import { translateUITexts } from '@/lib/translation/ui';

/**
 * Community settings type returned by getCommunitySettings.
 */
export type CommunitySettings = {
  id: string;
  communityName: string;
  communityDescription: string | null;
  communityLogo: string | null;
  logoSize: number;
  // Landing page fields
  landingHeadline: string | null;
  landingSubheadline: string | null;
  landingDescription: string | null;
  landingVideoUrls: string[];
  landingBenefits: string[];
  landingPriceUsd: number;
  landingPriceEur: number;
  landingCtaText: string | null;
  landingTestimonials: { name: string; text: string; role: string }[];
  landingTranslations: Record<string, LandingTranslation>;
};

/**
 * Per-language landing page content override.
 */
export type LandingTranslation = {
  headline?: string;
  subheadline?: string;
  description?: string;
  benefits?: string[];
  ctaText?: string;
  videoUrls?: string[];
};

/**
 * Get community settings, creating defaults if they don't exist.
 */
export async function getCommunitySettings(): Promise<CommunitySettings> {
  // Upsert singleton settings - creates if missing
  const settings = await db.communitySettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      communityName: 'Community',
    },
    select: {
      id: true,
      communityName: true,
      communityDescription: true,
      communityLogo: true,
      logoSize: true,
      landingHeadline: true,
      landingSubheadline: true,
      landingDescription: true,
      landingVideoUrls: true,
      landingBenefits: true,
      landingPriceUsd: true,
      landingPriceEur: true,
      landingCtaText: true,
      landingTestimonials: true,
      landingTranslations: true,
    },
  });

  return {
    ...settings,
    landingVideoUrls: (settings.landingVideoUrls as string[] | null) ?? [],
    landingBenefits: (settings.landingBenefits as string[] | null) ?? [],
    landingTestimonials: (settings.landingTestimonials as { name: string; text: string; role: string }[] | null) ?? [],
    landingTranslations: (settings.landingTranslations as Record<string, LandingTranslation> | null) ?? {},
  };
}

/**
 * Update community name and description.
 * Only callable by admin+ roles.
 */
export async function updateCommunitySettings(
  formData: FormData
): Promise<{ success?: boolean; error?: string | Record<string, string[]> }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canEditSettings(session.user.role)) {
    return { error: 'Permission denied' };
  }

  const validatedFields = settingsSchema.safeParse({
    communityName: formData.get('communityName'),
    communityDescription: formData.get('communityDescription'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { communityName, communityDescription } = validatedFields.data;

  // Get current settings for audit log
  const currentSettings = await getCommunitySettings();

  await db.communitySettings.upsert({
    where: { id: 'singleton' },
    update: {
      communityName,
      communityDescription,
    },
    create: {
      id: 'singleton',
      communityName,
      communityDescription,
    },
  });

  // Log audit event
  await logAuditEvent(session.user.id, 'UPDATE_SETTINGS', {
    targetId: 'singleton',
    targetType: 'SETTINGS',
    details: {
      previousName: currentSettings.communityName,
      newName: communityName,
      previousDescription: currentSettings.communityDescription,
      newDescription: communityDescription,
    },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout'); // Revalidate layout for sidebar/header

  return { success: true };
}

/**
 * Update logo display size.
 * Only callable by admin+ roles.
 */
export async function updateLogoSize(
  size: number
): Promise<{ success?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canEditSettings(session.user.role)) {
    return { error: 'Permission denied' };
  }

  // Clamp between 20 and 80
  const clampedSize = Math.max(20, Math.min(80, Math.round(size)));

  await db.communitySettings.update({
    where: { id: 'singleton' },
    data: { logoSize: clampedSize },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');

  return { success: true };
}

/**
 * Upload community logo.
 * Stores logo locally in /public/ for reliable serving.
 * Only callable by admin+ roles.
 */
export async function uploadCommunityLogo(
  formData: FormData
): Promise<{ success?: boolean; url?: string; error?: string | Record<string, string[]> }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canEditSettings(session.user.role)) {
    return { error: 'Permission denied' };
  }

  const file = formData.get('logo');

  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  const validatedFields = logoSchema.safeParse({ file });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  // Write logo to /public/ locally
  const ext = file.name.split('.').pop() || 'png';
  const filename = `community-logo.${ext}`;
  const { writeFile, unlink } = await import('fs/promises');
  const { existsSync } = await import('fs');
  const { join } = await import('path');

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const publicDir = join(process.cwd(), 'public');
  const filepath = join(publicDir, filename);

  // Remove old logos with different extensions
  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
  for (const e of extensions) {
    const oldPath = join(publicDir, `community-logo.${e}`);
    if (e !== ext && existsSync(oldPath)) {
      await unlink(oldPath).catch(() => { });
    }
  }

  await writeFile(filepath, buffer);

  const publicUrl = `/${filename}?v=${Date.now()}`;

  // Get current settings for audit log
  const currentSettings = await getCommunitySettings();

  await db.communitySettings.upsert({
    where: { id: 'singleton' },
    update: {
      communityLogo: publicUrl,
    },
    create: {
      id: 'singleton',
      communityName: 'Community',
      communityLogo: publicUrl,
    },
  });

  // Log audit event
  await logAuditEvent(session.user.id, 'UPDATE_SETTINGS', {
    targetId: 'singleton',
    targetType: 'SETTINGS',
    details: {
      action: 'logo_upload',
      previousLogo: currentSettings.communityLogo,
      newLogo: publicUrl,
    },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout'); // Revalidate layout for sidebar/header

  return { success: true, url: publicUrl };
}

/**
 * Remove community logo.
 * Only callable by admin+ roles.
 */
export async function removeCommunityLogo(): Promise<{ success?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canEditSettings(session.user.role)) {
    return { error: 'Permission denied' };
  }

  // Get current settings for audit log
  const currentSettings = await getCommunitySettings();

  if (!currentSettings.communityLogo) {
    return { success: true }; // Already no logo
  }

  await db.communitySettings.update({
    where: { id: 'singleton' },
    data: {
      communityLogo: null,
    },
  });

  // Log audit event
  await logAuditEvent(session.user.id, 'UPDATE_SETTINGS', {
    targetId: 'singleton',
    targetType: 'SETTINGS',
    details: {
      action: 'logo_remove',
      previousLogo: currentSettings.communityLogo,
    },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout'); // Revalidate layout for sidebar/header

  return { success: true };
}

/**
 * Update landing page settings.
 * Only callable by admin+ roles.
 */
export async function updateLandingPageSettings(
  data: {
    landingHeadline?: string;
    landingSubheadline?: string;
    landingDescription?: string;
    landingVideoUrls?: string[];
    landingBenefits?: string[];
    landingPriceUsd?: number;
    landingPriceEur?: number;
    landingCtaText?: string;
    landingTestimonials?: { name: string; text: string; role: string }[];
  }
): Promise<{ success?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canEditSettings(session.user.role)) {
    return { error: 'Permission denied' };
  }

  await db.communitySettings.upsert({
    where: { id: 'singleton' },
    update: {
      ...(data.landingHeadline !== undefined && { landingHeadline: data.landingHeadline }),
      ...(data.landingSubheadline !== undefined && { landingSubheadline: data.landingSubheadline }),
      ...(data.landingDescription !== undefined && { landingDescription: data.landingDescription }),
      ...(data.landingVideoUrls !== undefined && { landingVideoUrls: data.landingVideoUrls }),
      ...(data.landingBenefits !== undefined && { landingBenefits: data.landingBenefits }),
      ...(data.landingPriceUsd !== undefined && { landingPriceUsd: data.landingPriceUsd }),
      ...(data.landingPriceEur !== undefined && { landingPriceEur: data.landingPriceEur }),
      ...(data.landingCtaText !== undefined && { landingCtaText: data.landingCtaText }),
      ...(data.landingTestimonials !== undefined && { landingTestimonials: data.landingTestimonials }),
    },
    create: {
      id: 'singleton',
      communityName: 'Community',
      ...data,
    },
  });

  // Log audit event
  await logAuditEvent(session.user.id, 'UPDATE_SETTINGS', {
    targetId: 'singleton',
    targetType: 'SETTINGS',
    details: {
      action: 'landing_page_update',
      updatedFields: Object.keys(data),
    },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/'); // Revalidate landing page

  return { success: true };
}

/**
 * Update landing page translation for a specific language.
 * Merges into the landingTranslations JSON column.
 */
export async function updateLandingTranslation(
  lang: string,
  data: LandingTranslation
): Promise<{ success?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Not authenticated' };
  if (!canEditSettings(session.user.role)) return { error: 'Permission denied' };

  const current = await getCommunitySettings();
  const translations = { ...current.landingTranslations };
  translations[lang] = { ...(translations[lang] ?? {}), ...data };

  await db.communitySettings.update({
    where: { id: 'singleton' },
    data: { landingTranslations: translations },
  });

  await logAuditEvent(session.user.id, 'UPDATE_SETTINGS', {
    targetId: 'singleton',
    targetType: 'SETTINGS',
    details: { action: 'landing_translation_update', language: lang },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { success: true };
}

/**
 * Auto-translate all EN landing page content to a target language using DeepL.
 * Returns the translated content without saving (admin can review before saving).
 */
export async function autoTranslateLanding(
  targetLang: string
): Promise<{ data?: LandingTranslation; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Not authenticated' };
  if (!canEditSettings(session.user.role)) return { error: 'Permission denied' };
  if (targetLang === 'en') return { error: 'Cannot translate to English (source language)' };

  const settings = await getCommunitySettings();

  const headline = settings.landingHeadline || 'Join the Science Experts Community Today';
  const subheadline = settings.landingSubheadline || 'Where researchers, scientists, and innovators connect, learn, and grow together.';
  const description = settings.landingDescription || 'Get access to exclusive courses, expert discussions, live events, and a network of brilliant minds. Whether you\'re a seasoned researcher or an aspiring scientist — this is your community.';
  const ctaText = settings.landingCtaText || 'Join Now';
  const benefits = settings.landingBenefits.length > 0 ? settings.landingBenefits : [
    'Access to all expert-led courses and masterclasses',
    'Join live Q&A sessions and workshops with leading scientists',
    'Private discussion forums with peer researchers',
    'Weekly science briefings and trend analysis',
    'Exclusive networking events and collaborations',
    'Certificate of participation for completed courses',
    'Direct access to mentors and advisors',
    'Community-driven research project opportunities',
  ];

  try {
    const [translatedTexts, translatedBenefits] = await Promise.all([
      translateUITexts([headline, subheadline, description, ctaText], 'en', targetLang, 'landing_page'),
      translateUITexts(benefits, 'en', targetLang, 'landing_page'),
    ]);

    return {
      data: {
        headline: translatedTexts[0],
        subheadline: translatedTexts[1],
        description: translatedTexts[2],
        ctaText: translatedTexts[3],
        benefits: translatedBenefits,
      },
    };
  } catch (err) {
    console.error('Auto-translate error:', err);
    return { error: 'Translation failed. Please try again.' };
  }
}
