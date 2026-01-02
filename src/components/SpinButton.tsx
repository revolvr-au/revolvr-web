"use client";

export default function SpinButton({ userEmail }: { userEmail: string }) {
  async function startSpin() {
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "spin",
        creatorEmail: userEmail,           // TEMP self attribution
        userEmail,
        source: "FEED",
        targetId: null,
        returnPath: "/creator/dashboard",  // important so you come back
      }),
    });

    if (!res.ok) {
      console.error("Spin checkout failed:", await res.text());
      alert("Could not start spinner payment");
      return;
    }

    const data = await res.json().catch(() => null);
    if (data?.url) window.location.href = data.url;
    else alert("Stripe did not return a checkout URL");
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
