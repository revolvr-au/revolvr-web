"use client";

import { useMemo, useState } from "react";
import PostActionModal, { type Preset } from "@/components/PostActionModal";
import { createCheckout } from "@/lib/actionsClient";

type Mode = "tip" | "boost" | "spin";

type RewardKind = "applause" | "fire" | "love" | "respect";

const LIVE_REWARDS: { id: RewardKind; label: string; asset: string }[] = [
  { id: "applause", label: "Applause", asset: "/rewards/applause.webm" },
  { id: "fire", label: "Fire", asset: "/rewards/fire.webm" },
  { id: "love", label: "Love", asset: "/rewards/love.webm" },
  { id: "respect", label: "Respect", asset: "/rewards/respect.webm" },
];

type Meta = {
  title: string;
  subtitle: string;
  icon: string;
  presets: Preset[];
  defaultAmountCents: number;
  confirmLabel: string;
};

function metaFor(mode: Mode): Meta {
  switch (mode) {
    case "tip":
      return {
        title: "React",
        subtitle: "Send a flower",
        icon: "🌼",
        presets: [
          { label: "A$1.50", amountCents: 150 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 150,
        confirmLabel: "React",
      };
    case "boost":
      return {
        title: "Highlight",
        subtitle: "Highlight this live",
        icon: "⭐",
        presets: [
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
          { label: "A$25.00", amountCents: 2500 },
          { label: "A$50.00", amountCents: 5000 },
        ],
        defaultAmountCents: 1000,
        confirmLabel: "Highlight",
      };
    case "spin":
      return {
        title: "Pulse",
        subtitle: "Send a pulse",
        icon: "💫",
        presets: [
          { label: "A$1.00", amountCents: 100 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 200,
        confirmLabel: "Pulse",
      };
  }
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-white/15 bg-black/30 backdrop-blur px-3 py-1.5 text-xs text-white/90 hover:bg-black/40 disabled:opacity-50"
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}

export default function LiveSupportBar({
  sessionId,
  creatorEmail,
  userEmail,
  liveHrefForRedirect,
  currency = "aud",
}: {
  sessionId: string;
  creatorEmail: string | null;
  userEmail: string | null;
  liveHrefForRedirect: string;
  currency?: string;
}) {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeMeta = useMemo(() => {
    if (!activeMode) return null;
    return metaFor(activeMode);
  }, [activeMode]);

  const isAuthed = Boolean(userEmail);
  const creatorReady = Boolean(creatorEmail);

  async function begin(mode: Mode, amountCents: number) {
    if (!creatorEmail) throw new Error("Creator payouts are not available for this live session.");
    if (!userEmail) throw new Error("Please sign in to continue.");

    setBusy(true);
    try {
      const { url } = await createCheckout({
        mode,
        creatorEmail,
        userEmail,
        source: "LIVE",
        targetId: sessionId,
        returnPath: liveHrefForRedirect,
        amountCents,
      });
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login?redirectTo=${encodeURIComponent(liveHrefForRedirect)}`;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2">
      {!creatorReady && (
        <div className="text-[11px] text-white/60">
          Support actions unavailable (creator not set).
        </div>
      )}

      <div className="w-full flex items-center justify-center gap-2">
        <ActionButton
          icon="🌼"
          label="React"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("tip")}
        />
        <ActionButton
          icon="⭐"
          label="Highlight"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("boost")}
        />
        <ActionButton
          icon="💫"
          label="Pulse"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("spin")}
        />
        <ActionButton
          icon="🎁"
          label="Rewards"
          disabled={!creatorReady}
          onClick={() => setRewardsOpen(true)}
        />
      </div>

      <PostActionModal
        open={Boolean(activeMode && activeMeta)}
        onClose={() => setActiveMode(null)}
        title={activeMeta?.title ?? ""}
        subtitle={activeMeta?.subtitle}
        icon={activeMeta?.icon}
        isAuthed={isAuthed}
        loginHref={loginHref}
        presets={activeMeta?.presets}
        defaultAmountCents={activeMeta?.defaultAmountCents}
        confirmLabel={activeMeta?.confirmLabel}
        allowCustom={true}
        busy={busy}
        currency={currency}
        onConfirm={async (amountCents) => {
          if (!activeMode) return;
          await begin(activeMode, amountCents);
        }}
      />

      {rewardsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mb-6 mx-4 rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Rewards</h2>
              <button
                onClick={() => setRewardsOpen(false)}
                className="text-xs text-white/50 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {LIVE_REWARDS.map((r) => (
                <button
                  key={r.id}
                  disabled={!creatorReady}
                  onClick={async () => {
                    // SAFE: reuse "tip" checkout plumbing
                    await begin("tip", 150);
                    setRewardsOpen(false);
                  }}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-black/30 border border-white/10 overflow-hidden grid place-items-center">
                      <div className="text-2xl leading-none">
                      {r.id === "applause" ? "👏" : ""}
                      {r.id === "fire" ? "🔥" : ""}
                      {r.id === "love" ? "❤️" : ""}
                      {r.id === "respect" ? "✅" : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-[11px] text-white/60">A$1.50</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setRewardsOpen(false)}
              className="w-full text-[11px] text-white/45 hover:text-white/70 mt-3"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
