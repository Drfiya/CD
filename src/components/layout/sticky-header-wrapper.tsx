'use client';

import { ReactNode } from 'react';

interface StickyHeaderWrapperProps {
    children: ReactNode;
}

/**
 * Simple sticky wrapper for the unified header bar.
 */
export function StickyHeaderWrapper({ children }: StickyHeaderWrapperProps) {
    return (
        <div className="sticky top-0 z-50 bg-white dark:bg-neutral-900 transition-colors">
            {children}
        </div>
    );
}
