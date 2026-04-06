import Nav from "../components/shell/Nav";
import { AuthGuard } from "../components/shell/AuthGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <div className="flex-1">{children}</div>
      <footer className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">Early access</p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:feedback@kashio.app?subject=Kashio%20issue&body=Page%3A%20%0A%0AWhat%20happened%3A%20%0A%0AWhat%20I%20expected%3A%20"
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 underline underline-offset-2"
            >
              Report an issue
            </a>
            <a
              href="mailto:feedback@kashio.app?subject=Kashio%20feedback"
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 underline underline-offset-2"
            >
              Send feedback
            </a>
          </div>
        </div>
      </footer>
    </div>
    </AuthGuard>
  );
}
