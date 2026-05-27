import { prisma } from "@/lib/prisma";

export type StudioGuardResult =
  | { ok: true; role: "ADMIN" | "MODERATOR" | "SUPPORT" }
  | { ok: false; reason: "missing" | "inactive" | "forbidden" };

/**
 * Returns ok=true if `email` is an active StudioUser with role ADMIN or MODERATOR.
 * SUPPORT-only callers are rejected (write actions are gated to ADMIN/MOD).
 */
export async function requireStudioMod(
  email: string | null | undefined,
): Promise<StudioGuardResult> {
  if (!email) return { ok: false, reason: "missing" };
  const user = await prisma.studioUser.findUnique({
    where: { email: email.toLowerCase() },
    select: { role: true, isActive: true },
  });
  if (!user) return { ok: false, reason: "missing" };
  if (!user.isActive) return { ok: false, reason: "inactive" };
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, role: user.role };
}
