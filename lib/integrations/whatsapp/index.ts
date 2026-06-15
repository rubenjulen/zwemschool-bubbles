// WhatsApp Business is het beoogde primaire kanaal (FR-8.2), maar pas na
// opt-in-registratie en Meta-template-goedkeuring. In MVP is dit een stub met
// dezelfde interface; opt-in/opt-out wordt afgedwongen vóór verzending.
export interface WhatsAppMessage {
  toPhoneE164: string;
  /** Door Meta goedgekeurde template-naam. */
  template: string;
  variables: Record<string, string | number>;
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<{ id: string; status: "queued" | "sent" | "failed" }>;
}

class StubWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage) {
    console.info("[whatsapp:stub] zou versturen:", message.template, "->", message.toPhoneE164);
    return { id: `stub-${Date.now()}`, status: "queued" as const };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new StubWhatsAppProvider();
}
