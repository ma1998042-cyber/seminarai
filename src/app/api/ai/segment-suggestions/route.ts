import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, sql, count, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import {
  customers,
  customerTags,
  tags,
  emailSends,
  events,
} from "@/lib/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type SegmentSuggestion = {
  id: string;
  segmentName: string;
  description: string;
  customerCount: number;
  emailSuggestion: string;
  subjectLine: string;
  targetTagIds: string[];
  targetTagNames: string[];
  priority: "high" | "medium" | "low";
};

export type SegmentSuggestionsResponse = {
  suggestions: SegmentSuggestion[];
  generatedAt: string;
};

export async function GET() {
  // Authentication
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDbFromContext();
  const profile = await getUserProfile(db, session.user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) {
    return NextResponse.json({ error: "組織が選択されていません" }, { status: 400 });
  }

  // Get ANTHROPIC_API_KEY
  const { env } = getCloudflareContext();
  const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  try {
    // 1. Aggregate customer data
    const [
      totalCustomersResult,
      tagDistribution,
      emailStats,
      eventParticipation,
      recentEvents,
    ] = await Promise.all([
      // Total customer count
      db
        .select({ count: count() })
        .from(customers)
        .where(eq(customers.organizationId, orgId)),

      // Tag distribution: tag name, color, and customer count
      db
        .select({
          tagId: tags.id,
          tagName: tags.name,
          tagColor: tags.color,
          customerCount: count(customerTags.customerId).as("customer_count"),
        })
        .from(tags)
        .leftJoin(customerTags, eq(tags.id, customerTags.tagId))
        .where(eq(tags.organizationId, orgId))
        .groupBy(tags.id, tags.name, tags.color),

      // Email open/click rates overall
      db
        .select({
          totalSent: count().as("total_sent"),
          opened: sql<number>`sum(case when ${emailSends.openedAt} is not null then 1 else 0 end)`.as("opened"),
          clicked: sql<number>`sum(case when ${emailSends.clickedAt} is not null then 1 else 0 end)`.as("clicked"),
        })
        .from(emailSends)
        .where(eq(emailSends.organizationId, orgId)),

      // Event participation counts (top events)
      db
        .select({
          eventId: events.id,
          eventTitle: events.title,
          registrationCount: events.registrationCount,
          status: events.status,
        })
        .from(events)
        .where(eq(events.organizationId, orgId))
        .orderBy(sql`${events.registrationCount} desc`)
        .limit(10),

      // Recent events (for context)
      db
        .select({
          title: events.title,
          status: events.status,
          startDate: events.startDate,
          registrationCount: events.registrationCount,
        })
        .from(events)
        .where(eq(events.organizationId, orgId))
        .orderBy(sql`${events.createdAt} desc`)
        .limit(5),
    ]);

    const totalCustomers = totalCustomersResult[0]?.count ?? 0;

    if (totalCustomers === 0) {
      return NextResponse.json({
        suggestions: [],
        generatedAt: new Date().toISOString(),
      });
    }

    const totalSent = Number(emailStats[0]?.totalSent) || 0;
    const totalOpened = Number(emailStats[0]?.opened) || 0;
    const totalClicked = Number(emailStats[0]?.clicked) || 0;
    const overallOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const overallClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

    // Build aggregated data summary for Claude
    const dataSummary = {
      totalCustomers,
      tagDistribution: tagDistribution.map((t) => ({
        tagId: t.tagId,
        tagName: t.tagName,
        customerCount: Number(t.customerCount),
      })),
      emailPerformance: {
        totalSent,
        overallOpenRate: `${overallOpenRate}%`,
        overallClickRate: `${overallClickRate}%`,
      },
      eventParticipation: eventParticipation.map((e) => ({
        title: e.eventTitle,
        registrationCount: e.registrationCount,
        status: e.status,
      })),
      recentEvents: recentEvents.map((e) => ({
        title: e.title,
        status: e.status,
        startDate: e.startDate,
        registrationCount: e.registrationCount,
      })),
    };

    // 2. Call Claude API via fetch
    const prompt = `あなたはセミナー・イベント運営CRMの顧客マーケティング分析AIアシスタントです。
以下の顧客データの集計結果をもとに、効果的なメール配信のための顧客セグメント提案を3〜5個生成してください。

## 顧客データ集計

${JSON.stringify(dataSummary, null, 2)}

## 出力形式

以下のJSON配列形式で出力してください。余分なテキストは不要です。JSONのみを出力してください。

\`\`\`json
[
  {
    "segmentName": "セグメント名（日本語、簡潔に）",
    "description": "このセグメントの説明（30文字程度）",
    "emailSuggestion": "このセグメントに送るべきメールの内容提案（50-100文字）",
    "subjectLine": "提案する件名（30文字以内）",
    "targetTagNames": ["対象タグ名1", "対象タグ名2"],
    "priority": "high | medium | low"
  }
]
\`\`\`

## ルール
- タグ分布データに存在するタグ名のみを targetTagNames に含めてください
- タグがない場合やタグに紐づかないセグメントの場合は targetTagNames を空配列にしてください
- priority は顧客数やメール効果を考慮して設定してください
- 日本語で出力してください
- 実用的で具体的な提案を心がけてください`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errBody);
      return NextResponse.json(
        { error: "AI分析の実行に失敗しました" },
        { status: 502 }
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage =
      claudeData.content?.[0]?.text ?? "";

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = assistantMessage;
    const codeBlockMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let rawSuggestions: Array<{
      segmentName: string;
      description: string;
      emailSuggestion: string;
      subjectLine: string;
      targetTagNames: string[];
      priority: "high" | "medium" | "low";
    }>;

    try {
      rawSuggestions = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Claude response:", assistantMessage);
      return NextResponse.json(
        { error: "AI応答の解析に失敗しました" },
        { status: 502 }
      );
    }

    // Build tag name -> id/count map
    const tagMap = new Map(
      tagDistribution.map((t) => [
        t.tagName,
        { id: t.tagId, count: Number(t.customerCount) },
      ])
    );

    // Enrich suggestions with IDs and customer counts
    const suggestions: SegmentSuggestion[] = rawSuggestions.map((s, i) => {
      const matchedTags = (s.targetTagNames || [])
        .filter((name) => tagMap.has(name));
      const tagIds = matchedTags.map((name) => tagMap.get(name)!.id);
      const customerCount = matchedTags.length > 0
        ? matchedTags.reduce((sum, name) => sum + tagMap.get(name)!.count, 0)
        : totalCustomers;

      return {
        id: `seg-${Date.now()}-${i}`,
        segmentName: s.segmentName,
        description: s.description,
        customerCount,
        emailSuggestion: s.emailSuggestion,
        subjectLine: s.subjectLine,
        targetTagIds: tagIds,
        targetTagNames: matchedTags,
        priority: s.priority || "medium",
      };
    });

    return NextResponse.json({
      suggestions,
      generatedAt: new Date().toISOString(),
    } satisfies SegmentSuggestionsResponse);
  } catch (error) {
    console.error("Segment suggestions error:", error);
    return NextResponse.json(
      { error: "セグメント提案の生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
