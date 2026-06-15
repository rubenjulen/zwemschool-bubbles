"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { defaultRouteForRole, roleFromClaims } from "@/lib/auth/roles";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

// Twee inlogmanieren:
//  - Ouders: wachtwoordloos via e-mail magic link / OTP (SEC-1).
//  - Medewerkers: e-mail + wachtwoord (staff doorlopen daarna MFA, afgedwongen
//    door de middleware).
export default function LoginPage() {
  const [mode, setMode] = useState<"magiclink" | "password">("magiclink");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message || "Versturen mislukt. Probeer het later opnieuw.");
    else setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message || "Inloggen mislukt. Controleer e-mail en wachtwoord.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = roleFromClaims({ app_metadata: user?.app_metadata });
    // Volledige navigatie zodat de middleware met de verse sessie meeloopt.
    window.location.href = defaultRouteForRole(role);
  }

  return (
    <AppShell title="Inloggen">
      <Card>
        {mode === "magiclink" ? (
          sent ? (
            <p className="text-sm text-slate-700">
              We hebben een inloglink naar <span className="font-medium">{email}</span> gestuurd.
              Controleer je mail om verder te gaan.
            </p>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="naam@voorbeeld.sr"
              />
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Bezig..." : "Stuur inloglink"}
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={signInWithPassword} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="naam@voorbeeld.sr"
            />
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Bezig..." : "Inloggen"}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "magiclink" ? "password" : "magiclink");
            setError(null);
            setSent(false);
          }}
          className="mt-4 w-full text-center text-xs text-bubbles-700 underline"
        >
          {mode === "magiclink"
            ? "Medewerker? Inloggen met wachtwoord"
            : "Ouder? Inloggen via e-maillink"}
        </button>
      </Card>
    </AppShell>
  );
}
