// src/lib/ageGate.ts
export const AGE_OK_KEY = "revolvr_age_ok";
export const COUNTRY_KEY = "revolvr_country";

export function getStoredCountry(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COUNTRY_KEY);
}

export function setStoredCountry(country: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COUNTRY_KEY, country);
}

export function isAgeOk(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AGE_OK_KEY) === "1";
}

export function setAgeOk() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AGE_OK_KEY, "1");
}

// Best-effort default from browser locale (NOT geo-IP).
export function guessCountryFromLocale(): string {
  if (typeof window === "undefined") return "US";
  const lang = window.navigator.language || "en-US";
  const parts = lang.split("-");
  const region = parts[1]?.toUpperCase();
  return region && region.length === 2 ? region : "US";
}
