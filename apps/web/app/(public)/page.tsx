import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-gray-900">
      <div className="w-full max-w-lg">

        {/* Wordmark */}
        <div className="flex justify-center">
          <Image
            src="/kashio - 1.PNG"
            alt="Kashio"
            height={200}
            width={750}
            className="h-16 w-auto dark:hidden"
            priority
          />
          <Image
            src="/kashio - 2.PNG"
            alt="Kashio"
            height={200}
            width={750}
            className="h-16 w-auto hidden dark:block"
            priority
          />
        </div>

        {/* What it does */}
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Kashio helps Australian employees spot possible work-related deductions in their bank transactions.
        </p>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Connect your bank directly or upload a CSV. Kashio scans your transactions, flags what looks work-related, and gives you a tidy summary at tax time.
        </p>

        {/* How it works */}
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">How it works</p>
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">1</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Import your bank transactions</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Connect your bank directly via open banking — no CSV export needed. Or upload a CSV manually if you prefer.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">2</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Review possible deductions</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Go through each flagged transaction and confirm it as a deduction or reject it. You decide — Kashio only suggests.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">3</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export for tax time</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Note which receipts you have on hand, then download a CSV of your confirmed deductions — ready to hand to your accountant.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/import"
            className="inline-block rounded-md bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Connect your bank
          </Link>
          <Link
            href="/import"
            className="inline-block rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Upload a CSV
          </Link>
        </div>

        {/* Open banking badge */}
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Bank connection powered by{" "}
          <span className="font-medium text-gray-500 dark:text-gray-400">Basiq</span>
          {" "}· read-only access · your banking password is never shared with Kashio
        </p>

        {/* Footer note */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          Kashio does not give tax advice. Always check with a registered tax agent for your specific situation.
        </p>

      </div>
    </main>
  );
}
