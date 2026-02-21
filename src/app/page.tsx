import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCommunitySettings } from '@/lib/settings-actions';
import { isEuropeanCountry } from '@/lib/i18n/geolocation';
import { tMany } from '@/lib/translation/helpers';
import db from '@/lib/db';
import { LandingVideoPlayer } from '@/components/landing/LandingVideoPlayer';
import { LandingPricing } from '@/components/landing/LandingPricing';
import './landing.css';

export default async function LandingPage() {
    // If logged in, redirect to feed
    const session = await getServerSession(authOptions);
    if (session?.user) {
        redirect('/feed');
    }

    const settings = await getCommunitySettings();

    // Detect European visitor for currency
    const headersList = await headers();
    const countryCode = headersList.get('x-vercel-ip-country')
        || headersList.get('cf-ipcountry')
        || null;
    const isEurope = isEuropeanCountry(countryCode);

    // Get community stats
    const [memberCount, courseCount] = await Promise.all([
        db.user.count(),
        db.course.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    ]);

    // Default content (science community focused)
    const headline = settings.landingHeadline || 'Join the Science Experts Community';
    const subheadline = settings.landingSubheadline || 'Where researchers, scientists, and innovators connect, learn, and grow together.';
    const description = settings.landingDescription || 'Get access to exclusive courses, expert discussions, live events, and a network of brilliant minds. Whether you\'re a seasoned researcher or an aspiring scientist — this is your community.';
    const benefits = settings.landingBenefits.length > 0 ? settings.landingBenefits : [
        'Access to all expert-led courses and masterclasses',
        'Join live Q&A sessions and workshops with leading scientists',
        'Private discussion forums with peer researchers',
        'Weekly science briefings and trend analysis',
        'Exclusive networking events and collaborations',
        'Certificate of participation for completed courses',
        'Direct access to mentors and advisors',
        'Community-driven research project opportunities',
    ];
    const ctaText = settings.landingCtaText || 'Join Now';

    // Translate texts
    const translated = await tMany({
        headline,
        subheadline,
        description,
        ctaText,
        statsMembers: 'Members',
        statsCourses: 'Courses',
        statsOnline: 'Online',
        whatYouGet: 'What You Get',
        aboutTitle: 'About Our Community',
        logIn: 'Log In',
        joinNow: 'Join Now',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
    }, 'landing_page');

    const translatedBenefits = await Promise.all(
        benefits.map(b => tMany({ benefit: b }, 'landing_page').then(r => r.benefit))
    );

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <Link href="/" className="landing-nav-logo">
                        {settings.communityLogo ? (
                            <Image
                                src={settings.communityLogo}
                                alt={settings.communityName}
                                width={200}
                                height={100}
                                unoptimized
                                className="landing-logo-img"
                                style={{ height: `${settings.logoSize || 36}px`, width: 'auto', maxWidth: '200px' }}
                            />
                        ) : (
                            <span className="landing-logo-text">{settings.communityName}</span>
                        )}
                    </Link>
                    <div className="landing-nav-actions">
                        <Link href="/login" className="landing-nav-login">{translated.logIn}</Link>
                        <Link href="/register" className="landing-nav-join">{translated.joinNow}</Link>
                    </div>
                </div>
            </nav>

            {/* Video Section – above the fold */}
            {settings.landingVideoUrls.length > 0 && (
                <section className="landing-video-hero">
                    <div className="landing-container">
                        <LandingVideoPlayer videoUrls={settings.landingVideoUrls} />
                    </div>
                </section>
            )}

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero-bg" />
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span className="landing-hero-badge-dot" />
                        {settings.communityName}
                    </div>
                    <h1 className="landing-hero-title">{translated.headline}</h1>
                    <p className="landing-hero-subtitle">{translated.subheadline}</p>
                    <div className="landing-hero-actions">
                        <Link href="/register" className="landing-hero-cta-primary">{translated.joinNow}</Link>
                        <Link href="/login" className="landing-hero-cta-secondary">{translated.logIn}</Link>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="landing-stats">
                <div className="landing-container">
                    <div className="landing-stats-grid">
                        <div className="landing-stat">
                            <span className="landing-stat-value">{memberCount}</span>
                            <span className="landing-stat-label">{translated.statsMembers}</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">{courseCount}</span>
                            <span className="landing-stat-label">{translated.statsCourses}</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value landing-stat-online">
                                <span className="landing-online-dot" />
                                {Math.max(1, Math.floor(memberCount * 0.15))}
                            </span>
                            <span className="landing-stat-label">{translated.statsOnline}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits + Pricing Side by Side */}
            <section className="landing-section">
                <div className="landing-container">
                    <div className="landing-benefits-pricing">
                        {/* Benefits */}
                        <div className="landing-benefits">
                            <h2 className="landing-section-title">{translated.whatYouGet}</h2>
                            <ul className="landing-benefits-list">
                                {translatedBenefits.map((benefit, i) => (
                                    <li key={i} className="landing-benefit-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="landing-benefit-check">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pricing Sidebar */}
                        <div className="landing-pricing-wrapper">
                            <div className="landing-pricing-sidebar">
                                {settings.communityLogo ? (
                                    <Image
                                        src={settings.communityLogo}
                                        alt={settings.communityName}
                                        width={120}
                                        height={120}
                                        unoptimized
                                        className="landing-pricing-logo"
                                    />
                                ) : (
                                    <div className="landing-pricing-logo-fallback">
                                        {settings.communityName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <h3 className="landing-pricing-name">{settings.communityName}</h3>
                                {settings.communityDescription && (
                                    <p className="landing-pricing-desc">{settings.communityDescription}</p>
                                )}
                                <div className="landing-pricing-stats-mini">
                                    <span>{memberCount} {translated.statsMembers}</span>
                                </div>
                                <LandingPricing
                                    priceUsd={settings.landingPriceUsd}
                                    priceEur={settings.landingPriceEur}
                                    isEurope={isEurope}
                                    ctaText={translated.ctaText}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="landing-section landing-about">
                <div className="landing-container">
                    <h2 className="landing-section-title">{translated.aboutTitle}</h2>
                    <div className="landing-about-text">
                        {translated.description.split('\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="landing-footer-inner">
                        <div className="landing-footer-links">
                            <Link href="/login">{translated.logIn}</Link>
                            <span className="landing-footer-sep">·</span>
                            <Link href="/register">{translated.joinNow}</Link>
                        </div>
                        <div className="landing-footer-legal">
                            <span>{translated.privacyPolicy}</span>
                            <span className="landing-footer-sep">·</span>
                            <span>{translated.termsOfService}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
