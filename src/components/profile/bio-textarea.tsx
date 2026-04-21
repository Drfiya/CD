'use client';

import { useState, type ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface BioTextareaProps {
  register: UseFormRegisterReturn;
  defaultValue?: string;
  maxLength?: number;
  error?: string;
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

export function BioTextarea({
  register,
  defaultValue = '',
  maxLength = 500,
  error,
}: BioTextareaProps) {
  const [charCount, setCharCount] = useState(
    normalizeNewlines(defaultValue).length
  );
  const isOverLimit = charCount > maxLength;

  const { onChange: rhfOnChange, ...rest } = register;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    rhfOnChange(e);
    setCharCount(normalizeNewlines(e.target.value).length);
  };

  return (
    <div>
      <label htmlFor="bio" className="block text-sm font-medium mb-1">
        Bio
      </label>
      <textarea
        id="bio"
        defaultValue={defaultValue}
        rows={4}
        className={cn(
          'w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border-gray-300 dark:border-neutral-700',
          error && 'border-red-500'
        )}
        placeholder="Tell us about yourself..."
        {...rest}
        onChange={handleChange}
      />
      <div className="flex justify-between items-center mt-1">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <span
          className={cn(
            'text-sm ml-auto',
            isOverLimit ? 'text-red-500' : 'text-muted-foreground'
          )}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}
