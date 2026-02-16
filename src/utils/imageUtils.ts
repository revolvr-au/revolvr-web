// src/utils/imageUtils.ts
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
}
