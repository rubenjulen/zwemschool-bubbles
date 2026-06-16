"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/integrations/email/resend";

export type AnnouncementResult =
  | { ok: true; sent: number; failed: number; recipients: number }
  | { ok: false; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Stuurt een aankondiging naar alle ouders of per niveau (FR-8.4). Verstuurt via
// Resend en logt elke verzending in `messages`. Respecteert opt-out via de RPC.
export async function sendAnnouncement(input: {
  levelId?: string | null;
  subject: string;
  body: string;
}): Promise<AnnouncementResult> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length === 0 || body.length === 0) {
    return { ok: false, error: "Onderwerp en bericht zijn verplicht" };
  }

  const supabase = createClient();
  const { data: recipients, error } = await supabase.rpc("get_announcement_recipients", {
    p_level_id: input.levelId || null,
  });
  if (error) return { ok: false, error: error.message };

  const list = (recipients ?? []) as { guardian_id: string; email: string }[];
  const html = `<div style="font-family:sans-serif;font-size:14px;color:#0a4a71">${escapeHtml(
    body,
  ).replace(/\n/g, "<br>")}</div>`;

  let sent = 0;
  let failed = 0;
  const logRows: Record<string, unknown>[] = [];

  for (const r of list) {
    const res = await sendEmail(r.email, subject, html);
    if (res.ok) sent++;
    else failed++;
    logRows.push({
      channel: "email",
      template: "announcement",
      recipient_guardian_id: r.guardian_id,
      subject,
      status: res.ok ? "sent" : "failed",
      sent_at: res.ok ? new Date().toISOString() : null,
    });
  }

  if (logRows.length > 0) {
    await supabase.from("messages").insert(logRows);
  }

  return { ok: true, sent, failed, recipients: list.length };
}
