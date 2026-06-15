# Security & Privacy baseline - Zwemschool Bubbles

Verwerkt gegevens van minderjarigen → AVG/GDPR-niveau als ontwerpstandaard (§7).
Hieronder de mapping van de requirements naar de implementatie in deze codebase.

## Information security (§8)

| ID | Eis | Waar geborgd |
|----|-----|--------------|
| SEC-1 | Auth: ouders e-mail/OTP, staff MFA | `app/(auth)/login`, Supabase Auth; MFA-beleid voor `STAFF_ROLES` |
| SEC-2 | Autorisatie in app én DB via RLS | `middleware.ts` + `0002_rls_policies.sql` |
| SEC-3 | TLS, encryptie at rest, geen secrets in code | Vercel/Supabase managed; `.env*` in `.gitignore`; HSTS-header |
| SEC-4 | Auditlog op gevoelige acties | `0003_audit_log.sql` (triggers, append-only) |
| SEC-5 | OWASP ASVS/Top 10, broken access control | RLS deny-by-default + negatieve RLS-tests (Iteratie 1) |
| SEC-6 | Server-side validatie + rate limiting | Zod-schema's (per feature) + rate limiting op auth/webhooks |
| SEC-7 | Backups + RPO/RTO | Supabase managed backups; restore-test in releaseproces |
| SEC-8 | CI/CD gescheiden omgevingen, scans | `.github/workflows/ci.yml`; dev/staging/prod |
| SEC-9 | Geen kaartdata; idempotente webhooks | `payments` zonder kaartvelden; `payment_webhook_events` unique |
| SEC-10 | Geen gevoelige data in logs | Integratie-stubs loggen geen inhoud; geen tokens/medische details |

## Privacy (§7)

| ID | Onderwerp | Waar geborgd |
|----|-----------|--------------|
| PR-2 | Consent met versie/datum/kanaal | `consent_records` (+ audit) |
| PR-3 | Dataminimalisatie | Minimale offline dataset; beperkte velden |
| PR-4 | Bijzondere/medische gegevens | `safety_profiles` met striktere RLS; **niet** voor finance |
| PR-5 | Bewaartermijnen | `system_settings` + retentie-job (Iteratie 4) |
| PR-6 | Rechten betrokkenen | Dataverzoek-workflow via beheer (Iteratie 1+) |

## RLS-principes

- Deny-by-default: RLS aan op **alle** tabellen; geen matchende policy = geweigerd.
- Anonieme gebruikers hebben nergens toegang.
- Ouder ziet alleen eigen gezin/kinderen (`current_family_ids()`).
- Instructeur ziet alleen eigen lessen + noodzakelijke safety-notities
  (`instructor_sees_session()`); geen financiële data.
- Finance ziet financiële data, geen medische/safety-data.
- Service role key (Edge Functions) bypasst RLS — alleen server-side gebruiken.

## Geautomatiseerde DB-validatie (CI)

De workflow `.github/workflows/db.yml` past bij elke push/PR alle migraties toe
op een echte Postgres (via een Supabase-compatibele auth-shim) en draait:
- `supabase/tests/rls_negative.sql` — ouder A ≠ ouder B, **finance ≠ medische data**,
  anoniem ziet niets (Prompt 36, broken access control).
- `supabase/tests/scheduling.sql` — de roosterconflict-trigger weigert dubbel-
  boekingen en staat aansluitende/andere-dag-lessen toe.

Hiermee zijn schema, RLS-beleid, RPC's en triggers continu gevalideerd zonder
lokale Docker. Atomaire intake (`submit_intake`) voorkomt half-gevulde gezinnen.

## Te valideren in latere iteraties

- Staff-MFA-afdwinging end-to-end testen tegen een echte Supabase Auth (de
  middleware-afdwinging is fail-open bij fouten om uitsluiting te voorkomen).
- CSP aanscherpen per omgeving zodra integratie-origins definitief zijn.
- DPIA-light vóór livegang (PR-9).
