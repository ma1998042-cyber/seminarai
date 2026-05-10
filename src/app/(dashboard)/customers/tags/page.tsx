import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TagsClient from "./TagsClient";

export default async function TagsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.current_organization_id;
  if (!orgId) redirect("/dashboard");

  const { data: tags } = await admin
    .from("tags")
    .select("*, customer_tags(count)")
    .eq("organization_id", orgId)
    .order("name");

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
