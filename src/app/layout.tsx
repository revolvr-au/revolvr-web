import type { Metadata } from "next";
import "./globals.css";
import KeyboardHandler from "@/components/KeyboardHandler";
import TabShell from "@/components/TabShell";

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
      <head>
        <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="min-h-screen bg-[#050814] text-white">
        <KeyboardHandler />
        <TabShell />
        {children}
      </body>
    </html>
  );
}