"use client";

import { usePurchase } from "@/hooks/usePurchase";

export default function PacksPage({ user }) {
  const { boostPack, tipPack, spinPack, loading, lastError } =
    usePurchase(user.email);

  return (
    <div>
      <button disabled={loading} onClick={() => boostPack()}>
        Buy Boost Pack (10 × A$5)
      </button>

      <button disabled={loading} onClick={() => tipPack()}>
        Buy Tip Pack (10 × A$2)
      </button>

      <button disabled={loading} onClick={() => spinPack()}>
        Buy Spin Pack (20 × A$1)
      </button>

      {lastError && <p style={{ color: "red" }}>{lastError}</p>}
    </div>
  );
}
