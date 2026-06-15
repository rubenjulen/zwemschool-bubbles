import { z } from "zod";

// Versie van de juridische teksten waarmee akkoord wordt gegaan. Wordt bij elke
// consent vastgelegd (PR-2). Juridische review verplicht vóór publicatie (D-6).
export const CONSENT_VERSION = "2026-06-15";

// Server-side validatieschema voor de intake (SEC-6). De client valideert ook,
// maar deze versie is leidend. Dataminimalisatie: alleen wat nodig is (PR-3).
export const intakeSchema = z.object({
  family: z.object({
    familyName: z.string().trim().max(120).optional(),
    guardianName: z.string().trim().min(2, "Naam is verplicht").max(120),
    phone: z.string().trim().max(40).optional(),
  }),
  student: z.object({
    firstName: z.string().trim().min(1, "Voornaam is verplicht").max(80),
    lastName: z.string().trim().max(80).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Gebruik JJJJ-MM-DD")
      .optional()
      .or(z.literal("")),
    swimExperience: z.enum(["geen", "beetje", "redelijk", "goed"]).default("geen"),
  }),
  safety: z.object({
    medicalNotes: z.string().trim().max(2000).optional(),
    allergies: z.string().trim().max(1000).optional(),
    waterAnxiety: z.string().trim().max(1000).optional(),
    generalNotes: z.string().trim().max(2000).optional(),
  }),
  emergency: z.object({
    name: z.string().trim().min(2, "Naam noodcontact is verplicht").max(120),
    phone: z.string().trim().min(5, "Telefoon noodcontact is verplicht").max(40),
    relationship: z.string().trim().max(80).optional(),
  }),
  consents: z
    .object({
      // FR-2.3: voorwaarden + privacy zijn verplicht.
      terms: z.literal(true, { errorMap: () => ({ message: "Akkoord met voorwaarden is verplicht" }) }),
      privacy: z.literal(true, { errorMap: () => ({ message: "Akkoord met privacy is verplicht" }) }),
      // FR-2.4: optionele, apart in te trekken toestemmingen.
      incidentAction: z.boolean().default(false),
      photoVideo: z.boolean().default(false),
      whatsapp: z.boolean().default(false),
      email: z.boolean().default(true),
    })
    .strict(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;
