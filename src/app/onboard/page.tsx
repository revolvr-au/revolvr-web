import { Suspense } from "react";
import OnboardClient from "./OnboardClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Suspense><OnboardClient /></Suspense>;
}
