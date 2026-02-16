// src/utils/imageUtils.ts

// If you still need this, ensure it's defined:
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
}

// Ensure other functions are present too:
export function displayNameFromEmail(email: string): string {
  return email.split('@')[0];
}

export function isValidEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
