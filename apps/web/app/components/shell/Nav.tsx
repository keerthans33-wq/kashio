import Link from "next/link";

const links = [
  { href: "/import", label: "1. Import" },
  { href: "/review", label: "2. Review" },
  { href: "/export", label: "3. Export" },
];

export default function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex h-14 items-center gap-8">
          <Link href="/import" className="font-semibold text-gray-900">
            Kashio
          </Link>
          <div className="flex gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
