// lib/ageGate.ts
export function shouldApplyAuAgeGate(opts: { country?: string | null; ipCountry?: string | null }) {
  if (process.env.ENABLE_AU_AGE_GATE !== 'true') return false;

  if (opts.country === 'AU') return true;
  if (!opts.country && opts.ipCountry === 'AU') return true;

  return false;
}
