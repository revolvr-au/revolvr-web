// src/app/layout.tsx

import "./globals.css"; // make sure all rv-* styles + tailwind are loaded globally
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revolvr",
  description: "Revolvr – social preview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
