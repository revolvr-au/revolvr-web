# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build            # Prisma generate + Next.js webpack build (4GB heap)
npm run build:ci         # CI build with strict linting (zero max-warnings)

# Linting
npm run lint             # ESLint across src/**
npm run lint:fix         # ESLint with auto-fix

# Database
npm run migrate:deploy   # Deploy pending Prisma migrations
npx prisma generate      # Regenerate Prisma client (also runs on postinstall)
npx prisma studio        # Open Prisma Studio GUI
```

Node 22 is required (see `.nvmrc`).

## Architecture

Revolvr is a creator-focused social platform with live streaming, monetization, and a public feed. It uses **Next.js App Router** (not Pages Router — the `src/pages/` directory is unused legacy), **Supabase** for auth and real-time, **Prisma + PostgreSQL** for the data layer, **Stripe** for payments, and **LiveKit** for video streaming.

### Request path

Browser → Next.js route (`src/app/`) → API route handler (`src/app/api/**/route.ts`) → Prisma (DB) or Supabase SDK (auth/storage/realtime).

Server components and API routes use `src/lib/supabaseServer.ts` (cookie-based SSR client). Client components use `src/lib/supabaseClients.ts` or `src/supabase-browser.ts`. Never use the server client in client components or vice versa.

### Key directories

| Path | Purpose |
|------|---------|
| `src/app/api/` | All API route handlers (`route.ts` files) |
| `src/app/` | App Router pages and layouts |
| `src/components/` | Shared React components |
| `src/lib/` | Server-side utilities (Prisma client, Supabase server client, auth helpers, credits, purchase logic) |
| `src/hooks/` | Client-side React hooks (auth, live session, purchase flow) |
| `src/services/` | Supabase realtime, user presence, orbit/social graph |
| `prisma/schema.prisma` | Database schema — single source of truth for all models |

### Authentication

Auth is email-only via Supabase magic links. The `useAuthedUser()` hook (`src/hooks/useAuthedUser.ts`) manages client auth state with a 400ms polling fallback for hydration. Server-side auth uses `@supabase/ssr` cookie helpers. OTP verification hits `/api/auth/verify-otp`.

### Monetization

Credits (boosts, tips, spins) flow through `src/lib/credits.ts`. Purchases go through `src/lib/purchase.ts` and the `usePurchase` hook. Stripe handles checkout sessions, subscriptions (blue/gold tick verification), and Creator Connect payouts. Stripe webhooks are at `/api/stripe/webhook/` and `/api/payments/webhook/`. The `SupportLedger` model tracks all monetization events (TIP, BOOST, SPIN, REACTION, VOTE).

### Live streaming

LiveKit powers video (`livekit-client` + `@livekit/components-react`). The `useGoLive` hook creates sessions; `liveSession` records in the DB track state. Live chat and polls are stored in `live_chat_messages` and `live_polls`/`live_votes`.

### Database patterns

- Prisma singleton is in `src/lib/prisma.ts` — always import from there.
- The schema has two overlapping creator profile models (`CreatorProfile` and `creator_profiles`/`creators`) — check which one a feature uses before writing queries.
- `SupportKind` enum: `TIP | BOOST | SPIN | REACTION | VOTE`. `SupportSource` enum: `FEED | LIVE`.
- **NEVER use `DATABASE_URL`, `DIRECT_URL`, or any production database URL as `--shadow-database-url` in any `prisma migrate diff` or `migrate dev` command. The shadow database must always be a separate throwaway database. Using a production URL as shadow will RESET AND WIPE the database.**

### Styling

Tailwind CSS v4 with a dark theme (`background: #050814`, `card: #070b1b`). Path alias `@/*` maps to `src/*`.

### Build notes

- TypeScript `ignoreBuildErrors: true` in `next.config.ts` — build does not fail on type errors.
- ESLint `no-explicit-any` is `warn`, not `error`.
- Production builds require `--webpack` flag (already in npm scripts).
