"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type MaybeUser = { user_metadata?: Record<string, unknown> | null } | null;

// Single source of truth for "can this account broadcast?". useGoLive enforces it
// imperatively (redirect to onboarding); useCanGoLive exposes the same predicate so
// the LIVE affordance can be render-gated instead of offered-then-refused.
function canBroadcast(user: MaybeUser) {
  return !!user?.user_metadata?.is_creator;
}

export function useGoLive(onAllowed: () => void) {
  const router = useRouter();

  const goLive = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/public-feed");
      return;
    }

    if (!canBroadcast(user)) {
      router.push("/creator/onboard");
      return;
    }

    onAllowed();
  };

  return goLive;
}

/**
 * Render-gate for broadcast affordances. Fails closed: false until Supabase has
 * confirmed a creator, so a slow session resolve hides LIVE rather than flashing it
 * at someone who can't use it.
 */
export function useCanGoLive() {
  const [canGoLive, setCanGoLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!cancelled) setCanGoLive(canBroadcast(user));
      })
      .catch(() => {
        if (!cancelled) setCanGoLive(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanGoLive(canBroadcast(session?.user ?? null));
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return canGoLive;
}
