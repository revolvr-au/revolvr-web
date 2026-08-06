# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **This file describes the running system, not the intended one. Where it disagrees with the code, the code is right — fix this file.**
> Every claim below was verified against the codebase on **2026-08-06**, at commit **`cccd9a5`**. Anything not yet built is labelled as such. The further you are from that commit, the more you should re-check before trusting a specific line.

## Commands

```bash
# Development
npm run dev              # next dev -p 3000 --webpack

# Build
npm run build            # prisma generate + next build --webpack (4GB heap via cross-env)
npm run build:ci         # currently IDENTICAL to `build` — it does not lint
npm run vercel-build     # prisma generate + next build --webpack (no heap flag)
npm start                # next start

# Linting
npm run lint             # ESLint over src/**/*.{js,jsx,ts,tsx}
npm run lint:fix         # same, with --fix
npm run lint:ci          # same, with --max-warnings=0  <- this is the strict one

# Tests
npm test                 # vitest run
npm run test:watch       # vitest

# Database
npm run migrate:deploy   # prisma migrate deploy
npx prisma generate      # also runs on postinstall
npx prisma studio        # Prisma Studio GUI
```

## Versions

- **Node 20** (`.nvmrc`).
- **Next.js**: `^16.0.7` declared, **16.1.6** installed. Next 16 matters — see Middleware below, and route `params` is a Promise that must be awaited.
- **Tailwind CSS v4** (`^4.1.17`, via `@tailwindcss/postcss`).

## Architecture

Revolvr is a creator-focused social platform with live streaming, monetization, and a public feed. **Next.js App Router only** — `src/pages/` no longer exists; the Pages Router is gone entirely, not merely unused. **Supabase** for auth/realtime/storage, **Prisma + PostgreSQL** for data, **Stripe** for payments, **AWS IVS** for live video, **Mux** for uploaded video playback.

### Request path

Browser → **`src/proxy.ts`** (middleware) → Next.js route (`src/app/`) → API route handler (`src/app/api/**/route.ts`) → Prisma (DB) or Supabase SDK (auth/storage/realtime).

### Key directories

| Path | Purpose |
|------|---------|
| `src/proxy.ts` | Middleware — session refresh, age gate, onboarding guard |
| `src/app/api/` | All API route handlers (`route.ts` files) |
| `src/app/` | App Router pages and layouts |
| `src/components/` | Shared React components |
| `src/lib/` | Server-side utilities (Prisma client, Supabase server client, auth helpers, purchase logic) |
| `src/hooks/` | Client-side React hooks |
| `prisma/schema.prisma` | Database schema — single source of truth for all models |

## Middleware — `src/proxy.ts`

**Next 16 renamed `middleware.ts` to `proxy.ts`. `src/proxy.ts` IS this repo's middleware** — it exports `async function proxy(request)` plus a `config.matcher`, and it is the only such file in the repo. (A completed Vercel build labels it `ƒ Proxy (Middleware)` in the route list, which is the quickest way to confirm it is active; a local `npm run build` cannot reach that stage without the Supabase service-role key in `.env`.)

**Never add a `middleware.ts` file** — it would conflict with or silently shadow `proxy.ts`, which is where enforcement lives. Searching only for `middleware.ts` and concluding "this repo has no middleware" is a mistake that has already been made once.

It handles, in order: a canonical-host redirect; the **age gate**, active only when `AGE_GATE_ENABLED === "true"` (dark by default), AU-only via the unspoofable `x-vercel-ip-country` edge header, fail-CLOSED on every failure mode (missing row, null status, thrown DB read → `/age-verification`); then the **onboarding guard** (`proxy.ts:189`), which is deliberately *not* behind the age flag and applies to every authenticated user.

Two gaps to design around — the proxy runs, but does not cover these:

1. **The onboarding guard requires `user` truthy**, so it skips entirely for anonymous visitors. `/creator/*` pages are reachable by an anonymous URL visit and **must check auth themselves**. Menu-level `isCreator ?` gating is cosmetic, not access control.
2. **The matcher excludes `api/`** (along with `_next/static`, `_next/image`, `favicon.ico`, and image extensions), so **no API route gets any proxy enforcement, ever**. Every authed endpoint must do its own check.

The onboarding guard mirrors the BOTH-fields rule (`display_name` + `handle`) in `src/app/page.tsx` — keep those two identical or they will disagree about who is onboarded.

