import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';
import { SearchButton } from '@/components/search/search-button';
import { NotificationBell } from '@/components/layout/notification-bell';
import { LanguageSelector } from '@/components/translation/LanguageSelector';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { HeaderNav } from '@/components/layout/header-nav';
import { getCommunitySettings } from '@/lib/settings-actions';
import type { Messages } from '@/lib/i18n/messages/en';

interface HeaderProps {
  messages: Messages;
  showAdminLink?: boolean;
}

export async function Header({ messages, showAdminLink }: HeaderProps) {
  const settings = await getCommunitySettings();

  // Constrain logo height to fit within the header (h-14 = 56px, with vertical padding)
  const effectiveLogoHeight = Math.min(settings.logoSize || 36, 40);

  return (
    <header className="border-b border-border bg-white dark:bg-neutral-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center gap-2 lg:gap-4">
        {/* Left: Logo — overflow hidden prevents bleeding past the border */}
        <div className="shrink-0 flex items-center overflow-hidden">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {settings.communityLogo ? (
              <>
                {/* Light mode logo (white background) */}
                <Image
                  src="/community-logo-light.png"
                  alt={`${settings.communityName} logo`}
                  width={180}
                  height={100}
                  unoptimized
                  className="w-auto object-contain dark:hidden"
                  style={{ height: `${effectiveLogoHeight}px`, maxWidth: '180px' }}
                />
                {/* Dark mode logo (dark background) */}
                <Image
                  src={settings.communityLogo}
                  alt={`${settings.communityName} logo`}
                  width={180}
                  height={100}
                  unoptimized
                  className="w-auto object-contain hidden dark:block"
                  style={{ height: `${effectiveLogoHeight}px`, maxWidth: '180px' }}
                />
              </>
            ) : (
              <>
                <div className="w-9 h-8 lg:h-9 rounded-md bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-neutral-300">
                  {settings.communityName?.slice(0, 2).toUpperCase() || 'GS'}
                </div>
                <span className="hidden lg:block text-lg font-semibold text-gray-900 dark:text-neutral-100">
                  {settings.communityName}
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Center: Navigation links (desktop) + mobile hamburger */}
        <HeaderNav messages={messages} />

        {/* Right: Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Language Selector — desktop only (available in hamburger on mobile) */}
          <div className="hidden lg:block">
            <LanguageSelector />
          </div>
          {/* Theme toggle — desktop only (available in hamburger on mobile) */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          {/* Search button */}
          <SearchButton placeholder={messages.search.placeholder} />
          {/* Notification bell with dropdown */}
          <NotificationBell />
          {/* User menu */}
          <UserMenu messages={messages} showAdminLink={showAdminLink} />
        </div>
      </div>
    </header>
  );
}
