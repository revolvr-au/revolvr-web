"use client";

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { label: "REVOLVR", href: "/public-feed" },
  { label: "PEOPLE",  href: "/people" },
  { label: "SPARK",   href: "/spark" },
  { label: "TRANCHE", href: "/tranche" },
];

export default function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
        display: "flex",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          height: 56,
          background: "transparent",
          padding: "0 22px",
          borderRadius: 999,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        {TABS.map(({ label, href }) => {
          const isActive = pathname === href || (href === "/public-feed" && pathname === "/");
          return (
            <div
              key={href}
              onClick={() => router.push(href)}
              style={{
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                padding: "0 4px",
                fontSize: 16,
                letterSpacing: "0.06em",
                fontWeight: 500,
                fontFamily: "Inter, system-ui, sans-serif",
                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
