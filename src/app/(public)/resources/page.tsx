import { FileText } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { getPublishedResources } from "@/lib/db/queries/resources";
import type { Metadata } from "next";

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
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {item.imageUrl ? (
                  <div className="w-full aspect-video bg-gray-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-indigo-200" />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    {item.title}
                  </h2>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
