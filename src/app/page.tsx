export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full space-y-8">
        <div>
          <span className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide">
            Revolvr · Early Preview
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold">
            The control panel for your&nbsp;
            <span className="text-emerald-400">Revolvr idea here</span>.
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Replace this with a one–sentence description of what Revolvr actually does
            and who it is for.
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
          No fluff. No noise. Revolvr focuses on the one thing that matters:
          <span className="text-slate-300"> your value prop here.</span>
        </p>
      </div>
    </main>
  );
}
