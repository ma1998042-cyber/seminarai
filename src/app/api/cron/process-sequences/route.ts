import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import {
  stepCampaigns,
  stepCampaignSteps,
  stepCampaignEnrollments,
  customers,
  emailSends,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { addTrackingPixel, rewriteLinks } from "@/lib/email/tracking";

export async function GET(request: NextRequest) {
  // 認証: CRON_SECRET で照合
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDbFromContext();
  const now = new Date();

  try {
    // status='active' のステップキャンペーンを取得
    const activeCampaigns = await db
      .select()
      .from(stepCampaigns)
      .where(eq(stepCampaigns.status, "active"));

    const results: {
      campaignId: string;
      campaignName: string;
      sent: number;
      failed: number;
      completed: number;
    }[] = [];

    let totalProcessed = 0;

    for (const campaign of activeCampaigns) {
      try {
        // キャンペーンのステップを stepNumber 順で取得
        const steps = await db
          .select()
          .from(stepCampaignSteps)
          .where(eq(stepCampaignSteps.stepCampaignId, campaign.id))
          .orderBy(asc(stepCampaignSteps.stepNumber));

        if (steps.length === 0) continue;

        // status='active' のエンロールメントを顧客情報と共に取得
        const enrollments = await db
          .select({
            enrollment: stepCampaignEnrollments,
            customerEmail: customers.email,
          })
          .from(stepCampaignEnrollments)
          .innerJoin(
            customers,
            eq(stepCampaignEnrollments.customerId, customers.id),
          )
          .where(
            and(
              eq(stepCampaignEnrollments.stepCampaignId, campaign.id),
              eq(stepCampaignEnrollments.status, "active"),
            ),
          );

        let sentCount = 0;
        let failedCount = 0;
        let completedCount = 0;

        for (const { enrollment, customerEmail } of enrollments) {
          // currentStep に対応するステップを取得
          // currentStep は次に送信すべきステップのインデックス（0始まり）
          const currentStepIndex = enrollment.currentStep;
          if (currentStepIndex >= steps.length) {
            // 全ステップ完了済み → completed に更新
            await db
              .update(stepCampaignEnrollments)
              .set({ status: "completed" })
              .where(eq(stepCampaignEnrollments.id, enrollment.id));
            completedCount++;
            continue;
          }

          const step = steps[currentStepIndex];

          // enrolledAt からの経過日数を計算
          const enrolledAt = new Date(enrollment.enrolledAt);
          const diffMs = now.getTime() - enrolledAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          // delayDays に達していなければスキップ
          if (diffDays < step.delayDays) continue;

          try {
            const baseUrl = new URL(request.url).origin;

            // 先に pending で insert して id を取得
            const sendRecord = await db
              .insert(emailSends)
              .values({
                campaignId: campaign.id,
                organizationId: campaign.organizationId,
                customerId: enrollment.customerId,
                email: customerEmail,
                status: "pending",
              })
              .returning({ id: emailSends.id });

            const sendId = sendRecord[0].id;

            // トラッキング付きHTMLを生成
            let trackedHtml = addTrackingPixel(step.bodyHtml, sendId, baseUrl);
            trackedHtml = rewriteLinks(trackedHtml, sendId, baseUrl);

            // メール送信
            await sendEmail(customerEmail, step.subject, trackedHtml);

            // 成功 → sent に更新
            await db
              .update(emailSends)
              .set({ status: "sent", sentAt: new Date().toISOString() })
              .where(eq(emailSends.id, sendId));

            // currentStep をインクリメント
            const nextStep = currentStepIndex + 1;

            if (nextStep >= steps.length) {
              // 全ステップ完了
              await db
                .update(stepCampaignEnrollments)
                .set({
                  currentStep: nextStep,
                  status: "completed",
                })
                .where(eq(stepCampaignEnrollments.id, enrollment.id));
              completedCount++;
            } else {
              await db
                .update(stepCampaignEnrollments)
                .set({ currentStep: nextStep })
                .where(eq(stepCampaignEnrollments.id, enrollment.id));
            }

            sentCount++;
          } catch (err) {
            // 送信失敗時はエンロールメントを止めない（次回再試行）
            console.error(
              `Step send failed: campaign=${campaign.id}, enrollment=${enrollment.id}`,
              err,
            );
            failedCount++;
          }
        }

        totalProcessed += sentCount + failedCount;

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          sent: sentCount,
          failed: failedCount,
          completed: completedCount,
        });
      } catch (error) {
        console.error(
          `Step campaign ${campaign.id} processing error:`,
          error,
        );
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          sent: 0,
          failed: 0,
          completed: 0,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      results,
    });
  } catch (error) {
    console.error("Cron process-sequences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
