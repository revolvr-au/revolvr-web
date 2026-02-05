"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse = {
  result?: "ok";
  loggedIn?: boolean;
  user?: { email?: string | null };
};

function CardButton({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{desc}</div>
    </button>
  );
}

export default function CommandClient() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const r = await fetch("/api/creator/me", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as MeResponse | null;

        if (cancelled) return;

        if (!r.ok || !j?.loggedIn) {
          setNeedsAuth(true);
          return;
        }

        setEmail((j.user?.email ?? "").toLowerCase() || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && needsAuth) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <a href="/public-feed" className="text-sm text-white/70 hover:text-white">
            ← Back
          </a>
          <div className="text-sm text-white/60">Command</div>
          <div className="w-[92px]" />
        </div>

        <h1 className="mt-8 text-3xl font-semibold">Command</h1>
        <p className="mt-2 text-sm text-white/60">
          Log in to access your account controls and public profile.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">You’re not logged in.</div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/login?redirect=/command")}
              className="rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition"
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href="/feed" className="text-sm text-white/70 hover:text-white">
          ← Back to feed
        </a>
        <div className="text-sm text-white/60">Command</div>
        <div className="w-[92px]" />
      </div>

      <h1 className="mt-8 text-3xl font-semibold">Command</h1>
      <p className="mt-2 text-sm text-white/60">
        Account controls and public profile.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardButton
          title="Account"
          desc="Manage verification, avatar, and account settings."
          onClick={() => router.push("/me")}
        />

        <CardButton
          title="Public profile"
          desc="View how others see you."
          onClick={() => {
            if (!email) return;
            router.push(`/u/${encodeURIComponent(email)}`);
          }}
        />
      </div>

      {loading && <div className="mt-6 text-sm text-white/50">Loading…</div>}

      {!loading && !email && !needsAuth && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Could not resolve your email. Try signing out and back in.
        </div>
      )}
    </div>
  );
}
