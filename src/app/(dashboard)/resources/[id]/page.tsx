import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getResource } from "@/lib/db/queries/resources";
import ResourceEditForm from "./ResourceEditForm";

export default async function ResourceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const resource = await getResource(db, orgId, id);
  if (!resource) notFound();

  return (
    <ResourceEditForm
      resource={{
        id: resource.id,
        title: resource.title,
        description: resource.description || "",
        imageUrl: resource.imageUrl || "",
        sortOrder: resource.sortOrder,
        isPublished: resource.isPublished,
      }}
    />
  );
}
