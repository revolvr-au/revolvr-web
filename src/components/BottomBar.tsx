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
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "transparent",
          backdropFilter: "none",
          padding: "10px 22px",
          borderRadius: 999,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 20,
          boxShadow: "none",
        }}
      >
        {TABS.map(({ label, href }) => {
          const isActive = pathname === href || (href === "/public-feed" && pathname === "/");
          return (
            <div
              key={href}
              onClick={() => router.push(href)}
              style={{
                fontSize: 15,
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
