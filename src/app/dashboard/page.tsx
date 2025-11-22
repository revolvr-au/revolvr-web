export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Revolvr Dashboard</h1>
        <span className="text-xs text-slate-400">
          v0.1 · Foundations only · No data yet
        </span>
      </header>

      <section className="space-y-4">
        <p className="text-sm text-slate-300">
          This is where the core Revolvr experience will live.
          For now, it&apos;s just a skeleton so we can build the right thing in the right place.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Next step
          </p>
          <p className="text-sm text-slate-200">
            Decide the first real action a user takes in Revolvr
            (e.g. create a &quot;Revolve&quot;, add a client, connect data, etc),
            and we&apos;ll build that here as the primary CTA.
          </p>
        </div>
      </section>
    </main>
  );
}
