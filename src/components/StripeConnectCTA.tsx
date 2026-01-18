"use client";

import { useEffect, useState } from "react";

async function getCreatorProfileId(): Promise<string | null> {
  const res = await fetch("/api/creator/me", { cache: "no-store" });
  const data = await res.json().catch(() => null);

  // Support multiple shapes:
  // - { creator: { id: "..." } }
  // - { creatorProfile: { id: "..." } }
  // - { creatorId: "..." }
  const id =
    data?.creator?.id ||
    data?.creatorProfile?.id ||
    data?.creatorId ||
    null;

  return id ? String(id) : null;
}

type Status = {
  ok: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingStatus?: string | null;
  stripeAccountId?: string | null;
};

type MeShape = {
  loggedIn?: boolean;
  accessToken?: string | null;
  user?: { email?: string | null } | null;
  creator?: { isActive?: boolean } | null;
};

async function getAccessToken(): Promise<string | null> {
  const res = await fetch("/api/creator/me", { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as MeShape | null;

  // Your /api/creator/me returns { loggedIn, accessToken, ... }
  const token = data?.accessToken ?? null;
  return token ? String(token) : null;
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Please sign in to connect Stripe.");

  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

export default function StripeConnectCTA() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function manageBilling() {
    setLoading(true);
    setMsg(null);
    try {
      const creatorProfileId = await getCreatorProfileId();
      if (!creatorProfileId) throw new Error("Missing creator profile id");

      const res = await authedFetch("/api/payments/verification/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorProfileId }),
      });

      const data = await res.json().catch(() => null);
      const url = data?.url;
      if (!url) throw new Error(data?.error || "Missing billing portal URL");

      window.location.href = url;
    } catch (e: any) {
      setMsg(e?.message || "Unable to open billing portal");
    } finally {
      setLoading(false);
    }
  }

  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  async function refresh() {
    setMsg(null);

    // First: detect signed-in state (and token availability)
    const token = await getAccessToken();
    setSignedIn(Boolean(token));

    if (!token) {
      setStatus(null);
      return;
    }

    try {
      const res = await authedFetch("/api/stripe/connect/status");
      const data = (await res.json().catch(() => null)) as Status | null;
      setStatus(data);
    } catch (e: any) {
      setStatus(null);
      setMsg(e?.message || "Unable to load Stripe status");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await authedFetch("/api/stripe/connect/link", { method: "POST" });
      const data = await res.json().catch(() => null);
      const url = data?.url;
      if (!url) throw new Error(data?.error || "Missing onboarding URL");
      window.location.href = url;
    } catch (e: any) {
      setMsg(e?.message || "Unable to start onboarding");
    } finally {
      setLoading(false);
    }
  }

  const connected = Boolean(status?.connected);
  const complete = Boolean(status?.chargesEnabled && status?.payoutsEnabled);

  const subtitle =
    signedIn === false
      ? "Sign in to connect Stripe payouts."
      : status
        ? complete
          ? "Connected (charges + payouts enabled)"
          : connected
            ? "Connected (onboarding incomplete)"
            : "Not connected"
        : signedIn
          ? "Loading status..."
          : "Sign in to connect Stripe payouts.";

  const primaryLabel =
    signedIn === false
      ? "Sign in required"
      : complete
        ? "Manage"
        : connected
          ? "Continue setup"
          : "Connect Stripe";

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Stripe payouts</div>
          <div className="text-[11px] text-white/60">{subtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={complete ? manageBilling : startOnboarding}
            className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-black hover:bg-white disabled:opacity-60"
            disabled={loading || signedIn === false}
            title={signedIn === false ? "Sign in first" : ""}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      {msg ? <div className="mt-2 text-[11px] text-red-400">{msg}</div> : null}
    </div>
  );
}
