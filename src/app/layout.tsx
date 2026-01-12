import type { Metadata } from "next";
import "./globals.css";
import { FloatingLiveButton } from "@/components/FloatingLiveButton";
import BottomBar, { BAR_HEIGHT_PX } from "@/components/BottomBar";

export const metadata: Metadata = {
  title: "Revolvr",
  description: "Revolvr",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050814] text-white">
        {/* Ensure app content never hides behind the fixed bottom bar */}
        <div
          style={{
            paddingBottom: `calc(${BAR_HEIGHT_PX}px + env(safe-area-inset-bottom))`,
          }}
        >
          {children}
        </div>

        {/* Global bottom navigation */}
        <BottomBar />

        {/* 🔴 Global floating Go Live button */}
        <FloatingLiveButton />
      </body>
    </html>
  );
}
