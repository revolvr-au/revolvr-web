// src/lib/jurisdiction.test.ts
//
// Unit tests for resolveJurisdiction. Scope is deliberately the seven cases that
// fully exercise the seven-line resolver: normal codes, normalization (case +
// whitespace), and the three fail-closed cases (absent / empty / whitespace-only
// header) that must resolve to the strictest rule, "AU", and never open the gate.

import { describe, it, expect } from "vitest";
import { resolveJurisdiction } from "./jurisdiction";

// Build a real Request, optionally with the Vercel edge country header set.
function requestWithCountry(country?: string): Request {
  const headers = new Headers();
  if (country !== undefined) headers.set("x-vercel-ip-country", country);
  return new Request("https://revolvr.example/api/age", { headers });
}

describe("resolveJurisdiction", () => {
  it('resolves header "AU" -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry("AU"))).toBe("AU");
  });

  it('resolves header "US" -> "US"', () => {
    expect(resolveJurisdiction(requestWithCountry("US"))).toBe("US");
  });

  it('uppercases lowercase "au" -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry("au"))).toBe("AU");
  });

  it('trims and uppercases " au " -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry(" au "))).toBe("AU");
  });

  // Fail-closed: absent header must never open the gate -> strictest rule "AU".
  it('fails closed when header is absent -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry())).toBe("AU");
  });

  // Fail-closed: empty header -> "AU".
  it('fails closed when header is empty "" -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry(""))).toBe("AU");
  });

  // Fail-closed: whitespace-only header -> "AU".
  it('fails closed when header is whitespace-only "   " -> "AU"', () => {
    expect(resolveJurisdiction(requestWithCountry("   "))).toBe("AU");
  });
});
