import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getTagsWithCount } from "@/lib/db/queries/tags";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TagsClient from "./TagsClient";

export default async function TagsPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/dashboard");

  const tagsWithCount = await getTagsWithCount(db, orgId);

  // Transform to match the expected shape for TagsClient
  const tags = tagsWithCount.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    is_auto: t.isAuto,
    customer_tags: [{ count: t.customerTags.length }],
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
          <p className="text-sm text-gray-500">顧客を分類するタグを作成・管理します</p>
        </div>
      </div>
      <TagsClient initialTags={tags ?? []} />
    </div>
  );
}
