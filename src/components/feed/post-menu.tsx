'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deletePost } from '@/lib/post-actions';
import { useTranslations } from '@/components/translation/TranslationContext';

interface PostMenuProps {
  postId: string;
  isAuthor: boolean;
}

export function PostMenu({ postId, isAuthor }: PostMenuProps) {
  const ui = useTranslations('postMenu');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed/${postId}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePost(postId);
    if (!('error' in result)) {
      router.push('/feed');
      router.refresh();
    }
    setIsDeleting(false);
    setOpen(false);
    setConfirmDelete(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(!open); setConfirmDelete(false); }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Post menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 py-1 z-50">
          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {copied ? ui.copied : ui.copyLink}
          </button>

          {/* Author-only actions */}
          {isAuthor && (
            <>
              {/* Edit */}
              <button
                onClick={() => { router.push(`/feed/${postId}/edit`); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                {ui.editPost}
              </button>

              {/* Delete */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  {ui.deletePost}
                </button>
              ) : (
                <div className="px-4 py-2 space-y-2">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">{ui.confirmDelete}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600"
                      disabled={isDeleting}
                    >
                      {ui.cancel}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? ui.deleting : ui.deletePost}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
