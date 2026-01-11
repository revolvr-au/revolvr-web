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
  creatorEmail?: string | null;
  userEmail?: string | null;

  postId?: string | null; // legacy
  source?: SupportSource | string | null;
  targetId?: string | null;
  returnPath?: string | null;

  // cents chosen in modal
  amountCents?: number | string | null;

  // optional legacy/client override (ignored for safety)
  currency?: string | null;
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

const ALLOWED_CURRENCIES = new Set(["aud", "usd", "gbp", "eur", "cad", "nzd"]);

function normalizeCurrency(cur: unknown): string {
  const c = String(cur ?? "aud").trim().toLowerCase();
  return ALLOWED_CURRENCIES.has(c) ? c : "aud";
}
const ZERO_DECIMAL_CURRENCIES = new Set([
  "jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xaf", "xof", "xpf",
]);

function currencyMinorUnit(cur: string): 0 | 2 {
  return ZERO_DECIMAL_CURRENCIES.has(cur) ? 0 : 2;
}

/**
 * Convert "cents model" to Stripe's unit_amount:
 * - For 2-decimal currencies: cents 그대로
 * - For 0-decimal currencies: cents must be divisible by 100; unit_amount is cents/100
 */
function toStripeUnitAmount(amountCents: number, currency: string): number | null {
  const mu = currencyMinorUnit(currency);
  if (mu === 2) return amountCents;

  // 0-decimal: require whole units (cents divisible by 100)
  if (amountCents % 100 !== 0) return null;
  return Math.round(amountCents / 100);
}


function modeDefaults(mode: CheckoutMode, currency: string) {
  const cur = String(currency || "aud").trim().toLowerCase();

  switch (mode) {
    case "tip":
      return {
        name: "Creator tip",
        // USD default = $1.50, AUD default = $2.00
        defaultCents: cur === "usd" ? 150 : 200,
        min: 100,
        max: 200_000,
      };

    case "boost":
      return { name: "Post boost", defaultCents: 500, min: 100, max: 200_000 };

    case "spin":
      return { name: "Revolvr spinner spin", defaultCents: 100, min: 100, max: 200_000 };

    case "reaction":
      return { name: "Reaction", defaultCents: 100, min: 100, max: 200_000 };

    case "vote":
      return { name: "Vote", defaultCents: 100, min: 100, max: 200_000 };

    case "tip-pack":
      return { name: "Tip pack (10× tips)", defaultCents: 2000, min: 2000, max: 2000 };

    case "boost-pack":
      return { name: "Boost pack (10× boosts)", defaultCents: 5000, min: 5000, max: 5000 };

    case "spin-pack":
      return { name: "Spin pack (20× spins)", defaultCents: 2000, min: 2000, max: 2000 };
  }
}
export async function POST(req: NextRequest) {
  try {
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const mode = body.mode;
    if (!mode) return NextResponse.json({ error: "Missing mode" }, { status: 400 });

    // creatorEmail is the post author (primary) or legacy callers fallback
    const creatorEmail = String(body.creatorEmail ?? body.userEmail ?? "")
      .trim()
      .toLowerCase();

    if (!creatorEmail) {
      return NextResponse.json({ error: "Missing creatorEmail" }, { status: 400 });
    }

    // viewer email (optional)
    const userEmail =
      typeof body.userEmail === "string" ? body.userEmail.trim().toLowerCase() : null;

    const postId = body.postId ?? null;
    const source = toSource(body.source);
    const targetId = (body.targetId ?? postId ?? null) as string | null;

    // 1) Look up creator (case-insensitive) and get payout currency
    // 1) lookup creator
const creator = await prisma.creatorProfile.findFirst({
  where: { email: { equals: creatorEmail, mode: "insensitive" } },
  select: { email: true, payoutCurrency: true },
});

if (!creator) {
  return NextResponse.json({ error: "Creator not found", creatorEmail }, { status: 404 });
}

// 2) normalize currency
const currency = normalizeCurrency(creator.payoutCurrency ?? "aud");

// 3) NOW compute defaults
const def = modeDefaults(mode, currency);
if (!def) return NextResponse.json({ error: "Unknown mode" }, { status: 400 });

// 4) compute final amount
const isPack = String(mode).endsWith("-pack");
const requested = parseAmountCents(body.amountCents);

const amountCents = isPack
  ? def.defaultCents
  : clamp(requested ?? def.defaultCents, def.min, def.max);


    // 4) Convert internal "cents model" to Stripe unit_amount (handles 0-decimal)
    const unitAmount = toStripeUnitAmount(amountCents, currency);
    if (unitAmount == null) {
      return NextResponse.json(
        { error: `Invalid amount for currency ${currency}` },
        { status: 400 }
      );
    }

    const safeReturnPath =
      body.returnPath && body.returnPath.startsWith("/") ? body.returnPath : "/public-feed";

    // DEBUG: return computed values without creating a Stripe session
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
