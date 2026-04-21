import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { ProfileForm } from '@/components/profile/profile-form';

export const metadata = {
  title: 'Edit Profile',
};

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      languageCode: true,
      emailNotifications: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <ProfileForm user={user} />
    </div>
  );
}
