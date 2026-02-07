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
    <div className="flex-1 min-w-[92px] text-center">
      <div className="text-lg font-semibold text-white leading-none">{value}</div>
      <div className="mt-1 text-[11px] tracking-wide uppercase text-white/40">
        {label}
      </div>
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
  // ✅ Next 16 can pass params as a Promise
  params: Promise<{ email?: string[] }>;
}) {
  const p = await params;

  // ✅ catch-all param will be string[]
  const raw = Array.isArray(p?.email) ? p.email.join("/") : "";
  const email = decodeURIComponent(raw).trim().toLowerCase();

  if (!email) {
    return (
      <FeedLayout title="Revolvr" subtitle="Profile">
        <div className="px-4 pb-16 pt-6 text-sm text-white/70">Profile not found.</div>
      </FeedLayout>
    );
  }

  const displayName = displayNameFromEmail(email);
  const handle = handleFromEmail(email);

  return (
    <FeedLayout
      title={displayName}
      subtitle={handle}
      showMenu
      onMenuClick={() => {}}
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
    >
      <div className="px-4 sm:px-6 pb-20">
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-start gap-4 sm:block">
              <div className="rv-avatar h-[92px] w-[92px] rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                <span className="text-xl font-semibold text-white/70">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              </div>

              <div className="sm:hidden flex-1 min-w-0">
                <div className="text-lg font-semibold text-white truncate">{displayName}</div>
                <div className="text-sm text-white/50 truncate">{handle}</div>
              </div>
            </div>

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
      </div>
    </FeedLayout>
  );
}
