type Props = { params: { email: string } };

export default function Page({ params }: Props) {
  const email = (() => {
    try {
      return decodeURIComponent(params.email || "");
    } catch {
      return params.email || "";
    }
  })();

  return (
    <main className="mx-auto max-w-screen-sm p-6 text-white">
      <h1 className="text-2xl font-semibold">User</h1>
      <p className="mt-3 text-white/70 break-all">{email}</p>
    </main>
  );
}
