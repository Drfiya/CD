'use client';

import { useSession, signOut } from 'next-auth/react';

export function SidebarUserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-center gap-3 px-3 py-2 text-sm">
        <div className="w-8 h-8 rounded-full bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-800 flex items-center justify-center text-xs font-medium">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="mt-2 w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
