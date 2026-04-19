"use client";

import BottomBar from "./BottomBar";
import PeopleRail from "./PeopleRail";
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
    height: "100vh",
    overflow: "hidden",
    position: "relative"
  }}
>
        <TopBar />
        <PeopleRail />
        <BottomBar />

        {children}
      </div>
    </div>
  );
}