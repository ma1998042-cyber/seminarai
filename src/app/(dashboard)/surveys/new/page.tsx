import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEvents } from "@/lib/db/queries/events";
import NewSurveyForm from "./NewSurveyForm";

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const { event_id } = await searchParams;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/dashboard");

  const eventsList = await getEvents(db, orgId);

  return <NewSurveyForm events={eventsList.map(e => ({ id: e.id, title: e.title }))} defaultEventId={event_id} />;
}
