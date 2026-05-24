import GathRoomClient from "./GathRoomClient";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);
  return <GathRoomClient id={id} />;
}
