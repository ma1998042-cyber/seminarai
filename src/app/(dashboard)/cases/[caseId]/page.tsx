import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCaseStudy } from "@/lib/db/queries/caseStudies";
import CaseStudyEditForm from "./CaseStudyEditForm";

export default async function CaseStudyEditPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const caseStudy = await getCaseStudy(db, orgId, caseId);
  if (!caseStudy) notFound();

  return (
    <CaseStudyEditForm
      caseStudy={{
        id: caseStudy.id,
        title: caseStudy.title,
        imageUrl: caseStudy.imageUrl || "",
        productionPeriod: caseStudy.productionPeriod || "",
        productionCost: caseStudy.productionCost || "",
        description: caseStudy.description || "",
        sortOrder: caseStudy.sortOrder,
        isPublished: caseStudy.isPublished,
      }}
    />
  );
}
