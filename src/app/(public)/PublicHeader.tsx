"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/events/public", label: "イベント一覧" },
  { href: "/case-studies", label: "事例一覧" },
  { href: "/articles", label: "ブログ" },
  { href: "/materials", label: "お役立ち資料" },
  { href: "/about", label: "運営者情報" },
] as const;

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6 lg:px-12">
        <Link
          href="/events/public"
          className="text-lg font-bold tracking-tight text-gray-900"
        >
          ひとり社長サロン
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-indigo-600"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href="https://line-harness.foritemaqua.workers.dev/r/e59f44b7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            無料相談
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setOpen(!open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://line-harness.foritemaqua.workers.dev/r/e59f44b7"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => setOpen(false)}
            >
              無料相談
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
