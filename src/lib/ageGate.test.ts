// src/lib/ageGate.test.ts
//
// Unit tests for resolveAgeRouting. Scope is the seven cases that fully exercise
// the resolver: the three recognised statuses (CLEARED / EXCLUDED / PENDING) and
// the four fail-closed cases (null / undefined / empty / unknown) that must all
// resolve to NEEDS_VERIFICATION and never PROCEED.

import { describe, it, expect } from "vitest";
import { resolveAgeRouting } from "./ageGate";

describe("resolveAgeRouting", () => {
  it('resolves "CLEARED" -> "PROCEED"', () => {
    expect(resolveAgeRouting("CLEARED")).toBe("PROCEED");
  });

  it('resolves "EXCLUDED" -> "EXCLUDED"', () => {
    expect(resolveAgeRouting("EXCLUDED")).toBe("EXCLUDED");
  });

  it('resolves "PENDING" -> "NEEDS_VERIFICATION"', () => {
    expect(resolveAgeRouting("PENDING")).toBe("NEEDS_VERIFICATION");
  });

  // Fail-closed: absent status must never open the gate -> NEEDS_VERIFICATION.
  it('fails closed when status is null -> "NEEDS_VERIFICATION"', () => {
    expect(resolveAgeRouting(null)).toBe("NEEDS_VERIFICATION");
  });

  // Fail-closed: undefined status -> NEEDS_VERIFICATION.
  it('fails closed when status is undefined -> "NEEDS_VERIFICATION"', () => {
    expect(resolveAgeRouting(undefined)).toBe("NEEDS_VERIFICATION");
  });

  // Fail-closed: empty string -> NEEDS_VERIFICATION.
  it('fails closed when status is "" -> "NEEDS_VERIFICATION"', () => {
    expect(resolveAgeRouting("")).toBe("NEEDS_VERIFICATION");
  });

  // Fail-closed: unknown/unexpected value -> NEEDS_VERIFICATION.
  it('fails closed when status is "garbage" -> "NEEDS_VERIFICATION"', () => {
    expect(resolveAgeRouting("garbage")).toBe("NEEDS_VERIFICATION");
  });
});
