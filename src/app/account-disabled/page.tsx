import { Suspense } from "react";
import AccountDisabledClient from "./Client";

export default function AccountDisabledPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-white/60">Loading...</div>}>
      <AccountDisabledClient />
    </Suspense>
  );
}
