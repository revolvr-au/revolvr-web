"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SUPPORT_EMAIL = "revolvrassist@gmail.com";

type Category =
  | "HARASSMENT"
  | "SCAM_FRAUD"
  | "IMPERSONATION"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";

const CATEGORIES: Array<{ key: Category; label: string }> = [
  { key: "HARASSMENT", label: "Harassment" },
  { key: "SCAM_FRAUD", label: "Scam / Fraud" },
  { key: "IMPERSONATION", label: "Impersonation" },
  { key: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { key: "OTHER", label: "Other" },
];

export default function ReportPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("HARASSMENT");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");

  
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, link, details }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Unable to submit report right now.");
        return;
      }
      setOk("Report submitted. Thank you.");
    } catch {
      setErr("Network error. You can still email support below.");
    } finally {
      setBusy(false);
    }
  }

const mailtoHref = useMemo(() => {
    const subject = `Revolvr Safety Report: ${category}`;
    const body = [
      `Category: ${category}`,
      link ? `Link / Profile / Post: ${link}` : null,
      "",
      "Details:",
      details || "(no details provided)",
      "",
      "— Sent from Revolvr web",
    ]
      .filter(Boolean)
      .join("\n");
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [category, details, link]);

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

        <h1 className="text-2xl font-semibold">Report an issue</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">
          If something made you feel unsafe, report it here. We review reports as soon as possible.
        </p>

        <div className="mt-6 space-y-2">
          <div className="text-sm text-white/80 font-semibold">Category</div>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.key}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer hover:bg-black/30"
              >
                <input
                  type="radio"
                  name="category"
                  value={c.key}
                  checked={category === c.key}
                  onChange={() => setCategory(c.key)}
                  className="mt-1"
                />
                <span className="text-sm text-white/80">{c.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-sm text-white/80 font-semibold">Link / Profile / Post (optional)</div>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Paste a URL or @handle"
            />
          </div>

          <div className="mt-4">
            <div className="text-sm text-white/80 font-semibold">Details (optional)</div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
              rows={5}
              placeholder="What happened? Include dates/times and any context that helps."
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90 hover:bg-white/15 disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send report"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
        </div>


        {ok ? (
          <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            {ok}
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
            {err}{" "}
            <a href={mailtoHref} className="underline hover:text-white/80">
              Email support
            </a>
            .
          </div>
        ) : null}

        <div className="mt-6 text-xs text-white/50">
          If you are in immediate danger, contact local emergency services.
        </div>
      </div>
    </main>
  );
}
