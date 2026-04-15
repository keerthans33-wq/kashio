export default function ExportLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 space-y-8">

      {/* Heading */}
      <div className="space-y-2">
        <div className="h-7 w-64 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>

      {/* Total card */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 py-10 flex flex-col items-center gap-3">
        <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-14 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Item list */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="space-y-1.5">
              <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
            <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Button */}
      <div className="h-12 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </main>
  );
}
