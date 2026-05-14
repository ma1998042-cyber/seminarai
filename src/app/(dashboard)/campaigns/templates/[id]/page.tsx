import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { eq } from "drizzle-orm";
import { emailTemplates } from "@/lib/db/schema";
import { TemplateForm } from "../new/page";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const tmpl = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, id),
  });
  if (!tmpl) notFound();

  return (
    <TemplateForm
      initial={{
        id: tmpl.id,
        name: tmpl.name,
        subject: tmpl.subject,
        preview_text: tmpl.previewText ?? "",
        body_html: tmpl.bodyHtml,
      }}
    />
  );
}