## Authentication

Auth is **email-only** via Supabase magic links. OAuth (Google/Apple) is scaffolded but **commented out** in `src/app/welcome/WelcomeClient.tsx` — **not built**, pending developer accounts. OTP verification hits `/api/auth/verify-otp`.

- Server components and API routes: `src/lib/supabaseServer.ts` (cookie-based SSR client, 34 importers).
- Client components: `src/lib/supabaseClients.ts` (11 importers) or `src/supabase-browser.ts` (23 importers).
- **Never use the server client in client components or vice versa.**

`useAuthedUser()` lives at **`src/lib/useAuthedUser.ts`** (not `src/hooks/`). On finding no session it waits a single **400ms settle timeout** before accepting "logged out", to avoid false redirects right after a magic-link callback — it is not a polling loop.

## Monetization

`src/lib/purchase.ts` exports `startCheckout`, used by `src/app/credits/page.tsx` and `src/components/SpinButton.tsx`. Stripe handles checkout sessions, subscriptions (ring tiers) and Creator Connect payouts.

Webhooks: `/api/stripe/webhook/`, `/api/payments/webhook/`, `/api/webhooks/mux/`.

`SupportLedger` records monetization events (3 writers). The enums:

- `SupportKind`: `TIP | BOOST | SPIN | REACTION | GIFT | TRANCHE_SPONSOR`
- `SupportSource`: `FEED | LIVE`

**Creator payout rates** are in `src/lib/ringPayout.ts`: `NONE 0.18`, `BLUE 0.30`, `GOLD 0.50`, `BUSINESS 0.65`, `CORPORATE 0.65`. The `RingTier` enum also has `RED` and `GOVERNMENT`, which are absent from that map and so fall through to `DEFAULT_PAYOUT_RATE` (0.18).

`CreatorBalance` holds `totalEarnedCents` / `availableCents`; `/api/creator/me` is the authenticated way to read it. The `Payment` model exists but **nothing writes it** — there is no `payment.create` anywhere in `src/`, so any "payment history" feature needs a writer first.

## Video

Two separate pipelines. Do not assume one covers the other.

**Live broadcasting — AWS IVS.** Deps: `@aws-sdk/client-ivs`, `amazon-ivs-player`, `amazon-ivs-web-broadcast`, `hls.js`. `next.config.ts` declares `serverExternalPackages: ['@aws-sdk/client-ivs']`. `/go-live` POSTs to `/api/live/create-ivs`. DB state lives in `liveSession`; chat and polls in `live_chat_messages` and `live_polls`. There is **no votes model** in the schema.

`src/hooks/useGoLive.ts` is a **permission gate, not a session creator** — `canBroadcast()` checks `user_metadata.is_creator`. `useGoLive(onAllowed)` enforces it imperatively; `useCanGoLive()` exposes the same predicate for render-gating.

**Uploaded video playback — Mux.** `muxPlaybackId` on the schema, read by `/api/posts` and `/api/public-feed`; routes at `/api/video/upload`, `/api/video/status/[uploadId]`, `/api/webhooks/mux`.

**LiveKit is not the video stack.** `livekit-client` and `@livekit/components-react` are **not dependencies at all**. `livekit-server-sdk` and `@livekit/components-styles` remain in `package.json` but now have **zero consumers in `src/`** — the LiveKit code was deleted in the orphan sweep. They are uninstall candidates.

## Database patterns

- Prisma singleton is `src/lib/prisma.ts` — always import from there.
- Three overlapping creator models coexist: `CreatorProfile`, `creator_profiles`, and `creators`. Check which one a feature uses before writing queries.
- Next 16: route `params` is a Promise — `await` it in `src/app/api/**/[id]/route.ts` handlers.
- **NEVER use `DATABASE_URL`, `DIRECT_URL`, or any production database URL as `--shadow-database-url` in any `prisma migrate diff` or `migrate dev` command. The shadow database must always be a separate throwaway database. Using a production URL as shadow will RESET AND WIPE the database.**

## Styling

Tailwind CSS v4, dark theme. Background `#050814` (`globals.css`, `layout.tsx`); card surface `#070b1b`. Path alias `@/*` → `./src/*`.

