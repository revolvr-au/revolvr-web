"use client";

import { usePathname } from "next/navigation";
import TopBar from "./TopBar";

type Props = {
  children: React.ReactNode;
  /** Optional override for the page background. Falls back to the route default. */
  background?: string;
};

export default function FeedLayout({ children, background: backgroundOverride }: Props) {
  const pathname = usePathname();
  const isTranche = pathname?.startsWith("/tranche") ?? false;
  const background = backgroundOverride ?? (isTranche ? "#E8E4DC" : "#020617");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        background,
        minHeight: "100vh"
      }}
    >
      {/* SINGLE FEED CONTAINER */}
      <div
  style={{
    width: "100%",
    maxWidth: "100%",
    height: "100dvh",
    overflow: "hidden",
    position: "relative"
  }}
>
        <TopBar />

        {children}
      </div>
    </div>
  );
}
