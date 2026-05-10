import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = await createAdminClient();

  // Get user profile via admin client (bypasses RLS)
  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get current organization
  let organization = null;
  if (profile?.current_organization_id) {
    const { data } = await admin
      .from("organizations")
      .select("*, plans(*)")
      .eq("id", profile.current_organization_id)
      .single();
    organization = data;
  }

  // Get all user organizations
  const { data: memberships } = await admin
    .from("organization_members")
    .select("*, organizations(id, name, slug, logo_url)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        user={user}
        profile={profile}
        organization={organization}
        memberships={memberships || []}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} profile={profile} organization={organization} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
