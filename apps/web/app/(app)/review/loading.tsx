export default function ReviewLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="h-8 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-7 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                <div className="h-5 w-36 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
              </div>
              <div className="space-y-2 text-right">
                <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                <div className="h-5 w-20 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-3 w-full rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
