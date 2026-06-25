// src/lib/email.ts
// Pure, dependency-free email helpers. No Prisma, no server-only imports — safe to
// import from client components as well as server code. dm.ts re-exports normalizeEmail
// from here so there is a single source of truth for the normalization rule.

/** Trim + lowercase so identity comparisons and directKey are stable. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
