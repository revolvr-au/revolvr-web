"use client";

import { startCheckout } from "@/lib/purchase";

export default function SpinButton({ userEmail }: { userEmail: string }) {
  async function startSpin() {
    try {
      await startCheckout({
        mode: "spin",
        creatorEmail: userEmail, // TEMP self attribution (swap later to actual creator)
        userEmail,
        source: "FEED",
        targetId: null,
        returnPath: "/creator",
      });
    } catch (e) {
      console.error("[SpinButton] checkout failed", e);
      alert("Could not start spinner payment");
    }
  }

  return (
    <button
      onClick={startSpin}
      className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-pink-500 hover:bg-pink-400 text-xs sm:text-sm font-medium shadow-md shadow-pink-500/25 transition"
    >
      Spin the Revolvr (A$1)
    </button>
  );
}
