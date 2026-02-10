export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: { email: string } };

export default function Page({ params }: Props) {
  const raw = String(params?.email ?? "");
  const email = decodeURIComponent(raw);

  return (
    <main className="mx-auto max-w-screen-sm p-6">
      <h1 className="text-2xl font-semibold">User</h1>
      <p className="mt-3 text-white/70 break-all">{email}</p>
    </main>
  );
}
