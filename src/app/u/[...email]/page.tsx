type Props = {
  params: { email: string[] };
};

export default function Page({ params }: Props) {
  const email = params.email.join("/");
  return (
    <main className="mx-auto max-w-screen-sm p-4">
      <h1 className="text-xl font-semibold">User</h1>
      <p className="mt-2 text-white/70">{email}</p>
    </main>
  );
}
