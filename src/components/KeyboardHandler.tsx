"use client";

import { useEffect } from "react";

export default function KeyboardHandler() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height
      );

      document.documentElement.style.setProperty(
        "--keyboard-height",
        `${keyboardHeight}px`
      );
    };

    viewport.addEventListener("resize", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}