`TabShell` (`src/components/TabShell.tsx`) is rendered by the root `layout.tsx` and keeps tab surfaces mounted. Because of that, `src/app/public-feed/page.tsx` is a deliberate **route stub** — its own comment warns that rendering `PublicFeedClient` there as well would double-mount the feed. Keep it a stub.

## Build notes

- TypeScript `ignoreBuildErrors: true` in `next.config.ts` — **the build does not fail on type errors**, and there is a standing backlog of latent ones. Delete `.tsbuildinfo` before counting errors or you will read a stale cache.
- ESLint `@typescript-eslint/no-explicit-any` is `warn`, not `error`.
- Builds require `--webpack` (already in every npm script).
- `next.config.ts` also sets a `no-store` `Cache-Control` header on everything except `_next/static` and `_next/image`, enables `asyncWebAssembly`, and allows Supabase-hosted images via `remotePatterns`.

## Known dead code (documented so it is not mistaken for architecture)

An orphan sweep is in progress, in batches. Re-verify zero-importer status at deletion time — this list goes stale fast.

**Already deleted.** Batch 1: `src/lib/credits.ts`, `src/hooks/usePurchase.ts`, `/api/live/create`, the whole LiveKit chain (`_legacy/LiveClient.tsx`, `LiveRoom.tsx`, `VideoCanvas.tsx`, `src/pages/_app.tsx`, `src/app/pages/lib/livekit.ts`, `src/styles/livekit-overrides.css`), two stray tracked files. Batch 2: the PeopleRail cluster and `src/screens/FeedScreen.tsx`, a set of unused UI helpers (`SafeImage`, `GiftAnimation`, `icons.ts`, `spinner.ts`, `imageUtils.ts`, `bottomBarConstants.ts`, `LayoutShell.tsx`), misc libs (`clientCredits.ts`, `env.ts`, `feed/buildFeedSnapshot.ts`, `supabase/middlewareClient.ts`), all of `src/services/`, and `src/app/creator/DashboardClient.tsx` (superseded by the live `/dashboard/page.tsx`).

Batch 3: `StripeConnectCTA.tsx`, `PaidReactionBar.tsx`, `FeedVideo.tsx`, `api/stripe/webhook/_verification.ts`, `media/MediaUploader.tsx`, `LiveStartOverlay.tsx`, `RevolvrDrawer.tsx`, `studio/UsersPanel.tsx`, `LiveCard.tsx`, `MenuSheet.tsx`, `hooks/useCreatorFeedback.ts`.

These directories no longer exist: `src/pages/`, `src/styles/`, `src/app/pages/`, `src/services/`, `src/utils/`, `src/screens/`, `src/hook/`, `src/components/peoplerail/`, `src/components/ui/`, `src/components/navigation/`, `src/components/media/`, `src/components/studio/`, `src/lib/feed/`.

**Blocked, not kept on merit.** Both of these are zero-importer *except* from `_legacy/LiveSupportBar.tsx` inside the held live cluster, so deleting them would leave dangling imports in held code. They go when that cluster is decided:

- `src/lib/actionsClient.ts`
- `src/components/PostActionModal.tsx` (377 lines — the largest single orphan left)

Note `_verification.ts` was dead despite the underscore-prefixed "private helper" convention suggesting the webhook used it. `verificationStatus` is still written, but by `blue-tick/route.ts` doing its own inline writes.

**Still zero-importer, deliberately kept:**

- `src/components/live/**` — the live-streaming component cluster (chat overlay, composer, comment rail, hearts, `_legacy/` bars and reaction layers). A real build, orphaned rather than accidental; held pending a decision on what returns. Batch 1 stranded three more of these (`live/TopBar.tsx`, `LiveChatOverlay.tsx`, `RevolvrComposer.tsx`) by removing `LiveRoom.tsx`, which was their only importer.
- `src/app/login/LoginClient.tsx` — 227 lines of OAuth, parked pending Apple/Google developer accounts. **Do not delete**; see the Authentication section.
- `src/hooks/useUnreadCount.ts` — DM unread poller. DMs are dark behind a flag and the feature lives on an unmerged branch. **Do not delete.**

Note `src/components/live/TopBar.tsx` is *not* the live `TopBar` — `src/components/FeedLayout.tsx` imports `src/components/TopBar.tsx`, a different file with the same basename. Duplicate basenames are the main way this cluster gets misread.
