// Server-authoritative Sparks pricing.
//
// The client sends a tier id and nothing else. Price (cents) and spark count are
// resolved here, on the server, so a crafted request body can't buy an arbitrary
// number of sparks for an arbitrary price. Same reasoning as deriving the author
// email server-side in POST /api/posts rather than trusting the client.
//
// The webhook that credits the balance re-resolves the spark count from this same
// table, so the fulfilment amount never comes from request- or metadata-supplied
// integers either.

export type SparkTierId = "starter" | "charged" | "amplified" | "overloaded";

export type SparkTier = {
  id: SparkTierId;
  label: string;
  sparks: number;
  cents: number;
  /** Display only. The actual charge is always built from `cents`. */
  price: string;
};

export const SPARK_TIERS: readonly SparkTier[] = [
  { id: "starter",    label: "STARTER",    sparks: 100,  cents: 299,  price: "$2.99"  },
  { id: "charged",    label: "CHARGED",    sparks: 300,  cents: 799,  price: "$7.99"  },
  { id: "amplified",  label: "AMPLIFIED",  sparks: 750,  cents: 1799, price: "$17.99" },
  { id: "overloaded", label: "OVERLOADED", sparks: 2000, cents: 3999, price: "$39.99" },
];

/** Resolves an untrusted value to a known tier, or null. */
export function getSparkTier(id: unknown): SparkTier | null {
  if (typeof id !== "string") return null;
  return SPARK_TIERS.find((t) => t.id === id) ?? null;
}

export const SPARK_TIER_IDS: string = SPARK_TIERS.map((t) => t.id).join(", ");
