import "@livekit/components-styles";
import type { Metadata } from "next";
import "./globals.css";

import LayoutShell from "@/components/navigation/LayoutShell";

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
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}