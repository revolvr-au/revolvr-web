// src/utils/imageUtils.ts

export function displayNameFromEmail(email: string): string {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || "User";
}

export function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("/")
  );
}
