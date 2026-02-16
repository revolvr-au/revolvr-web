// src/lib/prisma.ts
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
   
  var __prisma: PrismaClient | undefined;
   
  var __pgPool: Pool | undefined;
}

function buildPgPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Don’t crash build-time evaluation (Next can execute modules during build).
    // Runtime routes that need DB should handle missing DB explicitly.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set");
    }
    return new Pool({ connectionString: "postgresql://invalid" });
  }

  return new Pool({
    connectionString,
    // Supabase pooler typically requires SSL
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
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
