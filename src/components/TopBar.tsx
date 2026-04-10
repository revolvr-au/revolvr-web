"use client";

export default function TopBar() {

  const textStyle = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 13,
    letterSpacing: "0.06em",
    fontWeight: 500,
    color: "rgba(255,255,255,0.95)"
  };

  const textStyleMuted = {
    ...textStyle,
    opacity: 0.6
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 20,
        right: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
        pointerEvents: "none"
      }}
    >
      {/* LEFT */}
      <div style={textStyle}>REVOLVR</div>

      {/* RIGHT */}
      <div style={textStyleMuted}>LIVE</div>
    </div>
  );
}