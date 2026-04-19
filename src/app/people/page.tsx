import FeedLayout from "@/components/FeedLayout";

export default function PeoplePage() {
  return (
    <FeedLayout>
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.12em",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "rgba(255,255,255,0.9)",
        }}>
          PEOPLE
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: "monospace",
          letterSpacing: "2px",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}>
          Coming Soon
        </div>
      </div>
    </FeedLayout>
  );
}
