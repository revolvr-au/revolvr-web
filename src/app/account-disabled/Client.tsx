"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AccountDisabledClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const status = ((sp?.get("status") ?? "DEACTIVATED") as string).toUpperCase();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = useMemo(() => {
    if (status === "DELETED") return "Account deleted";
    return "Account deactivated";
  }, [status]);

  const body = useMemo(() => {
    if (status === "DELETED")
      return "This account has been deleted and is no longer accessible.";
    return "Your account is currently deactivated. You can reactivate to continue using Revolvr.";
  }, [status]);

  async function reactivate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/reactivate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Unable to reactivate.");
        return;
      }
      router.push("/feed");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70 leading-6">{body}</p>

        {status !== "DELETED" ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={reactivate}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90 hover:bg-white/15 disabled:opacity-50"
            >
              {busy ? "Reactivating..." : "Reactivate account"}
            </button>

            <a
              href="/support"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
            >
              Contact support
            </a>
          </div>
        ) : (
          <div className="mt-6">
            <a
              href="/support"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10 inline-block"
            >
              Contact support
            </a>
          </div>
        )}

        {err ? (
          <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}
      </div>
    </main>
  );
}
