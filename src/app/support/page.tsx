"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthedUser } from "@/lib/useAuthedUser";

// Safety concerns are intentionally NOT here — they route through /report,
// which carries the child-safety escalation path. See the callout below the form.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "account", label: "Account" },
  { value: "payments", label: "Payments & credits" },
  { value: "bug", label: "Bug report" },
  { value: "general", label: "Something else" },
];

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuthedUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("account");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the session when available; page must still work signed-out
  // (the account-disabled page links here).
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!name.trim() || !email.includes("@") || !message.trim()) {
      setError("Please add your name, a valid email, and a message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setSent(true);
      } else {
        setError(
          data?.error === "invalid_input"
            ? "Please fill in all required fields."
            : "Something went wrong. Please try again.",
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
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

        <h1 className="text-2xl font-semibold">Help &amp; Support</h1>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <div className="text-sm font-semibold text-emerald-300">
              Message sent
            </div>
            <p className="mt-2 text-sm text-white/75 leading-6">
              Thanks {name.trim().split(" ")[0] || "there"} — we&apos;ve received
              your message and will reply by email within 1–2 business days.
            </p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 inline-block rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/70 leading-6">
              Need help with your account, payments, or safety? Send us a message
              and we&apos;ll respond as soon as possible.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  autoComplete="name"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Topic
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#070b1b]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Message
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={7}
                  maxLength={5000}
                  placeholder="Include your account email/handle and a short description."
                  className="resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2.5 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send message"}
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm text-white/70 leading-6">
                Reporting a safety concern — such as harassment, a scam, or a
                minor in danger? Please use our dedicated safety form so it
                reaches the right team quickly.
              </p>
              <a
                href="/report"
                className="mt-3 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                Report a safety issue
              </a>
            </div>
          </>
        )}

        <div className="mt-6 text-xs text-white/50">Revolvr Pty Ltd (Australia)</div>
      </div>
    </main>
  );
}
