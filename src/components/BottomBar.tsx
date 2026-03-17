"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isRevolvr = pathname.startsWith("/public-feed");
  const isTranche = pathname.startsWith("/tranche");

  return (
    <div
      style={{
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "calc(64px + env(safe-area-inset-bottom))",
  paddingBottom: "env(safe-area-inset-bottom)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 60,
  zIndex: 80,
  color: "white",
  fontWeight: 600,
  letterSpacing: 1, // ← THIS COMMA WAS MISSING
}}
    >
      <button
        onClick={() => router.push("/public-feed")}
        style={{
          opacity: isRevolvr ? 1 : 0.6
        }}
      >
        REVOLVR
      </button>

      <button
        onClick={() => router.push("/tranche")}
        style={{
          opacity: isTranche ? 1 : 0.6
        }}
      >
        TRANCHE
      </button>
    </div>
  );
}