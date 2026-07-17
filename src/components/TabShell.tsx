"use client";

import { usePathname } from "next/navigation";
import PublicFeedClient from "@/app/public-feed/PublicFeedClient";
import { TrancheContent } from "@/app/tranche/TrancheContent";

const TAB_PATHS = new Set(["/public-feed", "/tranche"]);

export default function TabShell({
  dmEnabled,
  revolveEnabled,
  previewMode,
}: {
  dmEnabled: boolean;
  revolveEnabled: boolean;
  previewMode: boolean;
}) {
  const pathname = usePathname();
  if (!TAB_PATHS.has(pathname)) return null;

  return (
    <>
      <div style={{ display: pathname === "/public-feed" ? "block" : "none" }}>
        <PublicFeedClient
          dmEnabled={dmEnabled}
          revolveEnabled={revolveEnabled}
          previewMode={previewMode}
        />
      </div>
      <div style={{ display: pathname === "/tranche" ? "block" : "none" }}>
        <TrancheContent />
      </div>
    </>
  );
}
