import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getBlogPost, getBlogCategories } from "@/lib/db/queries/blogPosts";
import BlogPostEditForm from "./BlogPostEditForm";

export default async function BlogPostEditPage({
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

  const [post, categories] = await Promise.all([
    getBlogPost(db, orgId, id),
    getBlogCategories(db, orgId),
  ]);

  if (!post) notFound();

  const postData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    bodyHtml: post.bodyHtml || "",
    excerpt: post.excerpt || "",
    thumbnailUrl: post.thumbnailUrl || "",
    status: post.status,
    publishedAt: post.publishedAt || "",
    metaTitle: post.metaTitle || "",
    metaDescription: post.metaDescription || "",
    ogImageUrl: post.ogImageUrl || "",
    categoryIds: post.postCategories?.map((pc) => pc.category?.id).filter(Boolean) as string[],
  };

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return <BlogPostEditForm post={postData} categories={categoryList} />;
}
