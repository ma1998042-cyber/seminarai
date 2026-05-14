import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { isAdminUser } from "@/lib/db/queries/admin";
import { headers } from "next/headers";
import Link from "next/link";
import { Zap, Building2, BarChart3, CreditCard, Settings, Shield } from "lucide-react";

const adminNav = [
  { href: "/admin", icon: BarChart3, label: "概要" },
  { href: "/admin/organizations", icon: Building2, label: "契約組織" },
  { href: "/admin/plans", icon: CreditCard, label: "プラン管理" },
  { href: "/admin/revenue", icon: BarChart3, label: "売上" },
  { href: "/admin/users", icon: Shield, label: "ユーザー管理" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const isAdmin = await isAdminUser(db, user.id);
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Admin sidebar */}
      <aside className="w-60 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">SeminarFlow</span>
              <p className="text-xs text-gray-400">管理画面</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
            ← ダッシュボードに戻る
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
