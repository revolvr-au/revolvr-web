"use client";

export default function BottomBar() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        zIndex: 200
      }}
    >
      <div
        style={{
          background: "transparent",
          backdropFilter: "none",
          padding: "10px 22px", // slightly tighter
          borderRadius: 999,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 20,
          boxShadow: "none"
        }}
      >
        <div style={labelStyle}>REVOLVR</div>
        <div style={labelStyleMuted}>TRANCHE</div>
      </div>
    </div>
  );
}
const labelStyle = {
  fontSize: 15,
  letterSpacing: "0.06em",
  fontWeight: 500,
  fontFamily: "Inter, system-ui, sans-serif",
  color: "rgba(255,255,255,0.95)"
};

const labelStyleMuted = {
  fontSize: 15,
  letterSpacing: "0.06em",
  fontWeight: 500,
  fontFamily: "Inter, system-ui, sans-serif",
  color: "rgba(255,255,255,0.5)"
};
