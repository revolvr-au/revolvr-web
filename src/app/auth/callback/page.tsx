import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Signing you in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}
