"use client";

// src/lib/revolve/useRevolveConfig.ts
//
// Resolves the live RevolveConfig on the client. In PRODUCTION the server flag is the only
// switch — dev overrides are ignored, so a missing/false REVOLVE_ENABLED means the feature
// is fully dark. In DEVELOPMENT, URL params provide the runtime toggle required by Phase 1:
//
//   /public-feed?revolve=1&n=2&chambers=6&testmode=1
//
// URL params write through to localStorage so a plain refresh keeps the dev session's
// settings. This is the "dev-only way to toggle and set N at runtime."

import { useEffect, useState } from "react";
import { REVOLVE_DEFAULTS, normalizeConfig, type RevolveConfig } from "./config";

const STORAGE_KEY = "revolve.devConfig";

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function parseBool(v: string | null): boolean | undefined {
  if (v == null) return undefined;
  const s = v.toLowerCase();
  if (["1", "true", "on", "yes"].includes(s)) return true;
  if (["0", "false", "off", "no"].includes(s)) return false;
  return undefined;
}

function parseNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Read persisted + URL dev overrides and persist any URL-supplied values. Dev only. */
function readDevOverrides(): Partial<RevolveConfig> {
  if (typeof window === "undefined") return {};

  let stored: Partial<RevolveConfig> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<RevolveConfig>;
  } catch {
    stored = {};
  }

  const params = new URLSearchParams(window.location.search);
  const fromUrl: Partial<RevolveConfig> = {};
  const enabled = parseBool(params.get("revolve"));
  if (enabled !== undefined) fromUrl.enabled = enabled;
  const cadenceN = parseNum(params.get("n"));
  if (cadenceN !== undefined) fromUrl.cadenceN = cadenceN;
  const chamberCount = parseNum(params.get("chambers"));
  if (chamberCount !== undefined) fromUrl.chamberCount = chamberCount;
  const testMode = parseBool(params.get("testmode"));
  if (testMode !== undefined) fromUrl.testMode = testMode;

  const merged = { ...stored, ...fromUrl };
  if (Object.keys(fromUrl).length > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore quota / disabled storage */
    }
  }
  return merged;
}

/**
 * Resolve the effective RevolveConfig. SSR and the first client render both use the
 * server-resolved value (so hydration matches); dev overrides are applied in an effect
 * after mount.
 */
export function useRevolveConfig(serverEnabled: boolean): RevolveConfig {
  const [config, setConfig] = useState<RevolveConfig>(() =>
    normalizeConfig({ ...REVOLVE_DEFAULTS, enabled: serverEnabled }),
  );

  useEffect(() => {
    if (!isDev()) {
      setConfig(normalizeConfig({ ...REVOLVE_DEFAULTS, enabled: serverEnabled }));
      return;
    }
    const overrides = readDevOverrides();
    setConfig(
      normalizeConfig({ ...REVOLVE_DEFAULTS, enabled: serverEnabled, ...overrides }),
    );
  }, [serverEnabled]);

  return config;
}
