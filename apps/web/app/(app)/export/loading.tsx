export default function ExportLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="h-8 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-7 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />

      {/* Category totals */}
      <div className="mt-6 rounded-lg border border-gray-200 divide-y divide-gray-100 dark:border-gray-700 dark:divide-gray-700">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-6 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 flex-1 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
