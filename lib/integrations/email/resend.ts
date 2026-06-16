// Transactionele/aankondigings-e-mail via de Resend API (server-side).
// Vereist RESEND_API_KEY in de server-omgeving (.env.production.local).
// Afzender valt onder het geverifieerde domein bubbles.koniq.app.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = process.env.EMAIL_FROM ?? "Zwemschool Bubbles <noreply@bubbles.koniq.app>";

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY ontbreekt op de server" };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend gaf status ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
