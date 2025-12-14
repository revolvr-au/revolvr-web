import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Signing you in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}
