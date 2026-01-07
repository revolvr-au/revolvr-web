// src/pages/api/payments/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

type SupportSource = "FEED" | "LIVE";

type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack"
  | "reaction"
  | "vote";

type CheckoutBody = {
  // new-ish shape (preferred)
  mode?: CheckoutMode | string;
  creatorEmail?: string;
  userEmail?: string | null;
  source?: SupportSource;
  targetId?: string | null;
  postId?: string | null;
  returnPath?: string | null;

  // legacy shape (still accepted)
  amountCents?: number;
  kind?: string; // "post" | "live" | undefined
  bundleType?: string; // "single" | "pack" | undefined
};

type CheckoutResponse =
  | { url: string }
  | { error: string };

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("[payments/checkout] Missing STRIPE_SECRET_KEY env var");
}

// Do not force an apiVersion string that requires `any` casting.
// Let stripe-node default to its bundled latest API version.
const stripe = new Stripe(stripeSecretKey ?? "");

function toLowerEmail(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s ? s : null;
}

function safePath(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  // Only allow relative paths to avoid open redirects.
  if (!s.startsWith("/")) return fallback;
  return s;
}

function getOrigin(req: NextApiRequest): string {
  return (
    (req.headers.origin as string | undefined) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

function parseMode(raw: unknown): { base: "tip" | "boost" | "spin" | "reaction" | "vote"; isPack: boolean } | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!s) return null;

  const isPack = s.endsWith("-pack");
  const base = isPack ? s.replace(/-pack$/, "") : s;

  if (base === "tip" || base === "boost" || base === "spin" || base === "reaction" || base === "vote") {
    return { base, isPack };
  }

  return null;
}

function defaultAmountCentsFor(mode: { base: string; isPack: boolean }): number {
  // Sensible defaults (AUD):
  // single: tip=200, boost=500, spin=100, reaction=50, vote=50
  // pack:   tip-pack=2000, boost-pack=5000, spin-pack=2000
  if (mode.isPack) {
    if (mode.base === "tip") return 2000;
    if (mode.base === "boost") return 5000;
    if (mode.base === "spin") return 2000;
    // reaction/vote packs not supported: fall back to single defaults
  }

  if (mode.base === "tip") return 200;
  if (mode.base === "boost") return 500;
  if (mode.base === "spin") return 100;
  if (mode.base === "reaction") return 50;
  if (mode.base === "vote") return 50;

  return 200;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckoutResponse>) {
  console.log("[payments/checkout] hit", {
    method: req.method,
    url: req.url,
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    ua: req.headers["user-agent"],
    xfh: req.headers["x-forwarded-host"],
    xfp: req.headers["x-forwarded-proto"],
    xff: req.headers["x-forwarded-for"],
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as CheckoutBody;

    const modeParsed = parseMode(body.mode);
    if (!modeParsed) {
      return res.status(400).json({ error: "Missing or invalid mode in body" });
    }

    const userEmail = toLowerEmail(body.userEmail);
    if (!userEmail) {
      return res.status(400).json({ error: "Missing userEmail in body" });
    }

    // creatorEmail is required for ledger attribution in newer flows.
    // We accept it even if webhook/ledger is not wired yet.
    const creatorEmail = toLowerEmail(body.creatorEmail);

    const origin = getOrigin(req);

    // Source / target attribution:
    // Prefer new fields: source + targetId; fall back to legacy kind + postId.
    const source: SupportSource =
      body.source === "LIVE" || body.source === "FEED"
        ? body.source
        : body.kind === "live"
        ? "LIVE"
        : "FEED";

    const targetId =
      (typeof body.targetId === "string" && body.targetId.trim() ? body.targetId.trim() : null) ??
      (typeof body.postId === "string" && body.postId.trim() ? body.postId.trim() : null) ??
      null;

    // Amount:
    // - If amountCents provided, validate and trust it (packs typically send this).
    // - Otherwise, use defaults based on mode.
    const centsRaw = body.amountCents;
    const cents =
      typeof centsRaw === "number" && Number.isFinite(centsRaw) && centsRaw > 0
        ? Math.floor(centsRaw)
        : defaultAmountCentsFor(modeParsed);

    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ error: "Invalid amountCents – must be a positive number" });
    }

    const productName = (() => {
      const label = modeParsed.base;
      if (source === "LIVE") return `Revolvr live ${label}${modeParsed.isPack ? " pack" : ""}`;
      return `Post ${label}${modeParsed.isPack ? " pack" : ""}`;
    })();

    // Redirects:
    // Prefer explicit returnPath (new flow).
    // Fallback to legacy behavior for LIVE routes based on targetId.
    const returnPath = safePath(body.returnPath, "/public-feed");

    const successUrl = `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}success=1`;
    const cancelUrl = `${origin}${returnPath}`;

    const paymentType = modeParsed.isPack ? `${modeParsed.base.toUpperCase()}_PACK` : modeParsed.base.toUpperCase();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: cents,
            product_data: { name: productName },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        // canonical (for webhook/ledger)
        payment_type: paymentType,
        source,
        target_id: targetId ?? "",
        viewer_email: userEmail,
        creator_email: creatorEmail ?? "",

        // legacy/back-compat
        userEmail,
        postId: targetId ?? "",
        paymentKind: source === "LIVE" ? "live" : "post",
        mode: String(body.mode ?? ""),
        bundleType: modeParsed.isPack ? "pack" : "single",
        rawAmountCents: String(cents),
      },
    });

    const url = typeof session.url === "string" && session.url.length > 0 ? session.url : "";
    if (!url) {
      return res.status(500).json({ error: "Stripe did not return a checkout URL." });
    }

    return res.status(200).json({ url });
  } catch (err: unknown) {
    console.error("[payments/checkout] Error creating Stripe session:", err);
    return res.status(500).json({ error: "Unable to create checkout session" });
  }
}
