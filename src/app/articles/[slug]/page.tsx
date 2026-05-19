import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDbFromContext } from "@/lib/db";
import { getPublishedBlogPostBySlugPublic } from "@/lib/db/queries/blogPosts";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = getDbFromContext();
  const post = await getPublishedBlogPostBySlugPublic(db, slug);

  if (!post) {
    return { title: "記事が見つかりません" };
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      images: post.ogImageUrl
        ? [{ url: post.ogImageUrl }]
        : post.thumbnailUrl
          ? [{ url: post.thumbnailUrl }]
          : undefined,
      type: "article",
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const db = getDbFromContext();
  const post = await getPublishedBlogPostBySlugPublic(db, slug);

  if (!post) {
    notFound();
  }

  const categories =
    post.postCategories?.map(
      (pc: { category: { name: string; slug: string } }) => pc.category
    ) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto">
        {/* 戻るリンク */}
        <Link
          href="/articles"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          ブログ一覧に戻る
        </Link>

        {/* サムネイル */}
        {post.thumbnailUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-8 bg-gray-100">
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* カテゴリ */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat: { name: string; slug: string }) => (
              <Link
                key={cat.slug}
                href={`/articles/category/${cat.slug}`}
                className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* タイトル */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {/* メタ情報 */}
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-200">
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

        {/* 本文 */}
        {post.bodyHtml && (
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
        )}
      </article>
    </div>
  );
}
