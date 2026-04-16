import { ADMIN_EMAILS, SUPPORT_EMAIL } from "@/lib/constants";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const admins =
    ADMIN_EMAILS && ADMIN_EMAILS.length > 0
      ? ADMIN_EMAILS
      : [SUPPORT_EMAIL];

  return admins.includes(email);
}