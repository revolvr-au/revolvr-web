type Props = {
  params: { email: string[] };
};

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function Page({ params }: Props) {
  const raw = Array.isArray(params.email) ? params.email.join("/") : String((params as any)?.email ?? "");
  const email = safeDecode(raw);

  return (
    <main className="mx-auto max-w-screen-sm p-4">
      <h1 className="text-xl font-semibold">User</h1>
      <p className="mt-2 text-white/70 break-all">{email}</p>

      <div className="mt-6 text-sm text-white/60">
        Profile page stub (next: load posts, follow state, avatar, etc.)
      </div>
    </main>
  );
}
