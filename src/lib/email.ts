import { getCloudflareContext } from "@opennextjs/cloudflare";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getBrevoApiKey(): string {
  const { env } = getCloudflareContext();
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }
  return apiKey;
}

/**
 * メールを送信する
 * @param to 宛先メールアドレス（文字列または配列）
 * @param subject 件名
 * @param content メール本文（HTMLまたはプレーンテキスト）
 * @param format 送信形式（'html' | 'text'）デフォルトは 'html'
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  content: string,
  format: "html" | "text" = "html"
) {
  const apiKey = getBrevoApiKey();
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const bodyPayload: Record<string, unknown> = {
    sender: { name: "sk-techlab", email: "foritemaqua@gmail.com" },
    to: recipients,
    subject,
  };

  if (format === "text") {
    bodyPayload.textContent = content;
  } else {
    bodyPayload.htmlContent = content;
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${body}`);
  }

  return res.json();
}
