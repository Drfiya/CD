# ADR-0001: Shared Rate Limiter via Upstash Redis

## Status

Proposed

## Context

The current rate limiter (`src/lib/api/rate-limit.ts`) uses an in-process `Map` to track request counts per scope/user. This works correctly on a single Node.js instance but has a critical limitation: on Vercel (or any horizontally-scaled deploy), each replica maintains its own independent counter map. A user rate-limited to 100 req/min effectively gets `100 * N` requests when N replicas are running, silently multiplying the effective DeepL budget.

The limiter is already wired into 7 mutable/expensive API routes with correct `userId`-precedence keying, scope isolation, and bounded memory (eviction every 5 min). The interface (`checkRateLimit` / `rateLimitHeaders`) is stable and consumed by all routes — only the backend needs to change.

## Decision

Replace the in-process `Map` backend with `@upstash/ratelimit` (sliding window algorithm) backed by Upstash Redis.

**Key design choices:**

1. **Upstash REST-based** — no persistent connection needed from Edge or Node. Compatible with Vercel Edge Functions.
2. **Same key shape** — `${scope}::u:${userId}` when authenticated, `${scope}::ip:${ip}` otherwise. No change to consuming routes.
3. **Graceful fallback** — when `UPSTASH_REDIS_REST_URL` is not set, fall back to the current in-process `Map` with a one-time startup warning. This keeps local dev frictionless.
4. **Remove `evictStale`** from the Upstash path — Redis handles TTL natively.

## Consequences

**Positive:**
- Rate limits become globally correct across all replicas.
- DeepL budget enforcement is real, not aspirational.
- Free tier of Upstash Redis is sufficient for this volume (~10k commands/day).

**Negative:**
- Adds `@upstash/redis` + `@upstash/ratelimit` dependencies.
- Requires `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars in production.
- Adds ~2-5ms per rate-limit check (Upstash REST round-trip) vs. ~0ms for in-process.

## Rollback

Keep the in-process fallback behind the absence of `UPSTASH_REDIS_REST_URL`. To rollback: unset the env vars. The module auto-detects and reverts to the `Map` backend.

## Migration Path

1. `npm install @upstash/redis @upstash/ratelimit`
2. Rewrite `src/lib/api/rate-limit.ts` with Upstash backend + Map fallback.
3. Update `.env.example` with placeholder env vars.
4. All 7 consuming routes are unaffected (same import, same interface).
5. Test: vitest for over-limit, scope isolation, local fallback.
