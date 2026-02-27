'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

interface SearchButtonProps {
    placeholder?: string;
}

/**
 * Compact search button that shows a rounded-square icon.
 * Clicking opens an inline search overlay; Cmd+K also opens it.
 */
export function SearchButton({ placeholder }: SearchButtonProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    // Cmd/Ctrl+K shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-focus input when opening
    useEffect(() => {
        if (isOpen) {
            // Small delay to let the DOM render
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setIsOpen(false);
            setQuery('');
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Search icon button — rounded square */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Search"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
            </button>

            {/* Expandable search overlay */}
            {isOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 top-full mt-2 z-50">
                    <form onSubmit={handleSubmit} className="flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={placeholder || 'Search...'}
                            className="w-72 px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 border-2 border-[#D94A4A] shadow-lg focus:ring-2 focus:ring-[#D94A4A]/30 focus:outline-none transition-colors"
                        />
                    </form>
                </div>
            )}
        </div>
    );
}
