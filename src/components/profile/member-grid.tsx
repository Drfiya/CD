'use client';

import { useState } from 'react';
import { MemberCard } from './member-card';

interface Member {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  level: number;
  points: number;
}

interface MemberGridProps {
  members: Member[];
  searchPlaceholder: string;
}

export function MemberGrid({ members, searchPlaceholder }: MemberGridProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? members.filter((m) =>
      (m.name || '').toLowerCase().includes(search.toLowerCase())
    )
    : members;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#D94A4A]/30 focus:border-[#D94A4A] transition-colors"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-8 text-center text-gray-500 dark:text-neutral-400">
          No members found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
