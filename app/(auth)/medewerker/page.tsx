"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { defaultRouteForRole, roleFromClaims } from "@/lib/auth/roles";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass = "tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm";

// Medewerker-login: e-mail + wachtwoord. Staff doorloopt daarna MFA (afgedwongen
// door de middleware). Apart van de wachtwoordloze ouder-login (Optie A).
export default function MedewerkerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError("Inloggen mislukt. Controleer e-mail en wachtwoord.");
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
    <AppShell title="Medewerker-login">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            placeholder="naam@thebubbles.koniq.app"
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
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400">
        Ouder?{" "}
        <Link href="/login" className="text-bubbles-700 underline">
          Log in met e-maillink
        </Link>
      </p>
    </AppShell>
  );
}
