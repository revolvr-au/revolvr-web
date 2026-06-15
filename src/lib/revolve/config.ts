// src/lib/revolve/config.ts
//
// "The Revolve" — anti-scroll feel prototype. Config + master flag.
//
// SCOPE RULE (non-negotiable): the revolve exists ONLY on the discovery feed (ORIGINALS,
// i.e. /public-feed). Never on profiles, search, GATHs, DMs, TRANCHE, or any own-network
// surface. The "Clash" chamber is only a label here — it does NOT touch the TRANCHE
// surface. The flag boundary IS the context boundary.
//
// Off by default. N (cadence) is config, never a hardcoded constant in feature code.

export type RevolveConfig = {
  /** Master switch. Off by default; resolved server-side and passed to the client. */
  enabled: boolean;
  /** Completed flicks between revolves. Predictable cadence is deliberate (not randomised). */
  cadenceN: number;
  /** How many chambers fan out (4–6). Deeper is always one of them and always at bottom. */
  chamberCount: number;
  /** 50th-revolve ergonomics test: forces cadenceN = 2 for fast iteration. */
  testMode: boolean;
};

export const DEFAULT_CADENCE_N = 5;
export const DEFAULT_CHAMBER_COUNT = 6;
export const MIN_CHAMBER_COUNT = 4;
export const MAX_CHAMBER_COUNT = 6;
export const TEST_MODE_CADENCE_N = 2;

export const REVOLVE_DEFAULTS: RevolveConfig = {
  enabled: false,
  cadenceN: DEFAULT_CADENCE_N,
  chamberCount: DEFAULT_CHAMBER_COUNT,
  testMode: false,
};

export function clampChamberCount(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CHAMBER_COUNT;
  return Math.min(MAX_CHAMBER_COUNT, Math.max(MIN_CHAMBER_COUNT, Math.round(n)));
}

export function clampCadenceN(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CADENCE_N;
  return Math.max(1, Math.round(n));
}

/**
 * Normalise a raw/partial config into a valid RevolveConfig. testMode wins over cadenceN
 * (it pins N=2). Chamber count is clamped to the 4–6 layout range.
 */
export function normalizeConfig(raw: Partial<RevolveConfig>): RevolveConfig {
  const testMode = raw.testMode ?? REVOLVE_DEFAULTS.testMode;
  const cadenceN = testMode
    ? TEST_MODE_CADENCE_N
    : clampCadenceN(raw.cadenceN ?? REVOLVE_DEFAULTS.cadenceN);
  return {
    enabled: raw.enabled ?? REVOLVE_DEFAULTS.enabled,
    cadenceN,
    chamberCount: clampChamberCount(raw.chamberCount ?? REVOLVE_DEFAULTS.chamberCount),
    testMode,
  };
}

/**
 * Server-only master switch. Default OFF. Mirrors isDmEnabled() in src/lib/dm.ts: reads
 * process.env in a server component and is passed to the client as a prop — the dev-only
 * runtime overrides live in useRevolveConfig and apply on top of this value.
 * Enabled only when REVOLVE_ENABLED is exactly "true".
 */
export function isRevolveEnabled(): boolean {
  return process.env.REVOLVE_ENABLED === "true";
}
