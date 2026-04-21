/**
 * One-time Stripe product + price setup for Ring Verification tiers.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs
 *
 * Prints the price IDs to add to Vercel env vars:
 *   STRIPE_RING_BLUE_PRICE_ID
 *   STRIPE_RING_GOLD_PRICE_ID
 *   STRIPE_RING_BUSINESS_PRICE_ID
 *   STRIPE_RING_CORPORATE_PRICE_ID
 *   STRIPE_RING_RED_PRICE_ID
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Error: STRIPE_SECRET_KEY is not set.");
  console.error("Run as: STRIPE_SECRET_KEY=sk_... node scripts/stripe-setup.mjs");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" });

const TIERS = [
  {
    envKey: "STRIPE_RING_BLUE_PRICE_ID",
    name: "Revolvr Blue Ring",
    description: "Blue Ring verification — voice bio, People tab, creator presence",
    tier: "BLUE",
    amountCents: 1299,
    currency: "aud",
  },
  {
    envKey: "STRIPE_RING_GOLD_PRICE_ID",
    name: "Revolvr Gold Ring",
    description: "Gold Ring — Tranche access, LIVE battles, Analytics, Voltage multiplier",
    tier: "GOLD",
    amountCents: 2999,
    currency: "aud",
  },
  {
    envKey: "STRIPE_RING_BUSINESS_PRICE_ID",
    name: "Revolvr Business Ring",
    description: "Business Ring — Business features + all Gold perks",
    tier: "BUSINESS",
    amountCents: 7999,
    currency: "aud",
  },
  {
    envKey: "STRIPE_RING_CORPORATE_PRICE_ID",
    name: "Revolvr Corporate Ring",
    description: "Corporate Ring — Full platform access, priority support",
    tier: "CORPORATE",
    amountCents: 49900,
    currency: "aud",
  },
  {
    envKey: "STRIPE_RING_RED_PRICE_ID",
    name: "Revolvr Red Ring",
    description: "Red Ring — Invite-only exclusive tier",
    tier: "RED",
    amountCents: 14900,
    currency: "aud",
  },
];

async function findExistingPrice(productName, amountCents, currency) {
  const products = await stripe.products.search({
    query: `name:"${productName}" AND active:"true"`,
    limit: 1,
  });

  const product = products.data[0];
  if (!product) return null;

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });

  const existing = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.unit_amount === amountCents &&
      p.currency === currency
  );

  return existing ? { product, price: existing } : null;
}

console.log(`\nRevolvr Ring Stripe Setup`);
console.log(`Mode: ${key.startsWith("sk_live") ? "LIVE" : "TEST"}`);
console.log("─".repeat(50));

const results = [];

for (const tier of TIERS) {
  process.stdout.write(`\n${tier.name} ($${(tier.amountCents / 100).toFixed(2)}/mo)... `);

  // Check if already exists
  const existing = await findExistingPrice(tier.name, tier.amountCents, tier.currency);

  let productId, priceId;

  if (existing) {
    productId = existing.product.id;
    priceId = existing.price.id;
    console.log(`already exists`);
  } else {
    const product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: { tier: tier.tier, platform: "revolvr" },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amountCents,
      currency: tier.currency,
      recurring: { interval: "month" },
      metadata: { tier: tier.tier },
    });

    productId = product.id;
    priceId = price.id;
    console.log(`created`);
  }

  results.push({ ...tier, productId, priceId });
}

console.log("\n" + "─".repeat(50));
console.log("Add these to Vercel environment variables:\n");

for (const r of results) {
  console.log(`${r.envKey}=${r.priceId}`);
}

console.log("\nProduct IDs (for reference):");
for (const r of results) {
  console.log(`  ${r.tier}: ${r.productId} → ${r.priceId}`);
}

console.log(
  "\nAlso add to Vercel:\n  STRIPE_RING_WEBHOOK_SECRET=whsec_...  (from Stripe Dashboard → Webhooks → /api/ring/webhook)"
);
