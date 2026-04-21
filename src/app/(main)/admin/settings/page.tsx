import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getCommunitySettings } from '@/lib/settings-actions';
import { SettingsForm } from '@/components/admin/settings-form';
import { LandingSettingsForm } from '@/components/admin/landing-settings-form';

export const metadata: Metadata = {
  title: 'Community Settings | Admin',
};

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/posts');
  }

  const settings = await getCommunitySettings();

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">Community Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your community name, description, and branding
        </p>
      </div>

      <SettingsForm settings={settings} />

      <LandingSettingsForm settings={settings} />
    </div>
  );
}

