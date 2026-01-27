"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/supabase-browser";

const supabase = createSupabaseBrowserClient();

type CreatorMeResponse = {
  loggedIn?: boolean;
  user?: { email?: string | null };
  creator?: {
    email?: string;
    handle?: string | null;
    displayName?: string | null;
    verificationTier?: "blue" | "gold" | null;
    verificationStatus?: "blue" | "gold" | null;
    stripeConnectAccountId?: string | null;
    stripeConnectChargesEnabled?: boolean | null;
    stripeConnectPayoutsEnabled?: boolean | null;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
  isCreator?: boolean;
};

type ConnectStatus = {
  connected?: boolean;
  accountId?: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  error?: string;
};

function clsx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function badgeForTier(tier: "blue" | "gold" | null | undefined) {
  if (tier === "gold")
    return {
      label: "GOLD",
      className: "bg-yellow-400/20 text-yellow-200 border-yellow-300/20",
    };
  if (tier === "blue")
    return {
      label: "BLUE",
      className: "bg-blue-400/20 text-blue-200 border-blue-300/20",
    };
  return {
    label: "NONE",
    className: "bg-white/10 text-white/70 border-white/10",
  };
}

function safeKeyFromEmail(email: string) {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function MeClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [me, setMe] = useState<CreatorMeResponse | null>(null);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);

  // editable fields
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const email = (me?.user?.email || "").toLowerCase();
  const isCreator = Boolean(me?.creator || me?.isCreator);

  const tier = useMemo(() => {
    const t =
      me?.creator?.verificationTier || me?.creator?.verificationStatus || null;
    return t === "gold" || t === "blue" ? t : null;
  }, [me]);

  const tierBadge = useMemo(() => badgeForTier(tier), [tier]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setNotice(null);
      setLoading(true);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          router.replace("/login");
          return;
        }

        // 1) Base identity
        const meRes = await fetch("/api/creator/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const meJson = await meRes.json().catch(() => null);

        if (cancelled) return;

        if (!meRes.ok || !meJson?.loggedIn) {
          router.replace("/login");
          return;
        }

        setMe(meJson);

        // seed fields
        const c = meJson?.creator || null;
        setDisplayName(c?.displayName || "");
        setHandle(c?.handle || "");
        setAvatarUrl((c as any)?.avatarUrl || (c as any)?.imageUrl || "");
        setBio((c as any)?.bio || "");

        // 2) Stripe connect status (creator-only)
        if (meJson?.creator) {
          const st = await fetch("/api/stripe/connect/status", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const stJson = await st.json().catch(() => null);
          if (!cancelled) {
            if (st.ok) setConnect(stJson);
            else
              setConnect({
                error: stJson?.error || "Could not load payouts status.",
              });
          }
        } else {
          setConnect(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function uploadAvatarToStorage(file: File) {
    if (!email) throw new Error("Not signed in");

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `avatars/${safeKeyFromEmail(email)}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(key, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from("avatars").getPublicUrl(key);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Could not resolve avatar URL");

    return publicUrl;
  }

  async function startVerificationCheckout(t: "blue" | "gold") {
    setError(null);
    setNotice(null);

    if (!email) {
      setError("Missing email.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/payments/verification/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: t, creatorEmail: email }),
      });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          setError(payload?.error || "Could not start verification checkout.");
          return;
        }

        const url: string | null = payload?.url || null;
        if (!url) {
          setError("Missing checkout URL.");
          return;
        }

        window.location.assign(url);

  } catch (e: any) {
    setError(e?.message || "Could not start verification checkout.");
  } finally {
    setSaving(false);
  }
}




  async function openVerificationPortal() {
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/payments/verification/portal", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });

      const payload = await res.json().catch(() => null);
      const url: string | null = payload?.url || null;

      if (!res.ok || !url) {
        setError(payload?.error || "Could not open verification portal.");
        return;
      }

      window.location.assign(url);
    } catch (e: any) {
      setError(e?.message || "Could not open verification portal.");
    } finally {
      setSaving(false);
    }
  }

  async function connectStripe() {
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/stripe/connect/link", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });

      

      setNotice("Stripe connect HTTP: " + res.status);
const payload = await res.json().catch(() => null);

      // Terms not accepted → send them to terms page and come back to /me
      if (res.status === 403) {
        router.push("/creator/terms?next=" + encodeURIComponent("/me"));
        return;
      }

      const url: string | null = payload?.url || null;

      if (!res.ok || !url) {
        setError(payload?.error || "Could not start Stripe onboarding.");
        return;
      }

      window.location.assign(url);
    } catch (e: any) {
      setError(e?.message || "Could not start Stripe onboarding.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCreatorProfile() {
    setError(null);
    setNotice(null);

    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/creator/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: handle.trim(),
          avatarUrl: avatarUrl.trim(),
          bio: bio.trim(),
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.error || "Save failed.");
        return;
      }

      setNotice("Saved.");
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }
  const statItems = [
    { label: "Tips received", value: "—" },
    { label: "Tips sent", value: "—" },
    { label: "Boosts used", value: "—" },
    { label: "Spins used", value: "—" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a href="/feed" className="text-sm text-white/70 hover:text-white">
          ← Back to feed
        </a>
        <div className="text-sm text-white/60">Account</div>
        <div className="w-[92px]" />
      </div>

      <h1 className="mt-8 text-3xl font-semibold">Personal profile</h1>
      <p className="mt-2 text-sm text-white/60">
        Manage your public identity, verification, and account settings.
      </p>

      {/* Alerts */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="mt-8 space-y-4">
          <div className="h-24 rounded-2xl bg-white/5 border border-white/10" />
          <div className="h-40 rounded-2xl bg-white/5 border border-white/10" />
          <div className="h-56 rounded-2xl bg-white/5 border border-white/10" />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* 1) Account Summary */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Account summary</div>
            <div className="mt-4 flex items-start gap-4">
              {/* square avatar box (click to upload) */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className={clsx(
                  "h-16 w-16 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center",
                  avatarUploading ? "opacity-70" : "hover:bg-white/15"
                )}
                title="Upload avatar"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-white/60">
                    {(displayName?.[0] || email?.[0] || "U").toUpperCase()}
                  </span>
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;

                  setError(null);
                  setNotice(null);
                  setAvatarUploading(true);

                  try {
                    const url = await uploadAvatarToStorage(f);
                    setAvatarUrl(url); // show immediately
                    setNotice("Avatar uploaded. Hit “Save changes” to publish.");
                  } catch (err: any) {
                    setError(err?.message || "Avatar upload failed.");
                  } finally {
                    setAvatarUploading(false);
                    e.currentTarget.value = "";
                  }
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold truncate">
                    {displayName || email.split("@")[0] || "User"}
                  </div>

                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                      tierBadge.className
                    )}
                    title="Verification tier"
                  >
                    ✓ {tierBadge.label}
                  </span>

                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {isCreator ? "Creator" : "User"}
                  </span>
                </div>

                <div className="mt-1 text-sm text-white/60 truncate">
                  {email}
                </div>
              </div>
            </div>
          </section>

          {/* 2) Verification */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Verification</div>
            <div className="mt-1 text-xs text-white/60">
              Blue = Verified Individual. Gold = Verified Business.
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => startVerificationCheckout("blue")}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
              >
                Buy Blue
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => startVerificationCheckout("gold")}
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
              >
                Buy Gold
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={openVerificationPortal}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
              >
                Manage
              </button>
            </div>

            <div className="mt-3 text-xs text-white/50">
              You’ll be redirected to Stripe.
            </div>
          </section>

          {/* 3) Public Profile Controls (NO URL FIELD) */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Public profile</div>
            <div className="mt-1 text-xs text-white/60">
              These details appear on your public profile.
            </div>

            {!isCreator ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-sm text-white/80">
                  Public profile editing is currently enabled for creators.
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => router.push("/creator/onboard")}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Become a Creator
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70">
                      Display name
                    </label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/70">
                      Handle
                    </label>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="handle"
                      className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short description…"
                    rows={4}
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveCreatorProfile}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>

                  <a
                    href={`/u/${encodeURIComponent(email)}`}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    View public profile
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* 4) Account Type */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Account type</div>

            {!isCreator ? (
              <div className="mt-4">
                <div className="text-sm text-white/80">Standard user</div>
                <div className="mt-1 text-xs text-white/60">
                  Become a creator to unlock payouts and creator tools.
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => router.push("/creator/onboard")}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Become a Creator
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="text-sm text-white/80">Creator</div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-xs font-semibold text-white/70">
                    Payouts
                  </div>
                  <div className="mt-2 text-sm text-white/85">
                    {connect?.error
                      ? connect.error
                      : connect?.connected
                      ? `Connected${
                          connect.chargesEnabled ? " · Charges enabled" : ""
                        }${connect.payoutsEnabled ? " · Payouts enabled" : ""}`
                      : "Not connected"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={connectStripe}
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
                    >
                      {connect?.connected ? "Update Stripe" : "Connect Stripe"}
                    </button>

                    <a
                      href="/creator/earnings"
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      View earnings
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 5) Activity Summary */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Activity summary</div>
            <div className="mt-1 text-xs text-white/60">
              Quick snapshot. Wiring to live counts is next.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statItems.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="text-[11px] text-white/60">{s.label}</div>
                  <div className="mt-1 text-lg font-semibold">{s.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 6) Safety & Preferences */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Safety & preferences</div>
            <div className="mt-1 text-xs text-white/60">
              This section will expand later. For now it’s informational.
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-sm text-white/80">Age verification</div>
              <div className="mt-1 text-xs text-white/60">
                Status is managed by platform policy.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
