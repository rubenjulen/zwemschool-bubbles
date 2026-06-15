"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { submitIntake } from "./actions";
import type { IntakeInput } from "@/lib/validation/intake";

const STEPS = ["Kind & ouder", "Zwemmen & veiligheid", "Noodcontact", "Toestemming"] as const;

const empty: IntakeInput = {
  family: { familyName: "", guardianName: "", phone: "" },
  student: { firstName: "", lastName: "", dateOfBirth: "", swimExperience: "geen" },
  safety: { medicalNotes: "", allergies: "", waterAnxiety: "", generalNotes: "" },
  emergency: { name: "", phone: "", relationship: "" },
  consents: {
    terms: false as true,
    privacy: false as true,
    incidentAction: false,
    photoVideo: false,
    whatsapp: false,
    email: true,
  },
};

const inputClass =
  "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function patch<K extends keyof IntakeInput>(section: K, value: Partial<IntakeInput[K]>) {
    setForm((f) => ({ ...f, [section]: { ...f[section], ...value } }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await submitIntake(form);
    setSubmitting(false);
    if (result.ok) router.push("/dashboard");
    else setError(result.error);
  }

  return (
    <AppShell title="Inschrijven">
      {/* Voortgangsindicator (FR-2 intake) */}
      <ol className="mb-4 flex gap-1" aria-label="Voortgang">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-bubbles-500" : "bg-bubbles-100"}`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </ol>
      <p className="mb-3 text-xs font-medium text-slate-500">
        Stap {step + 1} van {STEPS.length}: {STEPS[step]}
      </p>

      <Card>
        {step === 0 && (
          <div className="space-y-3">
            <Field label="Voornaam kind" required>
              <input
                className={inputClass}
                value={form.student.firstName}
                onChange={(e) => patch("student", { firstName: e.target.value })}
              />
            </Field>
            <Field label="Achternaam kind">
              <input
                className={inputClass}
                value={form.student.lastName}
                onChange={(e) => patch("student", { lastName: e.target.value })}
              />
            </Field>
            <Field label="Geboortedatum (JJJJ-MM-DD)">
              <input
                type="date"
                className={inputClass}
                value={form.student.dateOfBirth}
                onChange={(e) => patch("student", { dateOfBirth: e.target.value })}
              />
            </Field>
            <Field label="Naam ouder/verzorger" required>
              <input
                className={inputClass}
                value={form.family.guardianName}
                onChange={(e) => patch("family", { guardianName: e.target.value })}
              />
            </Field>
            <Field label="Telefoon ouder">
              <input
                className={inputClass}
                value={form.family.phone}
                onChange={(e) => patch("family", { phone: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Zwemervaring">
              <select
                className={inputClass}
                value={form.student.swimExperience}
                onChange={(e) =>
                  patch("student", {
                    swimExperience: e.target.value as IntakeInput["student"]["swimExperience"],
                  })
                }
              >
                <option value="geen">Geen ervaring</option>
                <option value="beetje">Een beetje</option>
                <option value="redelijk">Redelijk</option>
                <option value="goed">Goed</option>
              </select>
            </Field>
            <Field label="Medische aandachtspunten">
              <textarea
                className={inputClass}
                rows={2}
                value={form.safety.medicalNotes}
                onChange={(e) => patch("safety", { medicalNotes: e.target.value })}
              />
            </Field>
            <Field label="Allergieën">
              <input
                className={inputClass}
                value={form.safety.allergies}
                onChange={(e) => patch("safety", { allergies: e.target.value })}
              />
            </Field>
            <Field label="Angst voor water / bijzonderheden">
              <textarea
                className={inputClass}
                rows={2}
                value={form.safety.waterAnxiety}
                onChange={(e) => patch("safety", { waterAnxiety: e.target.value })}
              />
            </Field>
            <p className="text-xs text-slate-400">
              Deze gegevens zijn extra afgeschermd en alleen zichtbaar waar nodig voor de
              veiligheid van je kind.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Field label="Naam noodcontact" required>
              <input
                className={inputClass}
                value={form.emergency.name}
                onChange={(e) => patch("emergency", { name: e.target.value })}
              />
            </Field>
            <Field label="Telefoon noodcontact" required>
              <input
                className={inputClass}
                value={form.emergency.phone}
                onChange={(e) => patch("emergency", { phone: e.target.value })}
              />
            </Field>
            <Field label="Relatie tot kind">
              <input
                className={inputClass}
                value={form.emergency.relationship}
                onChange={(e) => patch("emergency", { relationship: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Consent
              label="Ik ga akkoord met de algemene voorwaarden en huisregels"
              required
              checked={form.consents.terms}
              onChange={(v) => patch("consents", { terms: v as true })}
            />
            <Consent
              label="Ik ga akkoord met de privacyverklaring"
              required
              checked={form.consents.privacy}
              onChange={(v) => patch("consents", { privacy: v as true })}
            />
            <Consent
              label="Toestemming om te handelen bij een incident"
              checked={form.consents.incidentAction}
              onChange={(v) => patch("consents", { incidentAction: v })}
            />
            <Consent
              label="Toestemming foto/video"
              checked={form.consents.photoVideo}
              onChange={(v) => patch("consents", { photoVideo: v })}
            />
            <Consent
              label="Berichten via WhatsApp ontvangen"
              checked={form.consents.whatsapp}
              onChange={(v) => patch("consents", { whatsapp: v })}
            />
            <Consent
              label="Berichten via e-mail ontvangen"
              checked={form.consents.email}
              onChange={(v) => patch("consents", { email: v })}
            />
          </div>
        )}

        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="flex-1">
              Terug
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="flex-1">
              Volgende
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Bezig..." : "Inschrijving versturen"}
            </Button>
          )}
        </div>
      </Card>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Consent({
  label,
  required,
  checked,
  onChange,
}: {
  label: string;
  required?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 rounded border-bubbles-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
    </label>
  );
}
