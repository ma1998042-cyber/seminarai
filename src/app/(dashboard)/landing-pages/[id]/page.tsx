import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getLandingPage, getLpSubmissionCount } from "@/lib/db/queries/landingPages";
import LandingPageEditForm from "./LandingPageEditForm";

export default async function LandingPageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const lp = await getLandingPage(db, orgId, id);
  if (!lp) notFound();

  const submissionCount = await getLpSubmissionCount(db, lp.id);

  return (
    <LandingPageEditForm
      lp={{
        id: lp.id,
        title: lp.title,
        slug: lp.slug,
        description: lp.description,
        bodyHtml: lp.bodyHtml,
        heroImageUrl: lp.heroImageUrl,
        formFields: lp.formFields,
        ctaText: lp.ctaText,
        thankYouMessage: lp.thankYouMessage,
        isPublished: lp.isPublished,
        metaTitle: lp.metaTitle,
        metaDescription: lp.metaDescription,
        ogImageUrl: lp.ogImageUrl,
      }}
      submissionCount={submissionCount}
    />
  );
}
