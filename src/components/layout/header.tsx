import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';
import { SearchBar } from '@/components/search/search-bar';
import { LanguageSelector } from '@/components/translation/LanguageSelector';
import { getCommunitySettings } from '@/lib/settings-actions';
import type { Messages } from '@/lib/i18n/messages/en';

interface HeaderProps {
  messages: Messages;
}

export async function Header({ messages }: HeaderProps) {
  const settings = await getCommunitySettings();

  return (
    <header className="min-h-16 border-b border-border bg-white py-2">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-2 lg:gap-6">
        {/* Left column - logo */}
        <div className="shrink-0 flex items-center">
          <Link href="/" className="flex items-center gap-2 lg:gap-3 hover:opacity-80 transition-opacity ml-4">
            {settings.communityLogo ? (
              <Image
                src={settings.communityLogo}
                alt={`${settings.communityName} logo`}
                width={180}
                height={100}
                unoptimized
                className="w-auto object-contain"
                style={{ height: `${settings.logoSize || 36}px`, maxWidth: '200px' }}
              />
            ) : (
              <>
                <div className="w-9 h-8 lg:h-9 rounded-md bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  {settings.communityName?.slice(0, 2).toUpperCase() || 'GS'}
                </div>
                {/* Community name fallback - only shown when no logo */}
                <span className="hidden lg:block text-lg font-semibold text-gray-900">
                  {settings.communityName}
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Mobile: Community name centered - matches search bar position exactly */}
        <div className="flex lg:hidden flex-1 items-center justify-center">
          <div className="w-full max-w-[200px] text-center">
            <Link href="/" className="text-sm font-semibold text-gray-900 truncate">
              {settings.communityName}
            </Link>
          </div>
        </div>

        {/* Desktop: Search centered */}
        <div className="hidden lg:flex flex-1 min-w-0 justify-center">
          <SearchBar placeholder={messages.search.placeholder} />
        </div>

        {/* Right column - Fixed width on mobile to match nav bell area */}
        <div className="w-10 lg:w-auto shrink-0 flex items-center justify-end gap-2 lg:gap-3">
          {/* Plus button - hidden on mobile for symmetry */}
          <button className="hidden lg:flex w-9 h-9 rounded-full bg-gray-100 items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {/* Language Selector - hidden on mobile */}
          <div className="hidden lg:block">
            <LanguageSelector />
          </div>
          {/* Bell notification icon */}
          <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {/* Notification badge - uncomment and add count when notifications exist */}
            {/* <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">3</span> */}
          </button>
          {/* User menu */}
          <UserMenu messages={messages} />
        </div>
      </div>
    </header>
  );
}





