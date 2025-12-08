import type { Metadata } from "next";
import "./globals.css";
import { FloatingLiveButton } from "@/components/FloatingLiveButton";

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
      <body>
        {children}

        {/* 🔴 Global floating Go Live button */}
        <FloatingLiveButton />
      </body>
    </html>
  );
}
