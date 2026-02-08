export default function VerifiedBadge({ tier }: { tier: "blue" | "gold" }) {
  const isGold = tier === "gold";
  return (
    <span
      title={isGold ? "Gold verified creator" : "Verified creator"}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] ${
        isGold ? "bg-yellow-500" : "bg-blue-500"
      }`}
    >
      ✓
    </span>
  );
}
