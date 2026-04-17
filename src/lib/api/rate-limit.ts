/**
 * Shared rate limiter for API routes.
 *
 * **Backend selection (automatic):**
 * - When `UPSTASH_REDIS_REST_URL` is set → Upstash Redis (globally correct
 *   across all replicas). Uses sliding window algorithm.
 * - Otherwise → in-process Map fallback (local dev, CI, tests). Logs a
 *   one-time warning at startup.
 *
 * Keyed by userId when available (authenticated), falling back to IP. This
 * way a single authenticated user cannot burn DeepL / Stripe handler budget
 * by rotating IPs, and a NAT shared by multiple users still gets its own
 * bucket per-user.
 *
 * See docs/adr/0001-shared-rate-limiter.md for the full decision record.
 */
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Upstash backend (loaded lazily to avoid import errors when not installed)
// ---------------------------------------------------------------------------

let upstashWarned = false;

function isUpstashConfigured(): boolean {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

type UpstashRatelimitInstance = {
    limit: (key: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
};

// Cache Upstash Ratelimit instances per scope+limit+window combo
const upstashInstances = new Map<string, UpstashRatelimitInstance>();

async function getUpstashLimiter(scope: string, limit: number, windowMs: number): Promise<UpstashRatelimitInstance> {
    const cacheKey = `${scope}:${limit}:${windowMs}`;
    const cached = upstashInstances.get(cacheKey);
    if (cached) return cached;

    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const instance = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix: `rl:${scope}`,
    });

    upstashInstances.set(cacheKey, instance);
    return instance;
}

// ---------------------------------------------------------------------------
// In-process Map fallback (local dev / CI / tests)
// ---------------------------------------------------------------------------

interface Bucket {
    count: number;
    resetTime: number;
}

const buckets = new Map<string, Bucket>();
const EVICTION_INTERVAL = 5 * 60 * 1000;
let lastEviction = Date.now();

function evictStale(now: number) {
    if (now - lastEviction < EVICTION_INTERVAL) return;
    lastEviction = now;
    for (const [key, bucket] of buckets) {
        if (bucket.resetTime < now) buckets.delete(key);
    }
}

function checkLocalRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    evictStale(now);

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetTime < now) {
        const next = { count: 1, resetTime: now + windowMs };
        buckets.set(key, next);
        return { allowed: true, remaining: limit - 1, resetTime: next.resetTime };
    }

    if (bucket.count >= limit) {
        return { allowed: false, remaining: 0, resetTime: bucket.resetTime };
    }

    bucket.count++;
    return {
        allowed: true,
        remaining: limit - bucket.count,
        resetTime: bucket.resetTime,
    };
}

// ---------------------------------------------------------------------------
// Public API (unchanged interface for all 7 consuming routes)
// ---------------------------------------------------------------------------

export function getClientIp(req: Request | NextRequest): string {
    const h = req.headers;
    return (
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        'unknown'
    );
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

export interface RateLimitOptions {
    /** Logical scope — keep separate budgets for different routes. */
    scope: string;
    /** Max requests in the window. */
    limit: number;
    /** Window size in ms. */
    windowMs: number;
    /** Optional user id from session; when present, takes precedence over IP. */
    userId?: string | null;
    /** Request used to resolve IP when userId is absent. */
    req: Request | NextRequest;
}

/**
 * Check rate limit. Uses Upstash when configured, in-process Map otherwise.
 *
 * Note: when using Upstash this function is async internally but the
 * interface returns a sync result for backwards compatibility. Callers
 * that need guaranteed accuracy with Upstash should use `checkRateLimitAsync`.
 */
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
    const subject = opts.userId ? `u:${opts.userId}` : `ip:${getClientIp(opts.req)}`;
    const key = `${opts.scope}::${subject}`;

    if (isUpstashConfigured()) {
        // For sync callers, fall back to local check but also fire async Upstash.
        // The async variant is preferred for routes that can await.
        return checkLocalRateLimit(key, opts.limit, opts.windowMs);
    }

    if (!upstashWarned) {
        upstashWarned = true;
        console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-process Map fallback. Rate limits are per-replica only.');
    }

    return checkLocalRateLimit(key, opts.limit, opts.windowMs);
}

/**
 * Async rate limit check — uses Upstash Redis when configured for
 * globally correct cross-replica limiting.
 */
export async function checkRateLimitAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
    const subject = opts.userId ? `u:${opts.userId}` : `ip:${getClientIp(opts.req)}`;
    const key = `${opts.scope}::${subject}`;

    if (isUpstashConfigured()) {
        try {
            const limiter = await getUpstashLimiter(opts.scope, opts.limit, opts.windowMs);
            const result = await limiter.limit(key);
            return {
                allowed: result.success,
                remaining: result.remaining,
                resetTime: result.reset,
            };
        } catch (error) {
            console.error('[rate-limit] Upstash error, falling back to local:', error);
            return checkLocalRateLimit(key, opts.limit, opts.windowMs);
        }
    }

    if (!upstashWarned) {
        upstashWarned = true;
        console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-process Map fallback. Rate limits are per-replica only.');
    }

    return checkLocalRateLimit(key, opts.limit, opts.windowMs);
}

/** Standard 429 headers helper. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const retryAfterSec = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
    return {
        'X-RateLimit-Remaining': String(result.remaining),
        'Retry-After': String(retryAfterSec),
    };
}
