# REVOLVR Platform — Current State
Branch: snap-feed
Stack: Next.js 16.1.6, Supabase, Prisma, Vercel Pro

## What's Built
- Feed with Voltage ranking system
- Ring tier system (NONE/BLUE/GOLD/BUSINESS/CORPORATE/RED)
- Stripe checkout working (test mode)
- Mux video upload pipeline (working, playback broken)
- Glassmorphism comments panel (complete)
- SPARK tab with voltage grid
- PEOPLE tab
- TRANCHE tab (gated Gold+)
- Proxy auth (src/proxy.ts)
- TabShell keeps all tabs mounted

## Current Issue — PRIORITY
Mux video not playing in feed.
muxPlaybackId stored: BAL9UnwTw1swZOhMyOEXDZ8fMLnrsRS2wMEBnjOPYDs
Current URL tried: stream.mux.com/{id}/high.mp4 — FAILS
Fix: MP4 support not enabled on Mux assets by default
Need to either enable MP4 in Mux dashboard OR switch to HLS

## Key Files
- src/app/public-feed/PublicFeedClient.tsx — main feed
- src/components/CommentsPanel.tsx — glass comments
- src/components/CommentsList.tsx — comment cards
- src/app/api/video/upload/route.ts — Mux upload
- src/app/api/video/status/[uploadId]/route.ts — Mux polling
- src/app/api/public-feed/route.ts — feed API
- src/app/api/ring/checkout/route.ts — Stripe
- src/proxy.ts — Supabase session refresh (Next 16 proxy convention)
- prisma/schema.prisma — DB schema

## Env Vars in Vercel
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL (pgBouncer port 6543)
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- STRIPE_RING_BLUE/GOLD/BUSINESS/CORPORATE/RED_PRICE_ID
- MUX_TOKEN_ID, MUX_TOKEN_SECRET
- CLOUDFLARE_ACCOUNT_ID (keep, remove CLOUDFLARE_STREAM_TOKEN)

## Pending
1. Fix Mux video playback (URGENT)
2. Comments keyboard bloat on iOS (known iOS Safari issue)
3. Video compression before upload
4. Upstash Redis caching
5. LIVE reconnection
6. TRANCHE build
7. Messaging system
