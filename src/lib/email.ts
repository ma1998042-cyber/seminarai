import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (_resend) return _resend;
  const { env } = getCloudflareContext();
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  _resend = new Resend(apiKey);
  return _resend;
}

/**
 * メールを送信する
 * @param to 宛先メールアドレス（文字列または配列）
 * @param subject 件名
 * @param html HTML本文
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
) {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: "noreply@example.com",
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
