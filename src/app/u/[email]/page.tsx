type Params = { email: string };
type Props = { params: Params | Promise<Params> };

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function Page({ params }: Props) {
  const p = await Promise.resolve(params);
  const raw = String(p?.email ?? "");
  const email = safeDecode(raw);

  return (
    <main className="mx-auto max-w-screen-sm p-6 text-white">
      <h1 className="text-2xl font-semibold">User</h1>
      <p className="mt-3 text-white/70 break-all">{email}</p>

      {/* temp debug - remove later */}
      <pre className="mt-4 text-[11px] text-white/50 whitespace-pre-wrap">
        {JSON.stringify({ raw, email, paramsType: typeof params }, null, 2)}
      </pre>
    </main>
  );
}
