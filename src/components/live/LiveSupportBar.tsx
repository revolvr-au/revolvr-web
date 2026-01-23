"use client";

import { useMemo, useState } from "react";
import PostActionModal, { type Preset } from "@/components/PostActionModal";
import { createCheckout } from "@/lib/actionsClient";

type Mode = "tip" | "boost" | "spin";

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
        title: "Tip creator",
        subtitle: "Support this creator",
        icon: "💰",
        presets: [
          { label: "A$1.50", amountCents: 150 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 150,
        confirmLabel: "Tip",
      };
    case "boost":
      return {
        title: "Boost",
        subtitle: "Boost this live",
        icon: "⚡",
        presets: [
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
          { label: "A$25.00", amountCents: 2500 },
          { label: "A$50.00", amountCents: 5000 },
        ],
        defaultAmountCents: 1000,
        confirmLabel: "Boost",
      };
    case "spin":
      return {
        title: "Spin",
        subtitle: "Spin the Revolvr",
        icon: "🌀",
        presets: [
          { label: "A$1.00", amountCents: 100 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 200,
        confirmLabel: "Spin",
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
          icon="💰"
          label="Tip"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("tip")}
        />
        <ActionButton
          icon="⚡"
          label="Boost"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("boost")}
        />
        <ActionButton
          icon="🌀"
          label="Spin"
          disabled={!creatorReady}
          onClick={() => creatorReady && setActiveMode("spin")}
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
    </div>
  );
}
