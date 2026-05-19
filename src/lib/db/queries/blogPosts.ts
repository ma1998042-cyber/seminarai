import { eq, and, desc, asc } from "drizzle-orm";
import { blogPosts, blogCategories, blogPostCategories } from "../schema";
import type { Database } from "..";

// =============================================
// Blog Posts
// =============================================

export async function getBlogPosts(db: Database, orgId: string) {
  return db.query.blogPosts.findMany({
    where: eq(blogPosts.organizationId, orgId),
    with: { postCategories: { with: { category: true } }, author: true },
    orderBy: [desc(blogPosts.createdAt)],
  });
}

export async function getBlogPost(db: Database, orgId: string, id: string) {
  return db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.id, id), eq(blogPosts.organizationId, orgId)),
    with: { postCategories: { with: { category: true } }, author: true },
  });
}

export async function getPublishedBlogPosts(db: Database, orgId: string) {
  return db.query.blogPosts.findMany({
    where: and(eq(blogPosts.organizationId, orgId), eq(blogPosts.status, "published")),
    with: { postCategories: { with: { category: true } }, author: true },
    orderBy: [desc(blogPosts.publishedAt)],
  });
}

export async function getPublishedBlogPostBySlug(db: Database, orgId: string, slug: string) {
  return db.query.blogPosts.findFirst({
    where: and(
      eq(blogPosts.organizationId, orgId),
      eq(blogPosts.slug, slug),
      eq(blogPosts.status, "published"),
    ),
    with: { postCategories: { with: { category: true } }, author: true },
  });
}

export async function createBlogPost(
  db: Database,
  data: typeof blogPosts.$inferInsert,
) {
  const [post] = await db.insert(blogPosts).values(data).returning();
  return post;
}

export async function updateBlogPost(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof blogPosts.$inferInsert, "id" | "organizationId">>,
) {
  const [post] = await db
    .update(blogPosts)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(blogPosts.id, id), eq(blogPosts.organizationId, orgId)))
    .returning();
  return post;
}

export async function deleteBlogPost(db: Database, orgId: string, id: string) {
  await db
    .delete(blogPosts)
    .where(and(eq(blogPosts.id, id), eq(blogPosts.organizationId, orgId)));
}

// =============================================
// Blog Categories
// =============================================

export async function getBlogCategories(db: Database, orgId: string) {
  return db.query.blogCategories.findMany({
    where: eq(blogCategories.organizationId, orgId),
    orderBy: [asc(blogCategories.sortOrder)],
  });
}

export async function createBlogCategory(
  db: Database,
  data: typeof blogCategories.$inferInsert,
) {
  const [cat] = await db.insert(blogCategories).values(data).returning();
  return cat;
}

export async function updateBlogCategory(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof blogCategories.$inferInsert, "id" | "organizationId">>,
) {
  const [cat] = await db
    .update(blogCategories)
    .set(data)
    .where(and(eq(blogCategories.id, id), eq(blogCategories.organizationId, orgId)))
    .returning();
  return cat;
}

export async function deleteBlogCategory(db: Database, orgId: string, id: string) {
  await db
    .delete(blogCategories)
    .where(and(eq(blogCategories.id, id), eq(blogCategories.organizationId, orgId)));
}

// =============================================
// Blog Post Categories (中間テーブル)
// =============================================

export async function setBlogPostCategories(
  db: Database,
  postId: string,
  categoryIds: string[],
) {
  await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, postId));
  if (categoryIds.length > 0) {
    await db.insert(blogPostCategories).values(
      categoryIds.map((categoryId) => ({ postId, categoryId })),
    );
  }
}
