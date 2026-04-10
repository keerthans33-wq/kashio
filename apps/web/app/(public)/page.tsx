import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Supabase sometimes sends the ?code= to the Site URL (root) instead of
// /auth/callback. Forward it so the callback handler can exchange it.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${code}`);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-gray-900">
      <div className="w-full max-w-lg space-y-16">

        {/* Hero */}
        <div className="text-center">
          <div className="flex justify-center">
            <Image src="/kashio - 1.PNG" alt="Kashio" height={200} width={750} className="h-14 w-auto dark:hidden" priority />
            <Image src="/kashio - 2.PNG" alt="Kashio" height={200} width={750} className="h-14 w-auto hidden dark:block" priority />
          </div>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Find tax deductions in your everyday spending
          </h1>
          <p className="mt-4 text-base text-gray-500 dark:text-gray-400">
            Upload your bank transactions and Kashio flags what looks work-related. Review and export at tax time.
          </p>
        </div>

        {/* How it works */}
        <div className="flex items-start justify-between gap-4 text-center">
          {[
            { n: "1", title: "Import your transactions" },
            { n: "2", title: "Review possible deductions" },
            { n: "3", title: "Export your report" },
          ].map(({ n, title }) => (
            <div key={n} className="flex-1">
              <span className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{n}</span>
              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-4">
          <Link href="/import" className="inline-block rounded-lg bg-violet-600 px-10 py-3.5 text-base font-semibold text-white hover:bg-violet-700 active:bg-violet-800">
            Get started
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Kashio suggests possible deductions. It's not a tax adviser. Check with your accountant before lodging.
          </p>
        </div>

      </div>
    </main>
  );
}
