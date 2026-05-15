import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const baseUrl = process.env.DATABASE_URL ?? "";
const pooledUrl = /pool_timeout=\d+/.test(baseUrl)
  ? baseUrl.replace(/pool_timeout=\d+/, "pool_timeout=30")
  : baseUrl + (baseUrl.includes("?") ? "&" : "?") + "pool_timeout=30";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledUrl } },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
