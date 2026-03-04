import { getCommunitySettings } from '@/lib/settings-actions';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getCommunitySettings();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        {settings.communityLogo && (
          <div className="flex justify-center mb-6">
            <img
              src={settings.communityLogo}
              alt={`${settings.communityName} logo`}
              className="h-14 object-contain"
            />
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
