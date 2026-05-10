"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  CalendarDays,
  ClipboardList,
  Users,
  Mail,
  Settings,
  ChevronDown,
  Building2,
  CreditCard,
  UserCircle,
} from "lucide-react";
import { cn, getInitials, PLAN_COLORS } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface SidebarProps {
  user: User;
  profile: any;
  organization: any;
  memberships: any[];
}

const navItems = [
  { href: "/events", icon: CalendarDays, label: "イベント管理" },
  { href: "/surveys", icon: ClipboardList, label: "アンケート管理" },
  { href: "/customers", icon: Users, label: "顧客管理" },
  { href: "/campaigns", icon: Mail, label: "メルマガ配信" },
];

const settingsItems = [
  { href: "/settings/organization", icon: Building2, label: "組織設定" },
  { href: "/settings/members", icon: Users, label: "メンバー" },
  { href: "/settings/billing", icon: CreditCard, label: "プラン・課金" },
  { href: "/settings/profile", icon: UserCircle, label: "プロフィール" },
];

export default function Sidebar({ user, profile, organization, memberships }: SidebarProps) {
  const pathname = usePathname();

  const planName = organization?.plans?.name || "free";
  const planDisplay = organization?.plans?.display_name || "Free";

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo + Org switcher */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">SeminarFlow</span>
        </div>

        {/* Organization selector */}
        {organization ? (
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-700">
                    {getInitials(organization.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{organization.name}</p>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", PLAN_COLORS[planName])}>
                    {planDisplay}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        ) : (
          <Link
            href="/onboarding"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2.5 transition-colors"
          >
            <div className="w-7 h-7 bg-indigo-200 rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm text-indigo-700 font-medium">組織を作成する</span>
          </Link>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="mb-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Settings section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            設定
          </p>
          {settingsItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info at bottom */}
      <div className="p-3 border-t border-gray-100">
        <Link
          href="/settings/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-indigo-700">
              {getInitials(profile?.full_name || user.email || "U")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || "ユーザー"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
