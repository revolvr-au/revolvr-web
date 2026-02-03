// src/lib/prisma.ts
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function buildPgPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  /**
   * Supabase + Vercel: if you’re seeing
   * “self-signed certificate in certificate chain”
   * then you need to control TLS via `pg` here.
   *
   * IMPORTANT: This bypasses TLS chain verification.
   * Use it to get unblocked, then replace with proper CA validation later.
   */
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

const pool = global.__pgPool ?? buildPgPool();
const adapter = new PrismaPg(pool);

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
  global.__pgPool = pool;
}
