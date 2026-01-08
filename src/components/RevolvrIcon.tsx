// src/components/RevolvrIcon.tsx
"use client";

import Image from "next/image";

export type RevolvrIconName =
  | "home"
  | "dashboard"
  | "search"
  | "notifications"
  | "profile"
  | "wallet"
  | "transactions"
  | "send"
  | "receive"
  | "add"
  | "exchange"
  | "analytics"
  | "chat"
  | "activity"
  | "contacts"
  | "settings"
  | "info"
  | "trash"
  | "upload"
  | "download"
  | "share"
  | "tip"
  | "boost"
  | "heart";

type Props = {
  name: RevolvrIconName;
  size?: number; // px
  className?: string;
  alt?: string;
};

export function RevolvrIcon({ name, size = 24, className, alt }: Props) {
  const src = `/icons/icon-${name}.png`; // public/icons/icon-*.png

  return (
    <Image
      src={src}
      width={size}
      height={size}
      alt={alt ?? name}
      className={className}
      // local static assets -> safe; but keep this to avoid any edge config issues
      unoptimized
      priority={false}
    />
  );
}
