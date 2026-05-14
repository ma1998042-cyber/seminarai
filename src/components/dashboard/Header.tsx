"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user: { id: string; email: string; name?: string | null };
  profile: any;
  organization: any;
}

export default function Header({ user, profile, organization }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div>
        {organization && (
          <p className="text-sm text-gray-500">{organization.name}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-indigo-700">
                {getInitials(profile?.full_name || user.email || "U")}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {profile?.full_name || user.email}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
