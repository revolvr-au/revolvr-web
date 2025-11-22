export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full space-y-6">
        <div>
          <span className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide">
            Revolvr · Early Access
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold">
            Revolvr is your new control panel.
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Replace this copy with the real one-liner for what Revolvr does and who it&apos;s for.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
            Get started
          </button>
          <button className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900">
            Learn more
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Built on Next.js, Supabase, and a stupidly clean pipeline. Revolvr is the one we&aposre doing right.
        </p>
      </div>
    </main>
  );
}
