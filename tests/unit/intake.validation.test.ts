import { describe, expect, it } from "vitest";
import { intakeSchema, CONSENT_VERSION } from "@/lib/validation/intake";

// Server-side validatie van de intake (SEC-6). Verplichte velden en de
// verplichte akkoorden (FR-2.3) moeten worden afgedwongen.

function validInput() {
  return {
    family: { familyName: "Gezin Pinas", guardianName: "Anita Pinas", phone: "+597 123456" },
    student: { firstName: "Devi", lastName: "Pinas", dateOfBirth: "2019-05-01", swimExperience: "geen" },
    safety: { medicalNotes: "", allergies: "noten", waterAnxiety: "", generalNotes: "" },
    emergency: { name: "Roy Pinas", phone: "+597 654321", relationship: "vader" },
    consents: {
      terms: true,
      privacy: true,
      incidentAction: true,
      photoVideo: false,
      whatsapp: true,
      email: true,
    },
  };
}

describe("intakeSchema", () => {
  it("accepteert een volledige, geldige intake", () => {
    const result = intakeSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("weigert ontbrekend akkoord op voorwaarden", () => {
    const input = validInput();
    input.consents.terms = false;
    const result = intakeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("weigert ontbrekend akkoord op privacy", () => {
    const input = validInput();
    input.consents.privacy = false;
    expect(intakeSchema.safeParse(input).success).toBe(false);
  });

  it("weigert een lege voornaam van het kind", () => {
    const input = validInput();
    input.student.firstName = "";
    expect(intakeSchema.safeParse(input).success).toBe(false);
  });

  it("weigert een noodcontact zonder telefoon", () => {
    const input = validInput();
    input.emergency.phone = "";
    expect(intakeSchema.safeParse(input).success).toBe(false);
  });

  it("weigert een onjuist datumformaat", () => {
    const input = validInput();
    input.student.dateOfBirth = "01-05-2019";
    expect(intakeSchema.safeParse(input).success).toBe(false);
  });

  it("heeft een vastgelegde consent-versie", () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
