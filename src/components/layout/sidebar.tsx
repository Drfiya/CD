import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NavLink } from './nav-link';
import { SidebarUserMenu } from '@/components/auth/sidebar-user-menu';
import { getCommunitySettings } from '@/lib/settings-actions';
import { canModerateContent } from '@/lib/permissions';
import { ThemeLogo } from '@/components/layout/ThemeLogo';
import type { Messages } from '@/lib/i18n/messages/en';

const navLinks: Array<{ href: string; labelKey: keyof Messages['nav'] }> = [
  { href: '/', labelKey: 'home' },
  { href: '/feed', labelKey: 'feed' },
  { href: '/classroom', labelKey: 'classroom' },
  { href: '/calendar', labelKey: 'calendar' },
  { href: '/leaderboard', labelKey: 'leaderboards' },
  { href: '/members', labelKey: 'members' },
];

interface SidebarProps {
  messages: Messages;
}

export async function Sidebar({ messages }: SidebarProps) {
  const [settings, session] = await Promise.all([
    getCommunitySettings(),
    getServerSession(authOptions),
  ]);

  const userRole = session?.user?.role;
  const showAdminLink = userRole && canModerateContent(userRole);

  return (
    <aside className="w-64 border-r border-border bg-muted/30 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-3">
        {settings.communityLogo && (
          <ThemeLogo
            lightSrc={settings.communityLogo}
            darkSrc={settings.communityLogoDark}
            alt={`${settings.communityName} logo`}
            width={180}
            height={100}
            className="w-auto object-contain"
            style={{ height: `${settings.logoSize || 36}px`, maxWidth: '140px' }}
          />
        )}
        <span className="text-xl font-bold text-foreground truncate">
          {settings.communityName}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => (
          <NavLink key={link.href} href={link.href} label={messages.nav[link.labelKey]} />
        ))}
        {showAdminLink && <NavLink href="/admin" label={messages.nav.admin} />}
      </nav>

      {/* User info from session */}
      <SidebarUserMenu />
    </aside>
  );
}
