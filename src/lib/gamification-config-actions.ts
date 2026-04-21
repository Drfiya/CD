'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateGamificationConfig(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canEditSettings(session.user.role as 'owner' | 'admin' | 'moderator' | 'member')) {
    return { error: 'Unauthorized' };
  }

  const pointsPost = Number(formData.get('pointsPost')) || 5;
  const pointsComment = Number(formData.get('pointsComment')) || 2;
  const pointsLike = Number(formData.get('pointsLike')) || 1;
  const pointsLesson = Number(formData.get('pointsLesson')) || 10;
  const levelThresholds = (formData.get('levelThresholds') as string) || '0,50,120,210,320,450,600,770,960,1170';

  // Validate thresholds: must be comma-separated integers, ascending
  const parts = levelThresholds.split(',').map((s) => parseInt(s.trim(), 10));
  if (parts.some(isNaN) || parts.length < 2) {
    return { error: 'Level thresholds must be comma-separated numbers (at least 2 levels).' };
  }
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] <= parts[i - 1]) {
      return { error: 'Level thresholds must be in ascending order.' };
    }
  }
  if (parts[0] !== 0) {
    return { error: 'First level threshold must be 0.' };
  }

  try {
    await db.communitySettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        gamifyPointsPost: pointsPost,
        gamifyPointsComment: pointsComment,
        gamifyPointsLike: pointsLike,
        gamifyPointsLesson: pointsLesson,
        gamifyLevelThresholds: parts.join(','),
      },
      update: {
        gamifyPointsPost: pointsPost,
        gamifyPointsComment: pointsComment,
        gamifyPointsLike: pointsLike,
        gamifyPointsLesson: pointsLesson,
        gamifyLevelThresholds: parts.join(','),
      },
    });

    revalidatePath('/admin/gamify');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save.' };
  }
}
