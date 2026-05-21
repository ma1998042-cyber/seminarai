import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getWorkshopContent } from "@/lib/db/queries/workshopContents";
import ContentEditForm from "./ContentEditForm";

export default async function ContentEditPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string }>;
}) {
  const { id: eventId, contentId } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const content = await getWorkshopContent(db, orgId, contentId);
  if (!content) notFound();

  return (
    <ContentEditForm
      eventId={eventId}
      content={{
        id: content.id,
        title: content.title,
        description: content.description || "",
        contentType: content.contentType,
        fileUrl: content.fileUrl || "",
        sortOrder: content.sortOrder,
        isPublished: !!content.isPublished,
      }}
    />
  );
}
