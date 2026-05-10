import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TemplateForm } from "../new/page";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: tmpl } = await admin.from("email_templates").select("*").eq("id", id).single();
  if (!tmpl) notFound();

  return (
    <TemplateForm
      initial={{
        id: tmpl.id,
        name: tmpl.name,
        subject: tmpl.subject,
        preview_text: tmpl.preview_text ?? "",
        body_html: tmpl.body_html,
      }}
    />
  );
}
