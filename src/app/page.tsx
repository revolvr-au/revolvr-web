"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // If Supabase drops us on "/" with ?code=..., forward it to the real handler.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      // preserve all query params (code + anything else)
      window.location.replace(`/auth/callback${url.search}`);
      return;
    }

    // normal home behaviour (adjust if you want)
    window.location.replace("/public-feed");
  }, []);

  return null;
}
