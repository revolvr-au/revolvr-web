import "@livekit/components-styles";
import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}