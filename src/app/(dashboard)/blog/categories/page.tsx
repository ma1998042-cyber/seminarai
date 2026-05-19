import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getBlogCategories } from "@/lib/db/queries/blogPosts";
import BlogCategoryManager from "./BlogCategoryManager";

export default async function BlogCategoriesPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const categories = await getBlogCategories(db, orgId);

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sortOrder: c.sortOrder,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          ブログ管理に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">カテゴリ管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          ブログ記事のカテゴリを管理します
        </p>
      </div>

      <BlogCategoryManager initialCategories={categoryList} />
    </div>
  );
}
