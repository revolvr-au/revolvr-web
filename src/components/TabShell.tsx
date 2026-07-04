"use client";

import { usePathname } from "next/navigation";
import PublicFeedClient from "@/app/public-feed/PublicFeedClient";
import { PeoplePageContent } from "@/app/people/page";
import { SparkContent } from "@/app/spark/page";
import { TrancheContent } from "@/app/tranche/TrancheContent";

const TAB_PATHS = new Set(["/public-feed", "/people", "/spark", "/tranche"]);

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
      <div style={{ display: pathname === "/people" ? "block" : "none" }}>
        <PeoplePageContent />
      </div>
      <div style={{ display: pathname === "/spark" ? "block" : "none" }}>
        <SparkContent />
      </div>
      <div style={{ display: pathname === "/tranche" ? "block" : "none" }}>
        <TrancheContent />
      </div>
    </>
  );
}
