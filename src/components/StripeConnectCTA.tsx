"use client";

import { useEffect, useState } from "react";

type Status = {
  ok: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingStatus?: string | null;
};

async function getAccessToken(): Promise<string | null> {
  // Assumes you have a cookie-based session and an endpoint that can reflect auth state.
  // If not logged in, it will fail closed.
  const res = await fetch("/api/creator/me", { cache: "no-store" });
  const data = await res.json().catch(() => null);

  // We support a couple of shapes to be resilient:
  // - { access_token: "..." }
  // - { session: { access_token: "..." } }
  // - { loggedIn: true, access_token: "..." }
  const token =
    data?.access_token ||
    data?.session?.access_token ||
    data?.creator?.session?.access_token ||
    null;

  return token ? String(token) : null;
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

export default function StripeConnectCTA() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setMsg(null);
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

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Stripe payouts</div>
          <div className="text-[11px] text-white/60">
            {status
              ? complete
                ? "Connected (charges + payouts enabled)"
                : connected
                  ? "Connected (onboarding incomplete)"
                  : "Not connected"
              : "Not connected"}
          </div>
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
            onClick={startOnboarding}
            className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-black hover:bg-white"
            disabled={loading}
          >
            {complete ? "Manage" : connected ? "Continue setup" : "Connect Stripe"}
          </button>
        </div>
      </div>

      {msg ? <div className="mt-2 text-[11px] text-red-400">{msg}</div> : null}
    </div>
  );
}
