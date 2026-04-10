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

        {/* Hero */}
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 text-center">
          Find tax deductions in your everyday spending
        </h1>
        <p className="mt-4 text-base text-gray-500 dark:text-gray-400 text-center">
          Upload your bank transactions and Kashio flags what looks work-related — ready to review and export at tax time.
        </p>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/import"
            className="rounded-lg bg-violet-600 px-8 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Get started
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-center text-gray-400 dark:text-gray-500">
          Kashio suggests possible deductions — it's not a tax adviser. Check with your accountant before lodging.
        </p>

      </div>
    </main>
  );
}
