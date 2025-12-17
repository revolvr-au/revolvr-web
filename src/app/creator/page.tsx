import { redirect } from "next/navigation";
import { getCreatorMe } from "@/lib/creator";
import CreatorDashboard from "@/components/creator/CreatorDashboard";

export default async function CreatorPage() {
  const me = await getCreatorMe();

  // Not logged in or not a creator → onboarding
  if (!me) {
    redirect("/creator/onboard");
  }

  return <CreatorDashboard me={me} />;
}
