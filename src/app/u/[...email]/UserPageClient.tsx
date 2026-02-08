"use client";

import { useEffect, useState } from "react";

export default function UserPageClient({ email }: { email: string }) {
  // Keep whatever client-only UI/state you need here.
  // If the old page did client fetching, move it into this component.

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Example placeholder: no-op.
    // Move your existing useEffect/fetch logic here if needed.
    setLoading(false);
  }, [email]);

  return (
    <main className="min-h-screen px-6 py-6">
      <h1 className="text-xl font-semibold">User</h1>
      <p className="mt-2 text-sm opacity-80">{email}</p>

      {loading ? <p className="mt-4 text-sm opacity-70">Loading…</p> : null}
    </main>
  );
}
