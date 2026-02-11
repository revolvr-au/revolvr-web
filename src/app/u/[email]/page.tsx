// src/app/u/[email]/page.tsx
type Props = {
  params: { email: string };
};

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function Page({ params }: Props) {
  const raw = String(params?.email ?? "");
  const email = safeDecode(raw);

  return (
    <main className="mx-auto max-w-screen-sm p-6 text-white">
      <h1 className="text-2xl font-semibold">User</h1>
      <p className="mt-3 text-white/70 break-all">{email}</p>
    </main>
  );
}
