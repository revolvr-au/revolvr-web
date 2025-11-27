import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revolvr",
  description: "Revolvr · social preview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050814] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
