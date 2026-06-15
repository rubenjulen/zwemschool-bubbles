"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { defaultRouteForRole, roleFromClaims } from "@/lib/auth/roles";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Staff-MFA (SEC-1): TOTP-enrollment + verificatie/step-up. De middleware
// stuurt staff zonder aal2 hierheen. Ouders gebruiken deze pagina niet.
export default function MfaPage() {
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }
      const existing = data.totp?.[0];
      if (existing) {
        // Al ingeschreven: alleen step-up verificatie nodig.
        setFactorId(existing.id);
      } else {
        const enroll = await supabase.auth.mfa.enroll({ factorType: "totp" });
        if (enroll.error) {
          setError(enroll.error.message);
          return;
        }
        setFactorId(enroll.data.id);
        setQr(enroll.data.totp.qr_code);
        setSecret(enroll.data.totp.secret);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setBusy(false);
      setError(challenge.error.message);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    setBusy(false);
    if (error) {
      setError("Code onjuist of verlopen. Probeer opnieuw.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = roleFromClaims({ app_metadata: user?.app_metadata });
    window.location.href = defaultRouteForRole(role);
  }

  return (
    <AppShell title="Tweestapsverificatie">
      <Card>
        <p className="text-sm text-slate-700">
          Voor medewerkers is tweestapsverificatie verplicht. Scan de QR-code met een
          authenticator-app (zoals Google Authenticator) en voer de 6-cijferige code in.
        </p>

        {qr && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {/* qr_code is een SVG data-URL van Supabase */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-code voor authenticator" className="h-44 w-44" />
            {secret && (
              <p className="break-all text-center text-xs text-slate-400">
                Of voer handmatig in: {secret}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="code">
            Verificatiecode
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-center text-lg tracking-widest"
            placeholder="••••••"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <Button onClick={verify} disabled={busy || code.length !== 6} className="w-full">
            {busy ? "Controleren..." : "Verifiëren"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
