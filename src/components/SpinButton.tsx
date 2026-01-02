"use client";

export default function SpinButton({ userEmail }: { userEmail: string }) {
  async function startSpin() {
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "spin",
        creatorEmail: userEmail, // TEMP self attribution so it won’t 400
        userEmail,
        source: "FEED",
        targetId: null,
        returnPath: "/creator/dashboard",
      }),
    });

    if (!res.ok) {
      alert("Could not start spinner payment");
      return;
    }

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
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
