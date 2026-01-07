// src/components/SafeImage.tsx
"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = ImageProps & {
  fallbackText?: string;
  fallbackClassName?: string;
};

export default function SafeImage(props: Props) {
  const {
    alt,
    fallbackText,
    fallbackClassName = "w-full h-full flex items-center justify-center text-xs text-white/60 bg-white/5",
    onError,
    ...rest
  } = props;

  const [broken, setBroken] = useState(false);

  if (broken) {
    const text =
      fallbackText ?? (typeof alt === "string" && alt.trim() ? alt.trim()[0].toUpperCase() : "?");

    return <div className={fallbackClassName}>{text}</div>;
  }

  return (
    <Image
      alt={alt}
      {...rest}
      onError={(e) => {
        setBroken(true);
        onError?.(e);
      }}
    />
  );
}
