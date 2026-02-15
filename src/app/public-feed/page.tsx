'use client'

export const dynamic = "force-dynamic";
export const revalidate = false;

import PublicFeedClient from "./PublicFeedClient";

export default function PublicFeedPage() {
  return <PublicFeedClient />;
}
