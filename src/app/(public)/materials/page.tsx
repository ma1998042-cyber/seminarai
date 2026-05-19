import { FileText } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { getPublishedResources } from "@/lib/db/queries/resources";
import type { Metadata } from "next";
import ResourceDownloadCard from "./ResourceDownloadCard";

export const metadata: Metadata = {
  title: "お役立ち資料 | SeminarAI",
  description: "セミナー運営に役立つ資料をご紹介します",
};

export default async function PublicResourcesPage() {
  const db = getDbFromContext();
  const items = await getPublishedResources(db);

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">お役立ち資料</h1>
          <p className="text-gray-500">セミナー運営に役立つ資料をご紹介します</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">現在公開中の資料はありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <ResourceDownloadCard
                key={item.id}
                resource={{
                  id: item.id,
                  title: item.title,
                  description: item.description || "",
                  imageUrl: item.imageUrl || "",
                  hasFile: !!item.fileUrl,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
