// src/lib/dm.ts
// Shared helpers for Direct Messages (v1). Identity is email throughout — matching
// the rest of the app (getAuthedEmailOrNull, userEmail/creatorEmail columns).
//
// IMPORTANT: Prisma connects through the pooler with a role that BYPASSES RLS, so the
// RLS policy on realtime.messages only guards the realtime *subscription* path. Every
// server-side write MUST authorize in code using these guards before touching the DB.
import { prisma } from "@/lib/prisma";
// normalizeEmail lives in the pure (Prisma-free) email module so client components
// can import it without dragging Prisma into the client bundle. Imported here (so the
// helpers below can call it) and re-exported so existing server-side importers
// (proxy, age-verification, messages/*) are unaffected.
import { normalizeEmail } from "@/lib/email";
export { normalizeEmail };

/**
 * Master switch for Direct Messages. Default OFF — DMs stay dark until age
 * assurance is real. The only child-safety guard (assertNotMinor) is currently
 * inert because nothing ever sets profiles.isMinor = true, so a reachable,
 * unmoderated private surface cannot be live. Server-side only (reads process.env);
 * the value is passed to client components as a prop, never imported there.
 * Enabled only when DM_ENABLED is exactly "true".
 */
export function isDmEnabled(): boolean {
  return process.env.DM_ENABLED === "true";
}

/** Thrown when a minor would become party to a DIRECT conversation. */
export class MinorBlockedError extends Error {
  code = "DM_MINOR_BLOCKED" as const;
  constructor() {
    super("DMs are unavailable for this account.");
    this.name = "MinorBlockedError";
  }
}

/** Thrown when the current user is not a participant of the target conversation. */
export class NotParticipantError extends Error {
  code = "DM_NOT_PARTICIPANT" as const;
  constructor() {
    super("You are not a participant in this conversation.");
    this.name = "NotParticipantError";
  }
}

/**
 * Deterministic dedupe key for a 1:1 thread: the two emails, normalized, sorted,
 * joined with ':'. Emails never contain ':', so the key is unambiguous.
 */
export function directKeyFor(a: string, b: string): string {
  return [normalizeEmail(a), normalizeEmail(b)].sort().join(":");
}

/**
 * Source of truth for the minor block. Reads profiles.isMinor (default false). A user
 * with no profiles row is treated as a non-minor (default-adult until the age gate
 * populates it) — same semantics as the DB-level trigger's COALESCE.
 */
export async function isUserMinor(email: string): Promise<boolean> {
  const row = await prisma.profiles.findUnique({
    where: { email: normalizeEmail(email) },
    select: { isMinor: true },
  });
  return row?.isMinor ?? false;
}

/**
 * Reject if ANY of the given emails belongs to a minor. Symmetric rule: an under-18
 * can neither initiate nor receive, and an adult cannot DM one.
 */
export async function assertNotMinor(...emails: string[]): Promise<void> {
  const unique = [...new Set(emails.map(normalizeEmail))];
  const results = await Promise.all(unique.map(isUserMinor));
  if (results.some(Boolean)) throw new MinorBlockedError();
}

/**
 * Verify the email is a participant of the conversation; returns the participant row
 * (needed for lastReadAt). Throws NotParticipantError otherwise.
 */
export async function assertParticipant(conversationId: string, email: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userEmail: {
        conversationId,
        userEmail: normalizeEmail(email),
      },
    },
  });
  if (!participant) throw new NotParticipantError();
  return participant;
}
