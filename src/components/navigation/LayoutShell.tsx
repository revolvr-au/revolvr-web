"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLiveRoute = pathname?.startsWith("/live");

  return (
    <>
      <div
        style={{
          paddingBottom: isLiveRoute
            ? 0
            : "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>

      {!isLiveRoute && <BottomNav />}
    </>
  );
}