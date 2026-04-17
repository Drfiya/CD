/**
 * Translation Budget Enforcement
 *
 * Daily character budget with automatic kill-switch. When the day's DeepL
 * spend (non-cached chars) exceeds `TranslationConfig.dailyCharBudget`,
 * the kill-switch activates and all subsequent DeepL calls are blocked
 * until an admin deactivates it or a new day starts.
 *
 * Cache-hit paths are never affected — they are free.
 */

import db from '@/lib/db';

export interface BudgetCheckResult {
    allowed: boolean;
    used: number;
    budget: number;
    killSwitchActive: boolean;
}

/**
 * Get or create the singleton TranslationConfig row.
 */
async function getConfig() {
    const existing = await db.translationConfig.findUnique({
        where: { id: 'singleton' },
    });
    if (existing) return existing;

    return db.translationConfig.create({
        data: { id: 'singleton' },
    });
}

/**
 * Check whether a new DeepL API call is allowed under the daily budget.
 *
 * Returns immediately if the kill-switch is already active. Otherwise,
 * queries today's non-cached character total from TranslationUsage.
 */
export async function checkBudget(): Promise<BudgetCheckResult> {
    try {
        const config = await getConfig();

        if (config.killSwitchActive) {
            return {
                allowed: false,
                used: 0,
                budget: config.dailyCharBudget,
                killSwitchActive: true,
            };
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayUsage = await db.translationUsage.aggregate({
            where: {
                date: { gte: todayStart },
                fromCache: false,
            },
            _sum: { charCount: true },
        });

        const used = todayUsage._sum.charCount ?? 0;

        return {
            allowed: used < config.dailyCharBudget,
            used,
            budget: config.dailyCharBudget,
            killSwitchActive: false,
        };
    } catch (error) {
        // Fail-open: if we can't verify the budget (e.g. missing table, DB
        // outage), allow the translation rather than silently degrading UX.
        // The kill-switch remains the manual safety net for runaway spend.
        console.warn('[budget] Check failed, allowing request (fail-open):', error);
        return { allowed: true, used: 0, budget: 50000, killSwitchActive: false };
    }
}

/**
 * Activate the kill-switch. Called automatically when budget is exceeded.
 * Sends a one-time alert email via Resend if ADMIN_EMAIL is configured.
 */
export async function activateKillSwitch(): Promise<void> {
    try {
        const config = await getConfig();

        // Already active — no-op
        if (config.killSwitchActive) return;

        await db.translationConfig.update({
            where: { id: 'singleton' },
            data: {
                killSwitchActive: true,
                killSwitchActivatedAt: new Date(),
            },
        });

        console.warn('[budget] Kill-switch ACTIVATED — DeepL calls blocked until admin reset.');

        // Send alert email (fire-and-forget)
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            try {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'noreply@scienceexperts.ai',
                    to: adminEmail,
                    subject: '[ScienceExperts] Translation budget exceeded — kill-switch activated',
                    text: `Daily DeepL character budget (${config.dailyCharBudget} chars) was exceeded.\n\nThe translation kill-switch has been activated. New translations will return cached results only.\n\nTo deactivate, go to Admin → Language Settings → Usage and toggle the kill-switch off.`,
                });
            } catch (emailError) {
                console.error('[budget] Failed to send alert email:', emailError);
            }
        }
    } catch (error) {
        console.error('[budget] Failed to activate kill-switch:', error);
    }
}

/**
 * Deactivate the kill-switch. Called from the admin UI.
 */
export async function deactivateKillSwitch(): Promise<void> {
    await db.translationConfig.update({
        where: { id: 'singleton' },
        data: {
            killSwitchActive: false,
            killSwitchActivatedAt: null,
        },
    });
    console.info('[budget] Kill-switch DEACTIVATED by admin.');
}

/**
 * Update the daily character budget. Called from the admin UI.
 */
export async function updateDailyBudget(newBudget: number): Promise<void> {
    await db.translationConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', dailyCharBudget: newBudget },
        update: { dailyCharBudget: newBudget },
    });
}

/**
 * Get current budget config for the admin dashboard.
 */
export async function getBudgetConfig() {
    return getConfig();
}
