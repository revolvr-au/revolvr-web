import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Upsert a query param on the connection string: replace it if present, else append.
// We normalize pool tuning here — not in the env URL — so the live Vercel value is
// overridden in ONE place. The production DATABASE_URL ships ?pgbouncer=true&
// connection_limit=1, and =1 starves any request that fans out (e.g. people-rail's
// Promise.all of ~3 queries) on a single warm serverless slot → pool-timeout errors.
function withParam(url: string, key: string, value: string): string {
  const re = new RegExp(`([?&]${key}=)[^&]*`);
  if (re.test(url)) return url.replace(re, `$1${value}`);
  return url + (url.includes("?") ? "&" : "?") + `${key}=${value}`;
}

const baseUrl = process.env.DATABASE_URL ?? "";
// connection_limit=5: Supabase Large transaction pooler (port 6543) multiplexes many
// client conns onto few server conns, so ~5 per instance covers the largest in-request
// fan-out with headroom. At launch's low-hundreds concurrency, instances × 5 stays well
// under the Large pooler's client ceiling.
const pooledUrl = withParam(
  withParam(baseUrl, "connection_limit", "5"),
  "pool_timeout",
  "30",
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledUrl } },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
