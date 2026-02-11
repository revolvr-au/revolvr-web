type Params = { email: string };
type Props = { params: Promise<Params> };

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function Page({ params }: Props) {
  const p = await params;
  const raw = String(p?.email ?? "");
  const email = safeDecode(raw);

  return (
    <main className="mx-auto max-w-screen-sm p-6 text-white">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
            {(email || "u")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{email || "User"}</h1>
            <p className="text-sm text-white/50">Profile page coming online.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
