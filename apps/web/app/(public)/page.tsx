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
            className="w-full h-auto dark:hidden"
            priority
          />
          <Image
            src="/kashio - 2.PNG"
            alt="Kashio"
            height={200}
            width={750}
            className="w-full h-auto hidden dark:block"
            priority
          />
        </div>

        {/* What it does */}
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Kashio helps Australian employees spot possible work-related deductions in their bank transactions.
        </p>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Upload a bank CSV, review what might be deductible, note which receipts you have on hand, and download a tidy summary at tax time.
        </p>

        {/* How it works */}
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">How it works</p>
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">1</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Import your bank transactions</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload a CSV exported from your bank. Kashio scans every transaction and flags the ones that look work-related.</p>
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

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/import"
            className="inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Import your bank CSV
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          Kashio does not give tax advice. Always check with a registered tax agent for your specific situation.
        </p>

      </div>
    </main>
  );
}
