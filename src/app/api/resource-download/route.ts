import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { resources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createDownloadLead } from "@/lib/db/queries/resourceDownloadLeads";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resourceId, name, email, proficiencyLevel, goals, jobDescription } = body;

  if (!resourceId || !name?.trim() || !email?.trim() || !proficiencyLevel || !goals?.trim() || !jobDescription?.trim()) {
    return NextResponse.json({ error: "すべての項目を入力してください" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }

  const db = getDbFromContext();

  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, resourceId), eq(resources.isPublished, true)),
  });

  if (!resource || !resource.fileUrl) {
    return NextResponse.json({ error: "資料が見つかりません" }, { status: 404 });
  }

  await createDownloadLead(db, {
    resourceId,
    name: name.trim(),
    email: email.trim(),
    proficiencyLevel,
    goals: goals.trim(),
    jobDescription: jobDescription.trim(),
  });

  return NextResponse.json({ fileUrl: resource.fileUrl });
}
