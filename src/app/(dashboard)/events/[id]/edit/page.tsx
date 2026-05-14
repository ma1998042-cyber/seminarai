import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById } from "@/lib/db/queries/events";
import EventEditForm from "./EventEditForm";

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const event = await getEventById(db, orgId, id);
  if (!event) notFound();

  return (
    <EventEditForm
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        isOnline: event.isOnline,
        onlineUrl: event.onlineUrl,
        capacity: event.capacity,
        status: event.status,
        visibility: event.visibility,
        thumbnailUrl: event.thumbnailUrl,
      }}
    />
  );
}
