// Roostergeneratie (FR-4.2): terugkerende lesseries -> concrete lesdata, met
// uitzonderingen per datum (feestdagen, badsluiting). Puur en deterministisch
// (geen tijdzone-afhankelijkheid): we rekenen in UTC en geven yyyy-mm-dd terug.

/** JS getUTCDay: 0 = zondag ... 6 = zaterdag. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function toUTCDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Genereert alle lesdata tussen fromISO en toISO (inclusief) die op de
 * opgegeven weekdag vallen, met uitsluiting van de exceptions.
 */
export function generateSessionDates(
  weekday: Weekday,
  fromISO: string,
  toISO_: string,
  exceptions: string[] = [],
): string[] {
  const from = toUTCDate(fromISO);
  const to = toUTCDate(toISO_);
  if (from > to) return [];

  const skip = new Set(exceptions);
  const result: string[] = [];

  // Schuif naar de eerste passende weekdag.
  const cursor = new Date(from);
  while (cursor.getUTCDay() !== weekday) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor > to) return result;
  }

  while (cursor <= to) {
    const iso = toISO(cursor);
    if (!skip.has(iso)) result.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return result;
}
