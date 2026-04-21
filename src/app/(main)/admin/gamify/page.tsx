import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';
import { GamifyForm } from '@/components/admin/gamify-form';

export const metadata: Metadata = {
  title: 'Gamification Settings | Admin',
};

export default async function AdminGamifyPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!canEditSettings(session.user.role)) {
    redirect('/admin/posts');
  }

  const settings = await db.communitySettings.findFirst({
    select: {
      gamifyPointsPost: true,
      gamifyPointsComment: true,
      gamifyPointsLike: true,
      gamifyPointsLesson: true,
      gamifyLevelThresholds: true,
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">Gamification</h1>
        <p className="text-muted-foreground mt-1">
          Configure how many points each action awards and set the level thresholds.
        </p>
      </div>
      <GamifyForm
        pointsPost={settings?.gamifyPointsPost ?? 5}
        pointsComment={settings?.gamifyPointsComment ?? 2}
        pointsLike={settings?.gamifyPointsLike ?? 1}
        pointsLesson={settings?.gamifyPointsLesson ?? 10}
        levelThresholds={settings?.gamifyLevelThresholds ?? '0,50,120,210,320,450,600,770,960,1170'}
      />
    </div>
  );
}
