import "@livekit/components-styles";
import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/navigation/BottomNav";

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
        <div
          style={{
            paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>

        <BottomNav />
      </body>
    </html>
  );
}