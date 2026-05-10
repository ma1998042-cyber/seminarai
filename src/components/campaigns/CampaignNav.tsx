"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/campaigns", label: "配信履歴" },
  { href: "/campaigns/templates", label: "テンプレート" },
  { href: "/campaigns/sequences", label: "ステップ配信" },
];

export default function CampaignNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {tabs.map((tab) => {
        const isActive = tab.href === "/campaigns"
          ? pathname === "/campaigns"
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
