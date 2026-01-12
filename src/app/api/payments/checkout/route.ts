// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack"
  | "reaction"
  | "vote";

type SupportSource = "FEED" | "LIVE";

type Body = {
  mode: CheckoutMode;

  // REQUIRED: creator attribution
  creatorEmail?: string | null;

  // viewer/payer email (optional)
  userEmail?: string | null;

  postId?: string | null; // legacy
  source?: SupportSource | string | null;
  targetId?: string | null;
  returnPath?: string | null;

  // cents chosen in modal (our internal "cents model")
  amountCents?: number | string | null;

  // client hint only (NOT trusted for pricing, packs still fixed)
  viewerCurrency?: string | null;
};

function toKind(mode: string) {
  const m = String(mode || "").trim().toUpperCase();
  if (m.endsWith("-PACK")) return m.replace("-PACK", "_PACK");
  if (m === "TIP" || m === "BOOST" || m === "SPIN" || m === "REACTION" || m === "VOTE") return m;
  if (m === "TIP-PACK" || m === "BOOST-PACK" || m === "SPIN-PACK") return m.replace("-PACK", "_PACK");
  return m.replace(/[^A-Z0-9_]/g, "_");
}

function toSource(src: unknown): SupportSource {
  const s = String(src ?? "FEED").toUpperCase();
  return s === "LIVE" ? "LIVE" : "FEED";
}

function parseAmountCents(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n);
  if (cents <= 0) return null;
  return cents;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// IMPORTANT: USD fallback (not AUD)
const ALLOWED_CURRENCIES = new Set(["usd", "gbp", "eur", "aud", "cad", "nzd"]);

function normalizeCurrency(cur: unknown): string {
  const c = String(cur ?? "usd").trim().toLowerCase();
  return ALLOWED_CURRENCIES.has(c) ? c : "usd";
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "jpy",
  "krw",
  "vnd",
  "clp",
  "pyg",
  "rwf",
  "ugx",
  "xaf",
  "xof",
  "xpf",
]);

function currencyMinorUnit(cur: string): 0 | 2 {
  return ZERO_DECIMAL_CURRENCIES.has(cur) ? 0 : 2;
}

/**
 * Convert our internal "cents model" to Stripe unit_amount:
 * - For 2-decimal currencies: unit_amount = amountCents
 * - For 0-decimal currencies: amountCents must be divisible by 100; unit_amount = amountCents/100
 *
 * Note: Our internal model always stores "cents-like" units (even for JPY we store *100).
 */
function toStripeUnitAmount(amountCents: number, currency: string): number | null {
  const mu = currencyMinorUnit(currency);
  if (mu === 2) return amountCents;

  if (amountCents % 100 !== 0) return null;
  return Math.round(amountCents / 100);
}

