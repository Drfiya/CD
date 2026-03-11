'use server';

/**
 * Translation Feedback Server Actions
 *
 * Handles submission of community translation corrections.
 * Users can suggest improvements to machine-translated content,
 * which are stored as TranslationFeedback entries for admin review.
 */

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function submitTranslationFeedback(data: {
    postId?: string;
    commentId?: string;
    originalText: string;
    translatedText: string;
    suggestedCorrection: string;
    sourceLocale: string;
    targetLocale: string;
    feedbackType: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    await db.translationFeedback.create({
        data: {
            ...data,
            userId: session.user.id,
        },
    });

    revalidatePath('/admin/language-settings/feedback');
    return { success: true };
}
