import { Suspense } from "react";
import WelcomeClient from "./WelcomeClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WelcomeClient />
    </Suspense>
  );
}
