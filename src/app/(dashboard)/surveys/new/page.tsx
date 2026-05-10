import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewSurveyForm from "./NewSurveyForm";

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const { event_id } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.current_organization_id;
  if (!orgId) redirect("/dashboard");

  const { data: events } = await admin
    .from("events")
    .select("id, title")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return <NewSurveyForm events={events ?? []} defaultEventId={event_id} />;
}
