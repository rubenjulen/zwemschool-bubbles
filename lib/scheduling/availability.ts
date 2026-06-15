// Capaciteit/beschikbaarheid (FR-3.2, FR-4.3). Klein maar centraal gedeeld
// tussen ouder- (inschrijven) en beheerschermen (bezetting).

export function spotsLeft(capacity: number, booked: number): number {
  return Math.max(capacity - booked, 0);
}

export function isFull(capacity: number, booked: number): boolean {
  return booked >= capacity;
}

/** Bezettingsgraad 0-1 (voor dashboards/kleurcodering). */
export function occupancyRatio(capacity: number, booked: number): number {
  if (capacity <= 0) return 0;
  return Math.min(booked / capacity, 1);
}
