"use client";

export default function PeopleRail() {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 72,
        height: "100vh",
        background: "linear-gradient(180deg,#0b0b0b,#121212)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 80,
        gap: 16,
        zIndex: 50
      }}
    >
      <div style={{ color: "white", fontWeight: 600 }}>REVOLVR</div>
    </div>
  );
}