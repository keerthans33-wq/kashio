import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="text-3xl font-semibold text-gray-900">Kashio</h1>
      <p className="mt-3 text-gray-500">Australian tax deduction tracker</p>
      <Link
        href="/import"
        className="mt-8 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
      >
        Get started
      </Link>
    </main>
  );
}
