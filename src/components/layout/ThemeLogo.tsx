'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeLogoProps {
    lightSrc: string;
    darkSrc?: string | null;
    alt: string;
    width: number;
    height: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Theme-aware logo component.
 * Renders the dark logo when the theme is 'dark' (falls back to light logo if no dark variant).
 * Uses CSS hidden/block to avoid flash on theme change.
 */
export function ThemeLogo({
    lightSrc,
    darkSrc,
    alt,
    width,
    height,
    className,
    style,
}: ThemeLogoProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard: theme unknown on server
    useEffect(() => setMounted(true), []);

    // If no dark logo uploaded, always show the light logo
    if (!darkSrc) {
        return (
            <Image
                src={lightSrc}
                alt={alt}
                width={width}
                height={height}
                unoptimized
                className={className}
                style={style}
            />
        );
    }

    // Before mount, show light logo (SSR-safe) to avoid hydration mismatch
    if (!mounted) {
        return (
            <Image
                src={lightSrc}
                alt={alt}
                width={width}
                height={height}
                unoptimized
                className={className}
                style={style}
            />
        );
    }

    const activeSrc = resolvedTheme === 'dark' ? darkSrc : lightSrc;

    return (
        <Image
            src={activeSrc}
            alt={alt}
            width={width}
            height={height}
            unoptimized
            className={className}
            style={style}
        />
    );
}