function modeDefaults(mode: CheckoutMode, currency: string) {
  const cur = normalizeCurrency(currency);

  // Unit prices in our "cents model"
  // NOTE: tune later; this is launch-safe.
  const tipUnit = cur === "usd" ? 150 : 200; // USD $1.50 else 2.00
  const boostUnit = 500; // 5.00
  const spinUnit = 100; // 1.00
  const reactionUnit = 100; // 1.00
  const voteUnit = 100; // 1.00

  // Pack quantities (Option A: no discounts)
  const TIP_PACK_QTY = 10;
  const BOOST_PACK_QTY = 10;
  const SPIN_PACK_QTY = 20;

  switch (mode) {
    case "tip":
      return { name: "Creator tip", defaultCents: tipUnit, min: 100, max: 200_000 };

    case "boost":
      return { name: "Post boost", defaultCents: boostUnit, min: 100, max: 200_000 };

    case "spin":
      return { name: "Revolvr spinner spin", defaultCents: spinUnit, min: 100, max: 200_000 };

    case "reaction":
      return { name: "Reaction", defaultCents: reactionUnit, min: 100, max: 200_000 };

    case "vote":
      return { name: "Vote", defaultCents: voteUnit, min: 100, max: 200_000 };

    case "tip-pack":
      return {
        name: `Tip pack (${TIP_PACK_QTY}× tips)`,
        defaultCents: tipUnit * TIP_PACK_QTY,
        min: tipUnit * TIP_PACK_QTY,
        max: tipUnit * TIP_PACK_QTY,
      };

    case "boost-pack":
      return {
        name: `Boost pack (${BOOST_PACK_QTY}× boosts)`,
        defaultCents: boostUnit * BOOST_PACK_QTY,
        min: boostUnit * BOOST_PACK_QTY,
        max: boostUnit * BOOST_PACK_QTY,
      };

    case "spin-pack":
      return {
        name: `Spin pack (${SPIN_PACK_QTY}× spins)`,
        defaultCents: spinUnit * SPIN_PACK_QTY,
        min: spinUnit * SPIN_PACK_QTY,
        max: spinUnit * SPIN_PACK_QTY,
      };

    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const mode = body.mode;
    if (!mode) return NextResponse.json({ error: "Missing mode" }, { status: 400 });

    const creatorEmail = String(body.creatorEmail ?? "").trim().toLowerCase();
    if (!creatorEmail) {
      return NextResponse.json({ error: "Missing creatorEmail" }, { status: 400 });
    }

    const userEmail =
      typeof body.userEmail === "string" ? body.userEmail.trim().toLowerCase() : null;

    const postId = body.postId ?? null;
    const source = toSource(body.source);
    const targetId = (body.targetId ?? postId ?? null) as string | null;

    // 1) Lookup creator to get payout currency (still useful as a fallback)
    const creator = await prisma.creatorProfile.findFirst({
      where: { email: { equals: creatorEmail, mode: "insensitive" } },
      select: { email: true, payoutCurrency: true },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found", creatorEmail }, { status: 404 });
    }

    // 2) Currency selection (viewer hint -> creator payout -> USD fallback)
    const currency = normalizeCurrency(body.viewerCurrency ?? creator.payoutCurrency ?? "usd");

    // 3) Pricing rules
    const def = modeDefaults(mode, currency);
    if (!def) return NextResponse.json({ error: "Unknown mode" }, { status: 400 });

    const isPack = String(mode).endsWith("-pack");

    const requested = parseAmountCents(body.amountCents);

    // Option A:
    // - packs ALWAYS use fixed computed price (N × unit), ignore request
    // - non-packs may use requested amount, clamped
    const amountCents = isPack
      ? def.defaultCents
      : clamp(requested ?? def.defaultCents, def.min, def.max);

    // 4) Convert to Stripe unit_amount (handles 0-decimal)
    const unitAmount = toStripeUnitAmount(amountCents, currency);
    if (unitAmount == null) {
      return NextResponse.json(
        { error: `Invalid amount for currency ${currency}` },
        { status: 400 }
      );
    }

    const safeReturnPath =
      body.returnPath && body.returnPath.startsWith("/") ? body.returnPath : "/public-feed";

    if (debug) {
      return NextResponse.json(
        {
          ok: true,
          commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          env: process.env.VERCEL_ENV ?? null,

          mode,
          creatorEmailInput: creatorEmail,
          creatorEmailDb: String(creator.email ?? "").toLowerCase(),
          payoutCurrencyRaw: creator.payoutCurrency ?? null,

          viewerCurrencyRaw: body.viewerCurrency ?? null,
          currency,
          minorUnit: currencyMinorUnit(currency),

          amountCents,
          unitAmount,
          isPack,
          safeReturnPath,
        },
        { status: 200 }
      );
    }

    const successParams = new URLSearchParams();
    successParams.set("success", "1");
    successParams.set("mode", mode);
    if (targetId) successParams.set("targetId", targetId);

    const cancelParams = new URLSearchParams();
    cancelParams.set("canceled", "1");
    cancelParams.set("mode", mode);
    if (targetId) cancelParams.set("targetId", targetId);

    const successUrl = new URL(SITE_URL);
    successUrl.pathname = safeReturnPath;
    successUrl.search = successParams.toString();

    const cancelUrl = new URL(SITE_URL);
    cancelUrl.pathname = safeReturnPath;
    cancelUrl.search = cancelParams.toString();

    const kind = toKind(mode);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name: def.name },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      metadata: {
        creator_id: creatorEmail,
        payment_type: kind,
        source,
        target_id: targetId ?? "",
        viewer_email: userEmail ?? "",
        amount_cents: String(amountCents),
        unit_amount: String(unitAmount),
        currency,
        mode,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
