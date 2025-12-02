"use client";

import React from "react";

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
  const src = `/icons/icon-${name}.png`; // expects public/icons/icon-*.png

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt ?? name}
      className={className}
    />
  );
}
