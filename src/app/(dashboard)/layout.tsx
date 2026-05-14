import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getOrganizationById, getUserOrganizations } from "@/lib/db/queries/organizations";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = getAuth();
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const user = session?.user;

  if (!user) {
    redirect("/auth/login");
  }

  const db = getDbFromContext();

  // Get user profile
  const profile = await getUserProfile(db, user.id);

  // Get current organization (with plan)
  let organization = null;
  if (profile?.currentOrganizationId) {
    organization = await getOrganizationById(db, profile.currentOrganizationId);
  }

  // Get all user organizations
  const memberships = await getUserOrganizations(db, user.id);

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
