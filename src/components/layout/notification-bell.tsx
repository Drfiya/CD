'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { NotificationItem } from '@/types/notifications';

interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationItem[];
  onMarkRead: (item: NotificationItem) => void;
  onMarkAllRead: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function actorPhrase(item: NotificationItem): string {
  const primary = item.actorName ?? 'Someone';
  if (item.groupSize <= 1) return primary;
  const second = item.additionalActors[0]?.name ?? 'someone';
  if (item.groupSize === 2) return `${primary} and ${second}`;
  const othersCount = item.groupSize - 2;
  return `${primary}, ${second}, and ${othersCount} other${othersCount === 1 ? '' : 's'}`;
}

function notificationLabel(item: NotificationItem): string {
  const subject = actorPhrase(item);
  if (item.type === 'COMMENT') {
    return item.groupSize > 1
      ? `${subject} commented on your post`
      : `${subject} commented on your post`;
  }
  if (item.type === 'LIKE') {
    return item.groupSize > 1
      ? `${subject} liked your post`
      : `${subject} liked your post`;
  }
  if (item.type === 'MENTION') return `${subject} mentioned you`;
  return `${subject} sent a notification`;
}

export function NotificationBell({
  unreadCount,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function handleItemClick(item: NotificationItem) {
    if (!item.isRead) onMarkRead(item);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-border z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 mx-auto text-gray-300 dark:text-neutral-600 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-neutral-400">No notifications yet</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border" role="list">
              {notifications.map((item) => {
                const href = item.postId ? `/feed/${item.postId}` : '/feed';
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      onClick={() => handleItemClick(item)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors ${
                        !item.isRead ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      {item.actorImage ? (
                        <Image
                          src={item.actorImage}
                          alt={item.actorName ?? 'User'}
                          width={32}
                          height={32}
                          className="rounded-full shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-600 shrink-0 mt-0.5 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-neutral-300">
                          {item.actorName?.slice(0, 1).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-neutral-200 leading-snug">
                          {notificationLabel(item)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
