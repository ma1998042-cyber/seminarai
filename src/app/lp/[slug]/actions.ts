"use server";

import { getDbFromContext } from "@/lib/db";
import { getPublicLandingPage, createLpSubmission } from "@/lib/db/queries/landingPages";
import { customers } from "@/lib/db/schema";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export async function submitLpFormAction(
  slug: string,
  formData: Record<string, string>,
): Promise<{ error?: string; thankYouMessage?: string }> {
  const db = getDbFromContext();

  try {
    // 1. LP取得
    const lp = await getPublicLandingPage(db, slug);
    if (!lp) {
      return { error: "このページは現在公開されていません" };
    }

    const formFields = (lp.formFields ?? []) as FormField[];

    // 2. バリデーション
    for (const field of formFields) {
      if (field.required) {
        const value = formData[field.name]?.trim();
        if (!value) {
          return { error: `${field.label}は必須です` };
        }
      }
      // email形式チェック
      if (field.type === "email" && formData[field.name]?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name].trim())) {
          return { error: `${field.label}の形式が正しくありません` };
        }
      }
      // select値チェック
      if (field.type === "select" && field.options && formData[field.name]?.trim()) {
        if (!field.options.includes(formData[field.name].trim())) {
          return { error: `${field.label}の値が不正です` };
        }
      }
    }

    // 3. organizationIdを取得
    const organizationId = lp.organizationId;

    // 4. emailフィールドがあれば顧客自動登録
    let customerId: string | undefined;
    const emailField = formFields.find((f) => f.type === "email");
    const emailValue = emailField ? formData[emailField.name]?.trim() : undefined;

    if (emailValue) {
      // fullNameフィールドを探す（name="name" or name="fullName" or type="text"の最初のフィールド）
      const nameField = formFields.find(
        (f) => f.name === "name" || f.name === "fullName" || f.name === "full_name",
      );
      const fullNameValue = nameField ? formData[nameField.name]?.trim() : undefined;

      const [customer] = await db
        .insert(customers)
        .values({
          organizationId,
          email: emailValue,
          ...(fullNameValue && { fullName: fullNameValue }),
          source: `LP: ${lp.title}`,
        })
        .onConflictDoUpdate({
          target: [customers.organizationId, customers.email],
          set: {
            lastActivityAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();

      customerId = customer.id;
    }

    // 5. lp_submissionsにdata保存
    await createLpSubmission(db, {
      landingPageId: lp.id,
      customerId: customerId ?? null,
      data: formData,
    });

    // 6. 成功時thankYouMessageを返す
    return {
      thankYouMessage:
        lp.thankYouMessage || "お申し込みありがとうございます。",
    };
  } catch {
    return { error: "送信に失敗しました。もう一度お試しください。" };
  }
}
