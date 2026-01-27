import { Suspense } from "react";
import CreatorTermsClient from "./CreatorTermsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-white/70">Loading…</div>}>
      <CreatorTermsClient />
    </Suspense>
  );
}
