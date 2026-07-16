"use client";

// Shared, module-level cache for GET /api/people-rail.
//
// The feed (PublicFeedClient) and the People tab both fetch this endpoint on
// cold /public-feed load. They previously held separate caches, so the same
// request fired twice. A plain TTL cache doesn't help on cold load (both
// callers see an empty cache and both fetch) — the in-flight promise below is
// what collapses concurrent callers onto a single request.

// Person arrays are heterogeneous and consumed via `any` / local casts at both
// call sites (the feed merges into PeopleCardUser[], the People tab casts to
// PeopleData), matching how the endpoint's shape was treated before this cache.
export type PeopleRailData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  live: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creators: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newPeople: any[];
};

let cache: { data: PeopleRailData; ts: number } | null = null;
let inflight: Promise<PeopleRailData> | null = null;
const TTL = 30_000; // matches the People tab's former PEOPLE_CACHE_TTL

export function getCachedPeopleRail(): PeopleRailData | null {
  return cache?.data ?? null;
}

export function fetchPeopleRail(force = false): Promise<PeopleRailData> {
  if (!force && cache && Date.now() - cache.ts < TTL) return Promise.resolve(cache.data);
  if (inflight) return inflight; // concurrent cold-load callers share one request
  inflight = fetch("/api/people-rail")
    .then((r) => r.json())
    .then((d: PeopleRailData) => {
      cache = { data: d, ts: Date.now() };
      return d;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
