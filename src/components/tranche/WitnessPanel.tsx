"use client";

export type WitnessProfile = {
  email: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
};

export type WitnessPanelAuthor = {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
};

type WitnessCell =
  | { kind: "witness"; profile: WitnessProfile }
  | { kind: "overflow"; n: number };

export default function WitnessPanel({
  author,
  witnessCount,
  topWitnesses,
  dominantSize,
  theme,
}: {
  author: WitnessPanelAuthor;
  witnessCount: number;
  topWitnesses: WitnessProfile[];
  dominantSize: number;
  theme: "light" | "dark";
}) {
  if (witnessCount <= 0) return null;

  const isDark = theme === "dark";
  const dominantInitial = (author.displayName || author.handle || "?").charAt(0).toUpperCase();
  const overflow = Math.max(0, witnessCount - 8);
  const visibleSlots = overflow > 0 ? 7 : Math.min(witnessCount, 8);
  const visible = topWitnesses.slice(0, visibleSlots);

  const cells: WitnessCell[] = visible.map((p) => ({ kind: "witness", profile: p }));
  if (overflow > 0) cells.push({ kind: "overflow", n: overflow });

  const rowSizes = [2, 4, 2];
  let cellIdx = 0;
  const rows = rowSizes.map((size) => {
    const slice: WitnessCell[] = [];
    for (let i = 0; i < size && cellIdx < cells.length; i++) {
      slice.push(cells[cellIdx]);
      cellIdx++;
    }
    return slice;
  });

  const witnessFallback = isDark ? "rgba(245,242,236,0.18)" : "rgba(15,17,21,0.12)";
  const dominantFallback = isDark
    ? "linear-gradient(135deg, rgba(245,242,236,0.16), rgba(245,242,236,0.06))"
    : "linear-gradient(135deg, #2a2f3a, #1a1f28)";
  const overflowBg = isDark ? "rgba(184,92,92,0.32)" : "rgba(15,17,21,0.14)";
  const overflowText = isDark ? "#F5F2EC" : "#0F1115";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        flexShrink: 0,
      }}
      aria-label={`${witnessCount} witnesses`}
    >
      <div
        style={{
          width: dominantSize,
          height: dominantSize,
          borderRadius: 4,
          background: author.avatarUrl
            ? `url(${author.avatarUrl}) center/cover`
            : dominantFallback,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: Math.round(dominantSize * 0.42),
          flexShrink: 0,
        }}
      >
        {!author.avatarUrl && dominantInitial}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
        {rows.map((row, ri) =>
          row.length > 0 ? (
            <div key={ri} style={{ display: "flex", gap: 2 }}>
              {row.map((cell, ci) => {
                if (cell.kind === "overflow") {
                  return (
                    <div
                      key={`o-${ci}`}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 2,
                        background: overflowBg,
                        color: overflowText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Space Grotesk', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: 9,
                        letterSpacing: "0.02em",
                      }}
                      title={`+${cell.n} more witnesses`}
                    >
                      +{cell.n}
                    </div>
                  );
                }
                const p = cell.profile;
                const wInit = (p.displayName || p.handle || p.email || "?").charAt(0).toUpperCase();
                return (
                  <div
                    key={`${p.email}-${ci}`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 2,
                      background: p.avatarUrl
                        ? `url(${p.avatarUrl}) center/cover`
                        : witnessFallback,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                    title={p.displayName ?? p.handle ?? p.email}
                  >
                    {!p.avatarUrl && wInit}
                  </div>
                );
              })}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
