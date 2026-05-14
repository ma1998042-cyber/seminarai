import { eq, and, sql } from "drizzle-orm";
import { surveys, surveyQuestions, surveyResponses } from "../schema";
import type { Database } from "..";

// =============================================
// アンケート CRUD（組織スコープ付き）
// =============================================

export async function getSurveys(db: Database, orgId: string) {
  return db.query.surveys.findMany({
    where: eq(surveys.organizationId, orgId),
    orderBy: (surveys, { desc }) => [desc(surveys.createdAt)],
  });
}

export async function getSurveyById(db: Database, id: string) {
  return db.query.surveys.findFirst({
    where: eq(surveys.id, id),
    with: {
      questions: {
        orderBy: (q, { asc }) => [asc(q.sortOrder)],
      },
    },
  });
}

export async function createSurvey(
  db: Database,
  data: {
    organizationId: string;
    eventId?: string;
    title: string;
    description?: string;
    status?: string;
    isAnonymous?: boolean;
    thankYouMessage?: string;
    redirectUrl?: string;
    settings?: Record<string, unknown>;
    createdBy?: string;
  },
) {
  const [survey] = await db.insert(surveys).values(data).returning();
  return survey;
}

export async function updateSurvey(
  db: Database,
  id: string,
  data: Partial<{
    eventId: string | null;
    title: string;
    description: string | null;
    status: string;
    isAnonymous: boolean;
    thankYouMessage: string | null;
    redirectUrl: string | null;
    settings: Record<string, unknown>;
    responseCount: number;
    publishedAt: string | null;
    closedAt: string | null;
  }>,
) {
  const [survey] = await db
    .update(surveys)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(surveys.id, id))
    .returning();
  return survey;
}

// =============================================
// 設問
// =============================================

export async function getSurveyQuestions(db: Database, surveyId: string) {
  return db.query.surveyQuestions.findMany({
    where: eq(surveyQuestions.surveyId, surveyId),
    orderBy: (q, { asc }) => [asc(q.sortOrder)],
  });
}

export async function createSurveyQuestions(
  db: Database,
  surveyId: string,
  questions: {
    sortOrder: number;
    questionType: string;
    title: string;
    description?: string;
    isRequired?: boolean;
    options?: unknown[] | null;
    settings?: Record<string, unknown>;
  }[],
) {
  if (questions.length === 0) return [];

  const values = questions.map((q) => ({
    ...q,
    surveyId,
  }));

  return db.insert(surveyQuestions).values(values).returning();
}

export async function deleteSurveyQuestions(db: Database, surveyId: string) {
  return db
    .delete(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .returning();
}

// =============================================
// 回答
// =============================================

export async function getSurveyResponses(db: Database, surveyId: string) {
  return db.query.surveyResponses.findMany({
    where: eq(surveyResponses.surveyId, surveyId),
    orderBy: (r, { desc }) => [desc(r.submittedAt)],
  });
}

export async function createSurveyResponse(
  db: Database,
  data: {
    surveyId: string;
    organizationId: string;
    customerId?: string;
    respondentEmail?: string;
    respondentName?: string;
    answers: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const [response] = await db.insert(surveyResponses).values(data).returning();
  return response;
}

export async function incrementSurveyResponseCount(db: Database, surveyId: string) {
  const [survey] = await db
    .update(surveys)
    .set({
      responseCount: sql`${surveys.responseCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(surveys.id, surveyId))
    .returning();
  return survey;
}
