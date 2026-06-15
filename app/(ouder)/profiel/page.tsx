import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

// Gezinsprofiel (RSC). Laadt de eigen guardian-rij + berichtvoorkeuren via RLS
// en geeft ze door aan het client-formulier.
export default async function ProfielPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, full_name, phone_e164, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!guardian) {
    return (
      <AppShell title="Mijn profiel">
        <Card>
          <p className="text-sm text-slate-600">
            Je hebt nog geen gezinsprofiel. Rond eerst de inschrijving af.
          </p>
        </Card>
      </AppShell>
    );
  }

  const g = guardian as { id: string; full_name: string; phone_e164: string | null; email: string | null };

  const { data: prefRows } = await supabase
    .from("notification_preferences")
    .select("channel, category, opted_in")
    .eq("guardian_id", g.id);

  const prefs = (prefRows ?? []).map(
    (p: { channel: "email" | "whatsapp" | "push"; category: string; opted_in: boolean }) => ({
      channel: p.channel,
      category: p.category,
      optedIn: p.opted_in,
    }),
  );

  return (
    <AppShell title="Mijn profiel">
      <ProfileForm
        fullName={g.full_name}
        phone={g.phone_e164 ?? ""}
        email={g.email ?? user.email ?? ""}
        prefs={prefs}
      />
    </AppShell>
  );
}
