// src/app/u/[email]/page.tsx

import UserPageClient from "./UserPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  return <UserPageClient email={email} />;
}
