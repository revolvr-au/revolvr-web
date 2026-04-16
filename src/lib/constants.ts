export const SUPPORT_EMAIL = "revolvrassist@gmail.com";

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || SUPPORT_EMAIL)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export const RESERVED_HANDLES = new Set([
  "admin",
  "support",
  "revolvr",
  "staff",
  "payments",
  "security",
  "moderator",
]);
