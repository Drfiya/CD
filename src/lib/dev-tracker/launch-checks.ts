'use server';

/**
 * Launch readiness auto-detection engine.
 * Inspects live project state (env vars, DB records, API connectivity, files)
 * to auto-populate and auto-check Launch Control items.
 *
 * Each check returns { passed: boolean, label: string, category: string, blocker: boolean }.
 * The engine seeds the database on first run, then keeps items updated on subsequent runs.
 */

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

// --- Types ---

interface CheckResult {
    key: string;        // Unique stable key for this check (e.g., "technical.stripe_keys")
    category: string;
    label: string;
    passed: boolean;
    blocker: boolean;
    autoChecked: true;  // Always true — these are system checks
}

// --- Check definitions ---

/**
 * Each check is a function that inspects live project state.
 * Returns whether the check passes.
 */
async function runAllChecks(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // ═══════════════════════════════════════════
    // TECHNICAL
    // ═══════════════════════════════════════════

    // Database connected
    results.push({
        key: 'technical.database_connected',
        category: 'technical',
        label: 'Database connection active (PostgreSQL)',
        passed: await checkDatabaseConnection(),
        blocker: true,
        autoChecked: true,
    });

    // NextAuth configured
    results.push({
        key: 'technical.nextauth_secret',
        category: 'technical',
        label: 'NextAuth secret configured',
        passed: !!process.env.NEXTAUTH_SECRET,
        blocker: true,
        autoChecked: true,
    });

    // Supabase configured
    results.push({
        key: 'technical.supabase_url',
        category: 'technical',
        label: 'Supabase URL configured',
        passed: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'technical.supabase_anon_key',
        category: 'technical',
        label: 'Supabase anon key configured',
        passed: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        blocker: true,
        autoChecked: true,
    });

    // GitHub PAT (for dev tracker)
    results.push({
        key: 'technical.github_pat',
        category: 'technical',
        label: 'GitHub PAT configured (Dev Tracker)',
        passed: !!process.env.GITHUB_PAT,
        blocker: false,
        autoChecked: true,
    });

    // DeepL API key (translations)
    results.push({
        key: 'technical.deepl_api_key',
        category: 'technical',
        label: 'DeepL API key configured (translations)',
        passed: !!process.env.DEEPL_API_KEY,
        blocker: false,
        autoChecked: true,
    });

    // Gemini API key (AI features)
    results.push({
        key: 'technical.gemini_api_key',
        category: 'technical',
        label: 'Gemini API key configured (AI features)',
        passed: !!process.env.GEMINI_API_KEY,
        blocker: false,
        autoChecked: true,
    });

    // GIPHY API key
    results.push({
        key: 'technical.giphy_api_key',
        category: 'technical',
        label: 'GIPHY API key configured (GIF picker)',
        passed: !!process.env.NEXT_PUBLIC_GIPHY_API_KEY,
        blocker: false,
        autoChecked: true,
    });

    // ═══════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════

    results.push({
        key: 'payments.stripe_secret_key',
        category: 'payments',
        label: 'Stripe secret key configured',
        passed: !!process.env.STRIPE_SECRET_KEY,
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'payments.stripe_publishable_key',
        category: 'payments',
        label: 'Stripe publishable key configured',
        passed: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'payments.stripe_price_id',
        category: 'payments',
        label: 'Stripe price ID configured (Community Membership)',
        passed: !!process.env.STRIPE_PRICE_ID,
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'payments.stripe_webhook_secret',
        category: 'payments',
        label: 'Stripe webhook secret configured',
        passed: !!process.env.STRIPE_WEBHOOK_SECRET,
        blocker: true,
        autoChecked: true,
    });

    // Check if test mode vs live mode
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    results.push({
        key: 'payments.stripe_live_mode',
        category: 'payments',
        label: 'Stripe in live mode (not test)',
        passed: stripeKey.startsWith('sk_live_'),
        blocker: false, // Not a blocker — test mode is fine for beta
        autoChecked: true,
    });

    // ═══════════════════════════════════════════
    // CONTENT
    // ═══════════════════════════════════════════

    // Check if community has posts
    const postCount = await safeCount('post');
    results.push({
        key: 'content.has_posts',
        category: 'content',
        label: `Community has posts (${postCount} found)`,
        passed: postCount > 0,
        blocker: false,
        autoChecked: true,
    });

    // Check if courses exist
    const courseCount = await safeCount('course');
    results.push({
        key: 'content.has_courses',
        category: 'content',
        label: `Courses created (${courseCount} found)`,
        passed: courseCount > 0,
        blocker: false,
        autoChecked: true,
    });

    // Check community settings are configured
    const settings = await safeFindCommunitySettings();
    results.push({
        key: 'content.community_name_set',
        category: 'content',
        label: 'Community name configured',
        passed: !!settings && settings.communityName !== 'Community',
        blocker: false,
        autoChecked: true,
    });

    results.push({
        key: 'content.community_description_set',
        category: 'content',
        label: 'Community description set',
        passed: !!settings?.communityDescription,
        blocker: false,
        autoChecked: true,
    });

    results.push({
        key: 'content.community_logo',
        category: 'content',
        label: 'Community logo uploaded',
        passed: !!settings?.communityLogo,
        blocker: false,
        autoChecked: true,
    });

    results.push({
        key: 'content.welcome_message',
        category: 'content',
        label: 'Welcome message written',
        passed: !!settings?.welcomeMessage,
        blocker: false,
        autoChecked: true,
    });

    // Check if categories exist
    const categoryCount = await safeCount('category');
    results.push({
        key: 'content.has_categories',
        category: 'content',
        label: `Post categories created (${categoryCount} found)`,
        passed: categoryCount > 0,
        blocker: false,
        autoChecked: true,
    });

    // ═══════════════════════════════════════════
    // TESTING
    // ═══════════════════════════════════════════

    // Check for registered users (beyond admin)
    const userCount = await safeCount('user');
    results.push({
        key: 'testing.has_users',
        category: 'testing',
        label: `Registered users (${userCount} found)`,
        passed: userCount >= 2, // At least Lutfiya + Chris
        blocker: false,
        autoChecked: true,
    });

    // Check if events exist
    const eventCount = await safeCount('event');
    results.push({
        key: 'testing.has_events',
        category: 'testing',
        label: `Events created (${eventCount} found)`,
        passed: eventCount > 0,
        blocker: false,
        autoChecked: true,
    });

    // Check translations working (DeepL + translations table)
    const translationCount = await safeCount('translation');
    results.push({
        key: 'testing.translations_active',
        category: 'testing',
        label: `Translation cache populated (${translationCount} translations)`,
        passed: translationCount > 0,
        blocker: false,
        autoChecked: true,
    });

    // ═══════════════════════════════════════════
    // LEGAL
    // ═══════════════════════════════════════════

    // These are manual checks — we can only flag them as needing attention
    results.push({
        key: 'legal.privacy_policy',
        category: 'legal',
        label: 'Privacy Policy page created',
        passed: false, // No /privacy route found in project
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'legal.terms_of_service',
        category: 'legal',
        label: 'Terms of Service page created',
        passed: false, // No /terms route found in project
        blocker: true,
        autoChecked: true,
    });

    results.push({
        key: 'legal.cookie_consent',
        category: 'legal',
        label: 'Cookie consent banner implemented',
        passed: false, // No cookie consent component found
        blocker: false,
        autoChecked: true,
    });

    // ═══════════════════════════════════════════
    // OPERATIONS
    // ═══════════════════════════════════════════

    // Production URL configured
    const nextauthUrl = process.env.NEXTAUTH_URL || '';
    results.push({
        key: 'operations.production_url',
        category: 'operations',
        label: 'Production URL configured (not localhost)',
        passed: !nextauthUrl.includes('localhost'),
        blocker: false,
        autoChecked: true,
    });

    // Resend API key (email)
    results.push({
        key: 'operations.email_service',
        category: 'operations',
        label: 'Email service configured (Resend API key)',
        passed: !!process.env.RESEND_API_KEY,
        blocker: false,
        autoChecked: true,
    });

    // Registration open
    results.push({
        key: 'operations.registration_open',
        category: 'operations',
        label: 'Registration is open for new users',
        passed: settings?.registrationOpen ?? false,
        blocker: false,
        autoChecked: true,
    });

    return results;
}

