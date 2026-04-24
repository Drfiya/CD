'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Split-view chrome for /messages.
 *
 * Desktop (md+): two-column grid, always visible.
 *   [ Conversation list | Active chat / empty state ]
 *
 * Mobile (< md): two-page flow. `/messages` shows the list; `/messages/[id]`
 * shows the chat (with a back button in ChatWindow).
 */
export function MessagesShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const atInbox = pathname === '/messages' || pathname === '/messages/';
  const hasActive = pathname?.startsWith('/messages/') && !atInbox;

  return (
    <div className="mx-auto max-w-6xl h-[calc(100vh-var(--header-height,96px))] -mx-4 md:mx-auto md:px-0">
      <div className="grid h-full grid-cols-1 md:grid-cols-[320px_1fr] overflow-hidden border-y md:border md:rounded-lg border-border bg-card">
        <aside
          aria-label="Conversations"
          className={cn(
            'min-w-0 min-h-0 overflow-y-auto border-r border-border bg-card',
            hasActive ? 'hidden md:block' : 'block',
          )}
        >
          {sidebar}
        </aside>
        <section
          aria-label="Active conversation"
          className={cn(
            'min-w-0 min-h-0 flex flex-col bg-background',
            atInbox ? 'hidden md:flex' : 'flex',
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
