# ScienceExperts.ai Community Platform

Next.js 16 community SaaS with authenticated feed, classroom, events, calendar,
leaderboard, gamification, Stripe paywall, admin tooling, and a first-class
multilingual content layer (DE / EN / FR) backed by a 3-tier translation cache.

## Stack

- Next.js 16.1 (App Router, React 19.2)
- TypeScript · Tailwind v4
- Prisma 7 + PostgreSQL
- Supabase (SSR + Storage)
- NextAuth 4 · Stripe · Tiptap · Resend · sharp

## Local development

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# fill in DATABASE_URL, NEXTAUTH_SECRET, STRIPE_*, DEEPL_API_KEY, ...

# 3. Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

App on http://localhost:3000.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server with HMR |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run lint:ci` | ESLint with `--max-warnings=0` (CI quality gate) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest test suite once |
| `npm run test:watch` | Vitest watch mode |

## Translation subsystem

- **3-tier cache**: In-Memory LRU (1k) → Postgres `TranslationCache` → DeepL.
- **Protected terms + numerical placeholders** enforced on every path.
- **Opt-in DOM translator**: `GlobalTranslator` only translates subtrees that
  opt in via `<UGCText>` (which emits `data-translate="ugc"`). Everything
  else — chrome, buttons, labels — is served from the static i18n catalogue
  in `src/lib/i18n/messages/{de,en,fr}.ts`.
- **Sentence-level cache** for long posts (see `segmenter.ts`).
- **Local language detection** — DeepL is used strictly for translation.
- **Admin observability**: Cache Health by Tier + Top Uncached Phrases panels
  on the admin language settings page. Counters are process-local; aggregate
  usage lives in `TranslationUsage`.

See `src/lib/translation/` and `src/components/translation/` for the code.

## Security notes

- `/api/stripe/webhook` **fails closed** when `STRIPE_WEBHOOK_SECRET` is
  absent outside development.
- `/api/translate*` requires an authenticated session. Per-user rate limits
  apply (see `src/lib/api/rate-limit.ts`).
- `/api/translation-debug` returns 404 in production unless
  `ENABLE_TRANSLATION_DEBUG=true` and the caller is an admin.

## License

Proprietary — all rights reserved.
