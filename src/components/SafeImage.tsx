// src/components/SafeImage.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

export default function SafeImage({ src, alt, width, height, className }: Props) {
  const [broken, setBroken] = useState(false);

  if (broken || !src) {
    return (
      <div className={`bg-white/5 border border-white/10 flex items-center justify-center ${className ?? ""}`}>
        <span className="text-xs text-white/50">Image unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      onError={() => setBroken(true)}
      className={className}
    />
  );
}
