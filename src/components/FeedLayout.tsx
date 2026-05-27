"use client";

import BottomBar from "./BottomBar";
import TopBar from "./TopBar";

type Props = {
  children: React.ReactNode;
};

export default function FeedLayout({ children }: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        background: "#020617",
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
        <BottomBar />

        {children}
      </div>
    </div>
  );
}
