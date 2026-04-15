import { Suspense } from "react";
import ConnectFlow from "./ConnectFlow";

export default function ConnectPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Connect your bank</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Link your bank account and Kashio will automatically fetch your transactions. No CSV export needed.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">How it works</p>
        <ol className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">1</span>
            Click <strong className="text-gray-700 dark:text-gray-300">Connect your bank</strong> and you'll be taken to a secure Basiq page.
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">2</span>
            Log in to your bank and approve read-only access. Your password is never shared with Kashio.
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">3</span>
            You'll be sent back here. Click <strong className="text-gray-700 dark:text-gray-300">Fetch my transactions</strong> and Kashio will scan them for possible deductions.
          </li>
        </ol>
      </div>

      {/* Suspense is required because ConnectFlow reads searchParams on the client */}
      <Suspense>
        <ConnectFlow />
      </Suspense>
    </main>
  );
}
