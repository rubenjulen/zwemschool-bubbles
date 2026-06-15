// Betaalintegratie achter een abstractielaag (FR-9.4, FR-14.1). HARDE EIS:
// de app slaat NOOIT kaartgegevens op (FR-9.5, SEC-9). We bewaren alleen een
// provider-referentie + status. Webhooks worden idempotent verwerkt op basis
// van het unieke provider-event-id (zie payment_webhook_events).
export interface PaymentLinkRequest {
  invoiceId: string;
  amountCents: number;
  currency: "SRD";
  description: string;
}

export interface PaymentLink {
  /** Externe checkout-URL bij de gecertificeerde provider. */
  url: string;
  providerReference: string;
}

export interface PaymentProvider {
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLink>;
  /** Verifieert de authenticiteit van een inkomende webhook (handtekening). */
  verifyWebhook(rawBody: string, signature: string): boolean;
}

class StubPaymentProvider implements PaymentProvider {
  async createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLink> {
    console.info("[payments:stub] zou betaallink maken voor factuur", req.invoiceId);
    return {
      url: `https://example.test/pay/${req.invoiceId}`,
      providerReference: `stub-${req.invoiceId}`,
    };
  }

  verifyWebhook(): boolean {
    // De echte provider valideert hier de HMAC-handtekening. Stub weigert
    // standaard zodat er nooit per ongeluk in productie wordt vertrouwd.
    return false;
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new StubPaymentProvider();
}
