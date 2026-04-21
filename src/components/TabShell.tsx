"use client";

import { usePathname } from "next/navigation";
import FeedLayout from "./FeedLayout";
import PublicFeedClient from "@/app/public-feed/PublicFeedClient";
import { PeoplePageContent } from "@/app/people/page";

const TAB_PATHS = new Set(["/public-feed", "/people", "/tranche"]);

export default function TabShell() {
  const pathname = usePathname();
  if (!TAB_PATHS.has(pathname)) return null;

  return (
    <>
      <div style={{ display: pathname === "/public-feed" ? "block" : "none" }}>
        <FeedLayout>
          <PublicFeedClient />
        </FeedLayout>
      </div>
      <div style={{ display: pathname === "/people" ? "block" : "none" }}>
        <PeoplePageContent />
      </div>
    </>
  );
}
