// src/lib/ageGate.ts

const KEY_AGE_OK = "revolvr_age_ok_v1";
const KEY_COUNTRY = "revolvr_country_v1";

export function isAgeOk(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY_AGE_OK) === "1";
  } catch {
    return false;
  }
}

export function setAgeOk() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_AGE_OK, "1");
  } catch {}
}

export function clearAgeOk() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_AGE_OK);
  } catch {}
}

export function getStoredCountry(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY_COUNTRY);
  } catch {
    return null;
  }
}

export function setStoredCountry(country: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_COUNTRY, country);
  } catch {}
}

export function guessCountryFromLocale(): string {
  if (typeof navigator === "undefined") return "US";

  const locale =
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    "en-US";

  const parts = locale.split("-");
  const region = (parts[1] || "").toUpperCase();

  const allowed = new Set([
    "US",
    "CA",
    "GB",
    "AU",
    "NZ",
    "IE",
    "SG",
    "DE",
    "FR",
    "ES",
    "IT",
    "NL",
    "SE",
    "NO",
    "DK",
    "CH",
  ]);

  return allowed.has(region) ? region : "US";
}
