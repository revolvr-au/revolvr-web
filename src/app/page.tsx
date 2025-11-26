"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/feed");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <p>Loading Revolvr…</p>
    </main>
  );
}
