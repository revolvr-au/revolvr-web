import { Suspense } from "react";
import CreatorOnboardClient from "./CreatorOnboardClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-6 py-10">Loading…</div>}>
      <CreatorOnboardClient />
    </Suspense>
  );
}
