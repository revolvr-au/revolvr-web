// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
  creatorEmail: string; // required for attribution
  userEmail?: string | null;
  postId?: string | null; // legacy
  source?: SupportSource | string | null;
  targetId?: string | null;
  returnPath?: string | null;

  // NEW: amount coming from modal (in cents)
  amountCents?: number | null;
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

  // Accept number or numeric string
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(v)
        : NaN;

  if (!Number.isFinite(n)) return null;

  // must be an integer number of cents
  const cents = Math.round(n);
  if (cents <= 0) return null;

  return cents;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Centralized defaults + limits
function modeDefaults(mode: CheckoutMode) {
  switch (mode) {
    case "tip":
      return { name: "Creator tip", defaultCents: 200, min: 100, max: 200_000 }; // A$1 .. A$2000
    case "boost":
      return { name: "Post boost", defaultCents: 500, min: 100, max: 200_000 };
    case "spin":
      return { name: "Revolvr spinner spin", defaultCents: 100, min: 100, max: 200_000 };
    case "reaction":
      return { name: "Reaction", defaultCents: 100, min: 100, max: 200_000 };
    case "vote":
      return { name: "Vote", defaultCents: 100, min: 100, max: 200_000 };

    // Packs remain fixed for now
    case "tip-pack":
      return { name: "Tip pack (10× A$2 tips)", defaultCents: 2000, min: 2000, max: 2000 };
    case "boost-pack":
      return { name: "Boost pack (10× A$5 boosts)", defaultCents: 5000, min: 5000, max: 5000 };
    case "spin-pack":
      return { name: "Spin pack (20× A$1 spins)", defaultCents: 2000, min: 2000, max: 2000 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const mode = body.mode;

    const creatorEmail = String(body.creatorEmail ?? body.userEmail ?? "")
      .trim()
      .toLowerCase();

    const userEmail =
      typeof body.userEmail === "string"
        ? body.userEmail.trim().toLowerCase()
        : null;

    const postId = body.postId ?? null;

    const source = toSource(body.source);
    const targetId = (body.targetId ?? postId ?? null) as string | null;

    if (!mode) return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    if (!creatorEmail) return NextResponse.json({ error: "Missing creatorEmail" }, { status: 400 });

    const def = modeDefaults(mode);
    if (!def) return NextResponse.json({ error: "Unknown mode" }, { status: 400 });

    // If the client supplied amountCents, use it (for non-pack modes),
    // but always clamp to sensible bounds and ensure integer cents.
    const requested = parseAmountCents((body as any).amountCents);
    const isPack = mode.endsWith("-pack");

    const amountCents = isPack
      ? def.defaultCents
      : clamp(requested ?? def.defaultCents, def.min, def.max);

    const safeReturnPath =
      body.returnPath && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/public-feed";

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
            currency: "aud",
            unit_amount: amountCents,
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

        // legacy
        creatorEmail,
        userEmail: userEmail ?? "",
        postId: postId ?? "",
        mode,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
