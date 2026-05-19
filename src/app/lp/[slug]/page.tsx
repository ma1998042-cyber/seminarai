import { notFound } from "next/navigation";
import { getDbFromContext } from "@/lib/db";
import { getPublicLandingPage } from "@/lib/db/queries/landingPages";
import type { Metadata } from "next";
import LpForm from "./LpForm";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = getDbFromContext();
  const lp = await getPublicLandingPage(db, slug);

  if (!lp) return {};

  return {
    title: lp.metaTitle || lp.title,
    description: lp.metaDescription || lp.description || undefined,
    openGraph: {
      title: lp.metaTitle || lp.title,
      description: lp.metaDescription || lp.description || undefined,
      ...(lp.ogImageUrl && { images: [{ url: lp.ogImageUrl }] }),
    },
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDbFromContext();
  const lp = await getPublicLandingPage(db, slug);

  if (!lp) {
    notFound();
  }

  const formFields = (lp.formFields ?? []) as FormField[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      {lp.heroImageUrl && (
        <div className="w-full bg-gray-100 flex justify-center">
          <img
            src={lp.heroImageUrl}
            alt={lp.title}
            className="w-full h-auto max-h-[60vh] object-cover"
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Title & Description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {lp.title}
            </h1>
            {lp.description && (
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {lp.description}
              </p>
            )}
          </div>
        </div>

        {/* Body HTML */}
        {lp.bodyHtml && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div
              className="p-8 prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: lp.bodyHtml }}
            />
          </div>
        )}

        {/* Form */}
        {formFields.length > 0 && (
          <LpForm
            slug={slug}
            formFields={formFields}
            ctaText={lp.ctaText}
          />
        )}
      </div>
    </div>
  );
}
