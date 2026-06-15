"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Wachtwoordloze login voor ouders via e-mail magic link / OTP (SEC-1).
// Staff doorlopen daarnaast MFA (af te dwingen in Auth-beleid, latere iteratie).
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <AppShell title="Inloggen">
      <Card>
        {sent ? (
          <p className="text-sm text-slate-700">
            We hebben een inloglink naar <span className="font-medium">{email}</span> gestuurd.
            Controleer je mail om verder te gaan.
          </p>
        ) : (
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
              className="tap-target w-full rounded-lg border border-bubbles-200 px-3 py-2 text-sm"
              placeholder="naam@voorbeeld.sr"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Bezig..." : "Stuur inloglink"}
            </Button>
          </form>
        )}
      </Card>
    </AppShell>
  );
}
