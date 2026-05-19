import Link from "next/link";
import { getDbFromContext } from "@/lib/db";
import { getPublishedBlogPostsByCategory } from "@/lib/db/queries/blogPosts";
import { FileText, ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const db = getDbFromContext();
  const { posts, categoryName } = await getPublishedBlogPostsByCategory(db, slug);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 戻るリンク */}
        <Link
          href="/articles"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          ブログ一覧に戻る
        </Link>

        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {categoryName ? `${categoryName}` : "カテゴリ"}
          </h1>
          <p className="text-gray-500">
            {categoryName
              ? `「${categoryName}」カテゴリの記事一覧`
              : "該当カテゴリの記事一覧"}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              このカテゴリの記事はまだありません
            </h2>
            <p className="text-gray-400">
              新しい記事が公開されるまでお待ちください
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => {
              const categories = post.postCategories?.map(
                (pc: { category: { name: string; slug: string } }) => pc.category
              ) ?? [];

              return (
                <Link
                  key={post.id}
                  href={`/articles/${post.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* サムネイル */}
                  <div className="relative w-full aspect-video bg-gray-100">
                    {post.thumbnailUrl ? (
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-indigo-200" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {/* カテゴリ */}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {categories.map((cat: { name: string; slug: string }) => (
                          <span
                            key={cat.slug}
                            className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-3 mb-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString("ja-JP")}
                        </time>
                      )}
                      {post.author?.fullName && (
                        <>
                          <span>|</span>
                          <span>{post.author.fullName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
