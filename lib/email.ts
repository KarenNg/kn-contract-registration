import { Resend } from "resend";

/**
 * Sends via Resend when configured; otherwise logs and no-ops so the app
 * (and this feature's own test button) fails soft instead of crashing when
 * RESEND_API_KEY / EMAIL_FROM haven't been set up yet.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(`[email] Not configured (RESEND_API_KEY/EMAIL_FROM missing) — skipped sending to ${to}`);
    return { sent: false, reason: "Email isn't configured yet — set RESEND_API_KEY and EMAIL_FROM." };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    console.error(`[email] Resend error sending to ${to}:`, error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
