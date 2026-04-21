import { ThemeLogo } from '@/components/layout/ThemeLogo';
import { getCommunitySettings } from '@/lib/settings-actions';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getCommunitySettings();

  // CR9 F3: theme-aware auth shell. Previously hardcoded `bg-gradient-to-br from-gray-50 via-white to-gray-100` —
  // that produced a flash of white during sign-up in dark mode. The layout now leans on CSS custom properties
  // already defined in globals.css `@theme` + `.dark` override blocks, so the first paint matches whatever theme
  // the root layout (F2) seeded via `<html class="dark|light">`.
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-foreground)] px-4">
      {/* CR9 F3: anonymous visitors can toggle theme BEFORE signing up. Preference persists via localStorage
          while anon; F2 syncs to DB on first post-login toggle. */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        {settings.communityLogo && (
          <div className="flex justify-center mb-6">
            <ThemeLogo
              lightSrc={settings.communityLogo}
              darkSrc={settings.communityLogoDark}
              alt={`${settings.communityName} logo`}
              width={140}
              height={56}
              className="h-14 w-auto object-contain"
            />
          </div>
        )}

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-gray-100 dark:border-neutral-800 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
