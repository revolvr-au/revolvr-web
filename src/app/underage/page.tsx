// src/app/underage/page.tsx

import Link from "next/link";

export default function UnderagePage() {
  return (
    <main className="max-w-md mx-auto mt-10 px-4 text-center">
      <h1 className="text-2xl font-semibold mb-4">Access restricted</h1>
      {/* Account-neutral wording: the age gate now reaches anonymous visitors too, and
          most people who land here have no account to refer to. */}
      <p className="mb-4">
        Revolvr is currently restricted to people aged 16 or over in your region.
        Based on the date of birth provided, you can&apos;t access Revolvr at this
        time.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        If you believe this is a mistake, you can{" "}
        <Link href="/support" className="underline">
          contact support
        </Link>
        .
      </p>

      <Link
        href="/"
        className="inline-block px-4 py-2 rounded border border-gray-300"
      >
        Back to home
      </Link>
    </main>
  );
}
