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

  // Use the admin-configured logo size directly
  const effectiveLogoHeight = settings.logoSize || 36;
  // Header height adapts: logo height + 16px vertical padding
  const headerHeight = Math.max(56, effectiveLogoHeight + 16);

  return (
    <header className="border-b border-border bg-white dark:bg-neutral-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 lg:gap-4" style={{ height: `${headerHeight}px` }}>
        {/* Left: Logo — overflow hidden prevents bleeding past the border */}
        <div className="shrink-0 flex items-center overflow-hidden lg:min-w-[220px]">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {settings.communityLogo ? (
              <Image
                src={settings.communityLogo}
                alt={`${settings.communityName} logo`}
                width={180}
                height={100}
                unoptimized
                className="w-auto object-contain"
                style={{ height: `${effectiveLogoHeight}px`, maxWidth: '180px' }}
              />
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
        <div className="shrink-0 flex items-center gap-2 lg:min-w-[220px] lg:justify-end">
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
