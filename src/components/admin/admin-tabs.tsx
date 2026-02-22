'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/permissions';
import { canManageMembers, canEditSettings } from '@/lib/permissions';

interface AdminTabsProps {
  role: Role;
}

interface Tab {
  href: string;
  label: string;
  /** Check function - tab only shown if this returns true */
  canAccess: (role: Role) => boolean;
}

const tabs: Tab[] = [
  {
    href: '/admin/posts',
    label: 'Posts',
    canAccess: () => true, // All moderator+ users can see posts
  },
  {
    href: '/admin/comments',
    label: 'Comments',
    canAccess: () => true, // All moderator+ users can see comments
  },
  {
    href: '/admin/members',
    label: 'Members',
    canAccess: (role) => canManageMembers(role),
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/courses',
    label: 'Courses',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/events',
    label: 'Events',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/kanban',
    label: 'Kanban',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/audit-log',
    label: 'Audit Log',
    canAccess: (role) => canEditSettings(role),
  },
  {
    href: '/admin/dev-tracker',
    label: 'Dev Tracker',
    canAccess: (role) => canEditSettings(role),
  },
];

/**
 * Admin navigation tabs - shows tabs based on user's role permissions.
 */
export function AdminTabs({ role }: AdminTabsProps) {
  const pathname = usePathname();

  const visibleTabs = tabs.filter((tab) => tab.canAccess(role));

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
