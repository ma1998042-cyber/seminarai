import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getService } from "@/lib/db/queries/services";
import ServiceEditForm from "./ServiceEditForm";

export default async function ServiceEditPage({
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

  const service = await getService(db, orgId, id);
  if (!service) notFound();

  return (
    <ServiceEditForm
      service={{
        id: service.id,
        title: service.title,
        description: service.description || "",
        imageUrl: service.imageUrl || "",
        inquiryUrl: service.inquiryUrl || "",
        sortOrder: service.sortOrder,
        isPublished: service.isPublished,
      }}
    />
  );
}
