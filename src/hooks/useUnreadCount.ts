"use client";

import { useEffect, useState } from "react";
import { useAuthedUser } from "@/lib/useAuthedUser";

// Polls the DM unread total for the top-bar badge. No push at launch — a light
// 30s poll plus a refresh on focus keeps the badge accurate enough.
export function useUnreadCount(pollMs = 30000) {
  const { user, ready } = useAuthedUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ready || !user) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        /* best-effort */
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, pollMs);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, user, pollMs]);

  return count;
}
