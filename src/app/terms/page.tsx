"use client";

import { useRouter } from "next/navigation";
import { TERMS_TEXT, TERMS_LAST_UPDATED } from "@/legal/terms.en";

function renderMarkdownBasic(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-2xl font-semibold mt-0">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-lg font-semibold mt-6">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm text-white/80 leading-6">
        {line}
      </p>
    );
  });
}

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute right-4 top-4 text-white/50 hover:text-white/80 text-sm"
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>

        <div className="text-xs text-white/50 mb-4">Last updated: {TERMS_LAST_UPDATED}</div>

        <div className="max-h-[75vh] overflow-auto pr-2">
          {renderMarkdownBasic(TERMS_TEXT)}
        </div>
      </div>
    </main>
  );
}
