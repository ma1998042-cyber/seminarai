import Link from "next/link";
import PublicHeader from "./PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy"
              className="transition-colors hover:text-indigo-600"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-indigo-600"
            >
              利用規約
            </Link>
            <Link
              href="/legal"
              className="transition-colors hover:text-indigo-600"
            >
              特定商取引法に基づく表記
            </Link>
          </nav>
          <p>&copy; 2026 SeminarAI</p>
        </div>
      </footer>
    </div>
  );
}
