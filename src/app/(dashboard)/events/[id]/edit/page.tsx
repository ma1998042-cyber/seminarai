import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById } from "@/lib/db/queries/events";
import { surveys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  // 申し込みアンケートの存在チェック
  const registrationSurvey = await db.query.surveys.findFirst({
    where: and(
      eq(surveys.eventId, event.id),
      eq(surveys.category, "registration"),
    ),
  });
  const hasRegistrationSurvey = !!registrationSurvey;

  // イベントに紐づくアンケート一覧を取得
  const eventSurveys = await db.query.surveys.findMany({
    where: eq(surveys.eventId, event.id),
  });

  return (
    <EventEditForm
      hasRegistrationSurvey={hasRegistrationSurvey}
      eventSurveys={eventSurveys.map(s => ({ id: s.id, title: s.title, category: s.category, isPublic: s.isPublic }))}
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
        imageUrls: (event.imageUrls as string[]) || [],
        showRemainingCapacity: event.showRemainingCapacity,
        participationRequirements: event.participationRequirements,
        registrationDeadline: event.registrationDeadline,
        reminderEnabled: event.reminderEnabled,
        reminderDays: event.reminderDays,
      }}
    />
  );
}
