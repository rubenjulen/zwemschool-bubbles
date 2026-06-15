import type { Weekday } from "./recurrence";
export type { Weekday };

// Conflictdetectie (FR-4.4): voorkom dat dezelfde instructeur of dezelfde
// baan/locatie op overlappende tijden dubbel wordt ingepland.

export interface SeriesSlot {
  id?: string;
  weekday: Weekday;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  locationId: string;
  laneOrAreaId?: string | null;
  instructorId?: string | null;
}

export type ConflictReason = "instructor" | "lane";

export interface Conflict {
  reason: ConflictReason;
  withId?: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Twee tijdvakken overlappen als ze elkaar strikt raken (rand-aan-rand mag). */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/**
 * Geeft de conflicten van een kandidaat-serie t.o.v. bestaande series. Conflict
 * = zelfde weekdag + overlappende tijd + (zelfde instructeur OF zelfde baan).
 */
export function detectConflicts(candidate: SeriesSlot, existing: SeriesSlot[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const other of existing) {
    if (other.id && other.id === candidate.id) continue; // zichzelf overslaan
    if (other.weekday !== candidate.weekday) continue;
    if (!timesOverlap(candidate.startTime, candidate.endTime, other.startTime, other.endTime)) {
      continue;
    }
    if (
      candidate.instructorId &&
      other.instructorId &&
      candidate.instructorId === other.instructorId
    ) {
      conflicts.push({ reason: "instructor", withId: other.id });
      continue;
    }
    if (
      candidate.laneOrAreaId &&
      other.laneOrAreaId &&
      candidate.locationId === other.locationId &&
      candidate.laneOrAreaId === other.laneOrAreaId
    ) {
      conflicts.push({ reason: "lane", withId: other.id });
    }
  }
  return conflicts;
}
