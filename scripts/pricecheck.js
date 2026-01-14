const Stripe = require("stripe");

if (!process.env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!process.env.STRIPE_BLUE_TICK_PRICE_ID) throw new Error("Missing STRIPE_BLUE_TICK_PRICE_ID");
if (!process.env.STRIPE_GOLD_TICK_PRICE_ID) throw new Error("Missing STRIPE_GOLD_TICK_PRICE_ID");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  const ids = [
    ["blue", process.env.STRIPE_BLUE_TICK_PRICE_ID],
    ["gold", process.env.STRIPE_GOLD_TICK_PRICE_ID],
  ];

  for (const [tier, id] of ids) {
    const p = await stripe.prices.retrieve(id);
    console.log(tier, {
      id: p.id,
      active: p.active,
      unit_amount: p.unit_amount,
      currency: p.currency,
      interval: p.recurring?.interval,
      product: p.product,
    });
  }
})();
