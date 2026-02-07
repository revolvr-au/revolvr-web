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
    <div className="flex-1 min-w-[92px] text-center">
      <div className="text-lg font-semibold text-white leading-none">{value}</div>
      <div className="mt-1 text-[11px] tracking-wide uppercase text-white/40">{label}</div>
    </div>
  );
}

function ActionButton({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : "bg-white/5 text-white/80 hover:bg-white/10";

  return (
    <button
      type="button"
      className={[
        "h-10 rounded-xl px-4",
        "text-sm font-semibold",
        "transition-all duration-150",
        "active:scale-[0.98]",
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
  params: { email: string };
}) {
  const email = decodeURIComponent(String(params?.email || "")).trim().toLowerCase();

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
      right={
        <Link
          href="/public-feed"
          className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 transition"
          aria-label="Back"
          title="Back"
        >
          ←
        </Link>
      }
      showMenu
      onMenuClick={() => {
        // tomorrow: open sheet/menu modal
        console.log("menu");
      }}
    >
      <div className="pb-20">
        {/* Hero */}
        <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            <div className="flex items-start gap-4 sm:block">
              <div className="relative">
                {isLive ? (
                  <span
                    className={[
                      "absolute -left-2 -top-2 z-20",
                      "inline-flex items-center gap-1",
                      "h-5 px-2 rounded-full",
                      "bg-red-500/90 text-white",
                      "text-[10px] font-bold tracking-wide",
                      "shadow ring-2 ring-black/30",
                      "backdrop-blur",
                    ].join(" ")}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                ) : null}

                {tick ? (
                  <span
                    className={[
                      "absolute -right-2 -top-2 z-20",
                      "inline-flex h-[18px] w-[18px] items-center justify-center rounded-full",
                      tick === "gold" ? "bg-amber-400" : "bg-blue-500",
                      "text-[10px] font-bold text-black",
                      "shadow ring-2 ring-black/30",
                    ].join(" ")}
                    aria-label={tick === "gold" ? "Gold tick" : "Blue tick"}
                    title={tick === "gold" ? "Gold tick" : "Blue tick"}
                  >
                    ✓
                  </span>
                ) : null}

                <div className="rv-avatar h-[92px] w-[92px] rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                  <span className="text-xl font-semibold text-white/70">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Mobile-only identity beside avatar */}
              <div className="sm:hidden flex-1 min-w-0">
                <div className="text-lg font-semibold text-white truncate">{displayName}</div>
                <div className="text-sm text-white/50 truncate">{handle}</div>
              </div>
            </div>

            {/* Desktop identity + bio */}
            <div className="flex-1 min-w-0">
              <div className="hidden sm:block">
                <div className="text-lg font-semibold text-white">{displayName}</div>
                <div className="text-sm text-white/50">{handle}</div>
              </div>

              <div className="mt-3 text-sm text-white/70 leading-relaxed">
                Profile bio goes here (REVOLVR-style). Keep it clean, premium, and high-signal.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton>Follow</ActionButton>
                <ActionButton variant="ghost">Message</ActionButton>
                <ActionButton variant="ghost">Subscribe</ActionButton>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Stat label="Posts" value="0" />
                <div className="w-px h-10 bg-white/10" />
                <Stat label="Followers" value="0" />
                <div className="w-px h-10 bg-white/10" />
                <Stat label="Following" value="0" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="grid grid-cols-3">
            <button className="px-3 py-3 text-sm font-semibold text-white bg-white/5 border-b border-white/10">
              Posts
            </button>
            <button className="px-3 py-3 text-sm font-semibold text-white/50 hover:bg-white/5 border-b border-white/10">
              Media
            </button>
            <button className="px-3 py-3 text-sm font-semibold text-white/50 hover:bg-white/5 border-b border-white/10">
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