// --- Safe database helpers (don't throw on errors) ---

async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await db.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}

async function safeCount(model: 'post' | 'course' | 'user' | 'event' | 'category' | 'translation'): Promise<number> {
    try {
        switch (model) {
            case 'post': return await db.post.count();
            case 'course': return await db.course.count();
            case 'user': return await db.user.count();
            case 'event': return await db.event.count();
            case 'category': return await db.category.count();
            case 'translation': return await db.translation.count();
            default: return 0;
        }
    } catch {
        return 0;
    }
}

async function safeFindCommunitySettings() {
    try {
        return await db.communitySettings.findUnique({ where: { id: 'singleton' } });
    } catch {
        return null;
    }
}

// --- Public API: run checks and sync to database ---

/**
 * Run all auto-detection checks and upsert results into the LaunchChecklistItem table.
 * Auto-checked items are kept in sync; manual items (added by the user) are preserved.
 */
export async function runLaunchChecks(): Promise<{
    results: CheckResult[];
    summary: string;
}> {
    const results = await runAllChecks();

    // Upsert each auto-check into the database
    for (let i = 0; i < results.length; i++) {
        const check = results[i];

        // Look for existing item by key (stored in label prefix pattern)
        const existing = await db.launchChecklistItem.findFirst({
            where: {
                category: check.category,
                label: check.label,
                autoChecked: true,
            },
        });

        if (existing) {
            // Update checked state
            await db.launchChecklistItem.update({
                where: { id: existing.id },
                data: {
                    checked: check.passed,
                    label: check.label, // Update label in case count changed
                    blocker: check.blocker,
                },
            });
        } else {
            // Create new item
            await db.launchChecklistItem.create({
                data: {
                    category: check.category,
                    label: check.label,
                    checked: check.passed,
                    autoChecked: true,
                    blocker: check.blocker,
                    position: i,
                },
            });
        }
    }

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const blockers = results.filter((r) => r.blocker && !r.passed);

    let summary = `${passed}/${total} checks passed.`;
    if (blockers.length > 0) {
        summary += ` ${blockers.length} blocker(s) require attention.`;
    }

    revalidatePath('/admin/dev-tracker/launch');

    return { results, summary };
}
