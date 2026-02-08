// src/app/u/[...email]/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import FeedLayout from "@/components/FeedLayout";

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function handleFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, "").trim().toLowerCase();
  return cleaned ? `@${cleaned}` : "@creator";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[92px] flex-1 text-center">
      <div className="text-lg font-semibold leading-none text-white">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}

function ActionButton({
  children,
  variant = "primary",
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) {
  const cls =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : "bg-white/5 text-white/80 hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 rounded-xl px-4 text-sm font-semibold",
        "transition-all duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        cls,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: { email?: string | string[] } | Promise<{ email?: string | string[] }>;
}) {
  const p = await Promise.resolve(params);
  const emailParam = (p as any)?.email;

  const parts = Array.isArray(emailParam)
    ? emailParam
    : typeof emailParam === "string"
      ? [emailParam]
      : [];

  const raw = parts.join("/");
  const email = decodeURIComponent(raw || "").trim().toLowerCase();

  if (!email) {
    return (
      <FeedLayout title="Revolvr" subtitle="Profile">
        <div className="px-4 pb-16 pt-6 text-sm text-white/70">Profile not found.</div>
      </FeedLayout>
    );
  }

  const displayName = displayNameFromEmail(email);
  const handle = handleFromEmail(email);

  // Scaffold-only (wire DB later)
  const isLive = false;
  const tick: "blue" | "gold" | null = null;

  return (
    <FeedLayout
      title={displayName}
      subtitle={handle}
      showMenu
      right={
        <Link
          href="/public-feed"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10"
          aria-label="Back"
          title="Back"
        >
          ←
        </Link>
      }
    >
      <div className="px-4 pb-20 sm:px-6">
        {/* Hero */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex items-start gap-4 sm:block">
              <div className="relative">
                {isLive ? (
                  <span
                    className={[
                      "absolute -left-2 -top-2 z-20 inline-flex h-5 items-center gap-1 rounded-full",
                      "bg-red-500/90 px-2 text-[10px] font-bold tracking-wide text-white",
                      "shadow ring-2 ring-black/30 backdrop-blur",
                    ].join(" ")}
                  >
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                ) : null}

                {tick ? (
                  <span
                    className={[
                      "absolute -right-2 -top-2 z-20 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full",
                      tick === "gold" ? "bg-amber-400" : "bg-blue-500",
                      "text-[10px] font-bold text-black shadow ring-2 ring-black/30",
                    ].join(" ")}
                    aria-label={tick === "gold" ? "Gold tick" : "Blue tick"}
                    title={tick === "gold" ? "Gold tick" : "Blue tick"}
                  >
                    ✓
                  </span>
                ) : null}

                <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-white/5">
                  <span className="text-xl font-semibold text-white/70">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 sm:hidden">
                <div className="truncate text-lg font-semibold text-white">{displayName}</div>
                <div className="truncate text-sm text-white/50">{handle}</div>
              </div>
            </div>

            {/* Desktop identity + bio */}
            <div className="min-w-0 flex-1">
              <div className="hidden sm:block">
                <div className="text-lg font-semibold text-white">{displayName}</div>
                <div className="text-sm text-white/50">{handle}</div>
              </div>

              <div className="mt-3 text-sm leading-relaxed text-white/70">
                Profile bio goes here (REVOLVR-style). Keep it clean, premium, and high-signal.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="w-full sm:w-auto">
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <div className="col-span-2 sm:col-auto">
                      <div className="sm:hidden">
                        <button
                          type="button"
                          className="h-10 w-full rounded-xl bg-white text-sm font-semibold text-black transition-all duration-150 hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        >
                          Follow
                        </button>
                      </div>
                      <div className="hidden sm:block">
                        <ActionButton onClick={() => {}}>Follow</ActionButton>
                      </div>
                    </div>

                    <div className="col-span-1 sm:col-auto">
                      <button
                        type="button"
                        className="h-10 w-full rounded-xl bg-white/5 px-4 text-sm font-semibold text-white/80 transition-all duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:w-auto"
                      >
                        Message
                      </button>
                    </div>

                    <div className="col-span-1 sm:col-auto">
                      <button
                        type="button"
                        className="h-10 w-full rounded-xl bg-white/5 px-4 text-sm font-semibold text-white/80 transition-all duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:w-auto"
                      >
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Stat label="Posts" value="0" />
                <div className="h-10 w-px bg-white/10" />
                <Stat label="Followers" value="0" />
                <div className="h-10 w-px bg-white/10" />
                <Stat label="Following" value="0" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-3">
            <button
              type="button"
              className="border-b border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white"
              aria-selected="true"
            >
              Posts
            </button>
            <button
              type="button"
              className="border-b border-white/10 px-3 py-3 text-sm font-semibold text-white/50 hover:bg-white/5"
              aria-selected="false"
            >
              Media
            </button>
            <button
              type="button"
              className="border-b border-white/10 px-3 py-3 text-sm font-semibold text-white/50 hover:bg-white/5"
              aria-selected="false"
            >
              About
            </button>
          </div>

          <div className="p-4">
            <div className="text-sm text-white/60">No posts yet.</div>
            <div className="mt-2 text-[12px] text-white/40">
              Next: wire posts grid + creator data + friends/followers/following/likes/comments.
            </div>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
