// E-mail is het werkende communicatiekanaal in MVP (FR-8.2). De concrete
// provider (bv. Resend/Postmark) wordt later gekozen; tot die tijd logt de
// stub alleen. Templates/opt-in-controle komen in een latere iteratie.
export interface EmailMessage {
  to: string;
  subject: string;
  /** Template-id; de body wordt server-side uit een template opgebouwd. */
  template: string;
  variables: Record<string, string | number>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string; status: "queued" | "sent" | "failed" }>;
}

class StubEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.info("[email:stub] zou versturen:", message.template, "->", message.to);
    return { id: `stub-${Date.now()}`, status: "queued" as const };
  }
}

export function getEmailProvider(): EmailProvider {
  // switch op process.env.EMAIL_PROVIDER zodra een echte provider is gekozen.
  return new StubEmailProvider();
}
