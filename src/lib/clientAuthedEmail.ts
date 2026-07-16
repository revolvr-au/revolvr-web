"use client";

// Shared, page-lifetime dedupe for the authed user's email.
//
// Three feed-shell components (public-feed, people, tranche) all mount on
// /public-feed and each used to call supabase.auth.getUser() independently —
// three identical auth round-trips on cold load. They only ever read the
// email, so memoise a single lookup and share it.
//
// No TTL: login/logout is a hard navigation (window.location.href), which
// reloads this module and clears the cache. A TTL would only add a staleness
// window without ever doing useful work. This is a display/identity read, not
// an authz gate — every API route still runs its own server-side getUser().

import { createSupabaseBrowserClient } from "@/supabase-browser";

let cache: { email: string | null } | null = null;
let inflight: Promise<string | null> | null = null;

export function getAuthedEmail(): Promise<string | null> {
  if (cache) return Promise.resolve(cache.email);
  if (inflight) return inflight; // collapse concurrent cold-load callers onto one request
  const supabase = createSupabaseBrowserClient();
  inflight = supabase.auth
    .getUser()
    .then(({ data }) => {
      const email = data.user?.email ?? null;
      cache = { email };
      return email;
    })
    .catch(() => null) // leave cache unset so a transient failure retries on next mount
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
