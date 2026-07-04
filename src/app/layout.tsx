import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import KeyboardHandler from "@/components/KeyboardHandler";
import TabShell from "@/components/TabShell";
import { isDmEnabled } from "@/lib/dm";
import { isRevolveEnabled, isRevolvePreview } from "@/lib/revolve/config";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

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
    <html lang="en" className={inter.variable}>
      <head>
        <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <script async src="https://player.live-video.net/1.29.0/amazon-ivs-player.min.js" />
      </head>
      <body className="min-h-screen bg-[#050814] text-white">
        <KeyboardHandler />
        <TabShell
          dmEnabled={isDmEnabled()}
          revolveEnabled={isRevolveEnabled()}
          previewMode={isRevolvePreview()}
        />
        {children}
      </body>
    </html>
  );
}