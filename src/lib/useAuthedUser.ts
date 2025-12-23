// src/lib/useAuthedUser.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type AuthedUser = {
  id: string;
  email?: string | null;
} | null;

export function useAuthedUser() {
  // undefined = resolving, null = confirmed no user, object = user
  const [user, setUser] = useState<AuthedUser | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const settledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const settle = () => {
      if (!mounted) return;
      if (settledRef.current) return;
      settledRef.current = true;
      setReady(true);
    };

    // 1) Subscribe first so we don't miss the event after callback
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      // If we get a session event, that's definitive
      setUser((session?.user as any) ?? null);
      settle();
    });

    // 2) Then request session once
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error("[useAuthedUser] getSession error", error);
        }

        const sessUser = data.session?.user ?? null;

        // If session exists, settle immediately.
        if (sessUser) {
          setUser(sessUser as any);
          settle();
          return;
        }

        // If no session, DO NOT immediately settle. Give auth a moment to hydrate.
        // This prevents false redirects right after magic-link/callback.
        setUser(null);

        setTimeout(() => {
          // If no auth event arrived within the settle window, accept "no session"
          settle();
        }, 400);
      } catch (e) {
        console.error("[useAuthedUser] unexpected", e);
        setUser(null);
        setTimeout(() => settle(), 400);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}
