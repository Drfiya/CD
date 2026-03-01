'use client';

/**
 * Team Timezones — prominent co-founder timezone display.
 * Shows US (CST) and Germany (CET/CEST) times with flag emojis.
 * Renders in the shared Command Center header across all tabs.
 */

import { useState, useEffect } from 'react';

function formatTime(tz: string): string {
    try {
        return new Date().toLocaleTimeString('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '—';
    }
}

export function TeamTimezones() {
    const [now, setNow] = useState(() => Date.now());

    // Tick every 30s to keep times fresh without excessive re-renders
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    const usTime = formatTime('America/Chicago');
    const deTime = formatTime('Europe/Berlin');

    return (
        <div className="flex items-center gap-4" key={now}>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-700/60 px-3 py-1.5 rounded-lg">
                <span className="text-lg">🇺🇸</span>
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-200">{usTime}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-700/60 px-3 py-1.5 rounded-lg">
                <span className="text-lg">🇩🇪</span>
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-200">{deTime}</span>
            </div>
        </div>
    );
}
