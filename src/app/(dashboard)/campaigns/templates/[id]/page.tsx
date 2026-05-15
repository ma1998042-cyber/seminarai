import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Send } from "lucide-react";
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
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/campaigns/new?template=${tmpl.id}`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Send className="w-4 h-4" />
          この内容で配信作成
        </Link>
      </div>
      <TemplateForm
        initial={{
          id: tmpl.id,
          name: tmpl.name,
          subject: tmpl.subject,
          preview_text: tmpl.previewText ?? "",
          body_html: tmpl.bodyHtml,
        }}
      />
    </div>
  );
}
