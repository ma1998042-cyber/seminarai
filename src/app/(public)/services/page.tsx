import { Layers } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { getAllPublishedServices } from "@/lib/db/queries/services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サービス一覧 | SeminarAI",
  description: "提供サービスをご紹介します",
};

export default async function PublicServicesPage() {
  const db = getDbFromContext();
  const services = await getAllPublishedServices(db);

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">サービス一覧</h1>
          <p className="text-gray-500">提供サービスをご紹介します</p>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-20">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">現在公開中のサービスはありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {service.imageUrl ? (
                  <div className="w-full aspect-video bg-gray-100">
                    <img
                      src={service.imageUrl}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                    <Layers className="w-12 h-12 text-indigo-200" />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    {service.title}
                  </h2>
                  {service.description && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                      {service.description}
                    </p>
                  )}
                  {service.inquiryUrl && (
                    <a
                      href={service.inquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 w-full"
                    >
                      お問い合わせ
                    </a>
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
