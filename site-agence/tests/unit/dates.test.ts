import { describe, expect, test } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  formatDayLong,
  formatMonth,
  formatRelativeDay,
  isIsoDate,
  isMonthKey,
  isWeekend,
  periodWindow,
  startOfWeek,
  todayIso,
} from "@/lib/dates";

describe("todayIso", () => {
  test("uses the Paris calendar day, not UTC", () => {
    // 23:30 UTC on Oct 13 is already Oct 14 in Paris (UTC+2 in summer time)
    expect(todayIso(new Date("2026-10-13T23:30:00Z"))).toBe("2026-10-14");
    expect(todayIso(new Date("2026-10-13T21:30:00Z"))).toBe("2026-10-13");
  });

  test("handles winter time (UTC+1)", () => {
    expect(todayIso(new Date("2026-12-31T23:10:00Z"))).toBe("2027-01-01");
  });
});

describe("date arithmetic", () => {
  test("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("diffDays counts calendar days", () => {
    expect(diffDays("2026-10-01", "2026-10-13")).toBe(12);
    expect(diffDays("2026-10-13", "2026-10-13")).toBe(0);
    // DST change on 2026-10-25 must not create fractional days
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
  });

  test("startOfWeek returns the Monday", () => {
    expect(startOfWeek("2026-10-13")).toBe("2026-10-12"); // Tuesday
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12"); // Monday
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12"); // Sunday
  });

  test("month helpers", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(endOfMonth("2026-09")).toBe("2026-09-30");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  test("eachDay is inclusive", () => {
    expect(eachDay({ from: "2026-10-30", to: "2026-11-02" })).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  test("isWeekend", () => {
    expect(isWeekend("2026-10-17")).toBe(true);
    expect(isWeekend("2026-10-18")).toBe(true);
    expect(isWeekend("2026-10-19")).toBe(false);
  });
});

describe("validators", () => {
  test("isIsoDate rejects impossible dates and bad formats", () => {
    expect(isIsoDate("2026-10-13")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("13/10/2026")).toBe(false);
    expect(isIsoDate(20261013)).toBe(false);
  });

  test("isMonthKey", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey(undefined)).toBe(false);
    expect(isMonthKey("0050-01")).toBe(false);
  });
});

describe("periodWindow", () => {

  test("week compares the same elapsed days of last week", () => {
    expect(periodWindow("semaine", "2026-10-14")).toEqual({
      current: { from: "2026-10-12", to: "2026-10-14" },
      previous: { from: "2026-10-05", to: "2026-10-07" },
    });
  });

  test("month clamps to the length of the previous month", () => {
    expect(periodWindow("mois", "2026-03-31")).toEqual({
      current: { from: "2026-03-01", to: "2026-03-31" },
      previous: { from: "2026-02-01", to: "2026-02-28" },
    });
  });

  test("year compares the same elapsed days of last year", () => {
    expect(periodWindow("annee", "2026-10-14")).toEqual({
      current: { from: "2026-01-01", to: "2026-10-14" },
      previous: { from: "2025-01-01", to: "2025-10-14" },
    });
    expect(periodWindow("annee", "2028-02-29").previous).toEqual({ from: "2027-01-01", to: "2027-02-28" });
  });
});

describe("French formatting", () => {
  test("formats days and months in French", () => {
    expect(formatDayLong("2026-10-13")).toBe("mardi 13 octobre");
    expect(formatMonth("2026-09")).toBe("septembre 2026");
  });

  test("relative labels", () => {
    expect(formatRelativeDay("2026-10-13", "2026-10-13")).toBe("Aujourd'hui");
    expect(formatRelativeDay("2026-10-12", "2026-10-13")).toBe("Hier");
    expect(formatRelativeDay("2026-10-10", "2026-10-13")).toMatch(/10 oct/);
  });
});
