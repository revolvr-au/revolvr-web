// src/app/u/[email]/page.tsx
import Link from "next/link";
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
    <div className="flex flex-col items-center min-w-[90px]">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-[11px] tracking-wide uppercase text-white/40">{label}</div>
    </div>
  );
}

function ActionButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
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
        "h-10 px-4 rounded-xl",
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
  params: Promise<{ email: string }>;
}) {
  const { email: raw } = await params;

  // IMPORTANT: param arrives URL-encoded (contains %40). Decode it.
  const email = decodeURIComponent(String(raw || "")).trim().toLowerCase();

  const displayName = displayNameFromEmail(email);
  const handle = handleFromEmail(email);

  // Scaffold-only: until we wire DB, we keep these as placeholders.
  const isLive = false;
  const tick: "blue" | "gold" | null = null;

  return (
    <FeedLayout title="Revolvr" subtitle="Profile">
      <div className="px-4 pb-16">
        {/* Header row: back + name + hamburger */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/public-feed"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 transition"
            aria-label="Back"
            title="Back"
          >
            ←
          </Link>

          <div className="flex-1 px-3">
            <div className="text-sm font-semibold text-white truncate">{displayName}</div>
            <div className="text-[12px] text-white/40 truncate">{handle}</div>
          </div>

          {/* Hamburger placement (data later) */}
          <button
            type="button"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 transition"
            aria-label="Menu"
            title="Menu"
          >
            ☰
          </button>
        </div>

        {/* Profile hero */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-start gap-4">
            {/* Premium avatar */}
            <div className="relative">
              {/* LIVE pill (future) */}
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

              {/* Tick (future) */}
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

            {/* Identity + bio */}
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">{displayName}</div>
              <div className="text-sm text-white/50">{handle}</div>

              <div className="mt-3 text-sm text-white/70 leading-relaxed">
                Profile bio goes here (REVOLVR-style). Keep it clean, premium, and high-signal.
              </div>

              <div className="mt-4 flex gap-2">
                <ActionButton>Follow</ActionButton>
                <ActionButton variant="ghost">Message</ActionButton>
                <ActionButton variant="ghost">Subscribe</ActionButton>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <Stat label="Posts" value="0" />
            <Stat label="Followers" value="0" />
            <Stat label="Following" value="0" />
          </div>
        </div>

        {/* Tabs / sections scaffold */}
        <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex">
            <button className="flex-1 px-3 py-3 text-sm font-semibold text-white border-b border-white/10 bg-white/5">
              Posts
            </button>
            <button className="flex-1 px-3 py-3 text-sm font-semibold text-white/50 border-b border-white/10 hover:bg-white/5">
              Media
            </button>
            <button className="flex-1 px-3 py-3 text-sm font-semibold text-white/50 border-b border-white/10 hover:bg-white/5">
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
