// CR10 A2 — Sitemap. Per brief: landing + auth pages only. Auth pages carry a
// static `noindex` meta tag, so they appear here for crawler discovery only.

import type { MetadataRoute } from 'next';

function resolveSiteUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000'
    );
}

export default function sitemap(): MetadataRoute.Sitemap {
    const siteUrl = resolveSiteUrl();
    const lastModified = new Date();

    return [
        {
            url: `${siteUrl}/`,
            lastModified,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${siteUrl}/login`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${siteUrl}/register`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${siteUrl}/forgot-password`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.1,
        },
        {
            url: `${siteUrl}/reset-password`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.1,
        },
        {
            url: `${siteUrl}/registration-success`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.1,
        },
    ];
}
