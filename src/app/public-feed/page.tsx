"use client";

import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="max-w-2xl mx-auto mt-10 px-4 text-white bg-[#050816] min-h-screen">
      <div className="flex items-center gap-4 mb-6 pt-6">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white">
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <p>User settings will go here.</p>
        <p className="text-sm text-white/60 mt-2">This is a placeholder page for user-specific settings.</p>
      </div>
    </main>
  );
}