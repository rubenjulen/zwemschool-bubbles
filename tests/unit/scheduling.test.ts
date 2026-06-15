import { describe, expect, it } from "vitest";
import { generateSessionDates } from "@/lib/scheduling/recurrence";
import { detectConflicts, timesOverlap, type SeriesSlot } from "@/lib/scheduling/conflicts";
import { isFull, occupancyRatio, spotsLeft } from "@/lib/scheduling/availability";

describe("generateSessionDates", () => {
  it("genereert alle woensdagen in een periode", () => {
    // 2026-06-01 is een maandag; woensdag = 3.
    const dates = generateSessionDates(3, "2026-06-01", "2026-06-30");
    expect(dates).toEqual(["2026-06-03", "2026-06-10", "2026-06-17", "2026-06-24"]);
  });

  it("slaat uitzonderingsdata over (bv. feestdag/badsluiting)", () => {
    const dates = generateSessionDates(3, "2026-06-01", "2026-06-30", ["2026-06-17"]);
    expect(dates).toEqual(["2026-06-03", "2026-06-10", "2026-06-24"]);
  });

  it("geeft een lege lijst als from na to ligt", () => {
    expect(generateSessionDates(3, "2026-06-30", "2026-06-01")).toEqual([]);
  });
});

describe("timesOverlap", () => {
  it("herkent overlap", () => {
    expect(timesOverlap("16:00", "17:00", "16:30", "17:30")).toBe(true);
  });
  it("staat rand-aan-rand toe (geen overlap)", () => {
    expect(timesOverlap("16:00", "17:00", "17:00", "18:00")).toBe(false);
  });
});

describe("detectConflicts", () => {
  const base: SeriesSlot = {
    id: "cand",
    weekday: 3,
    startTime: "16:00",
    endTime: "17:00",
    locationId: "loc1",
    laneOrAreaId: "lane1",
    instructorId: "instr1",
  };

  it("vlagt een instructeur-dubbelboeking", () => {
    const existing: SeriesSlot[] = [
      { ...base, id: "x", laneOrAreaId: "lane2", instructorId: "instr1" },
    ];
    const conflicts = detectConflicts(base, existing);
    expect(conflicts).toEqual([{ reason: "instructor", withId: "x" }]);
  });

  it("vlagt een baan-dubbelboeking", () => {
    const existing: SeriesSlot[] = [
      { ...base, id: "y", instructorId: "instr2", laneOrAreaId: "lane1" },
    ];
    expect(detectConflicts(base, existing)).toEqual([{ reason: "lane", withId: "y" }]);
  });

  it("geen conflict op een andere weekdag", () => {
    const existing: SeriesSlot[] = [{ ...base, id: "z", weekday: 4 }];
    expect(detectConflicts(base, existing)).toEqual([]);
  });

  it("negeert zichzelf bij bewerken", () => {
    expect(detectConflicts(base, [base])).toEqual([]);
  });
});

describe("availability", () => {
  it("berekent vrije plekken en vol-status", () => {
    expect(spotsLeft(8, 5)).toBe(3);
    expect(spotsLeft(8, 10)).toBe(0);
    expect(isFull(8, 8)).toBe(true);
    expect(occupancyRatio(8, 4)).toBe(0.5);
  });
});
