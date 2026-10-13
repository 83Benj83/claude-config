import { describe, expect, test } from "vitest";
import {
  buildMonthReport,
  buildOrgTree,
  buildRanking,
  currentStreak,
  initials,
  sumEntries,
  totalsByMember,
  wouldCreateCycle,
} from "@/lib/stats";
import type { Entry, Member } from "@/lib/types";

const member = (id: string, overrides: Partial<Member> = {}): Member => ({
  id,
  login: id,
  fullName: `Membre ${id}`,
  jobTitle: "Prospecteur",
  department: "Commercial",
  managerId: null,
  avatarUrl: null,
  isProspector: true,
  isAdmin: false,
  active: true,
  sortOrder: 0,
  welcomedAt: null,
  lastLoginAt: null,
  ...overrides,
});

const entry = (memberId: string, date: string, count: number): Entry => ({ memberId, date, count });

describe("totals", () => {
  const entries = [
    entry("a", "2026-10-12", 10),
    entry("a", "2026-10-13", 5),
    entry("b", "2026-10-13", 7),
    entry("b", "2026-09-30", 99),
  ];

  test("totalsByMember only counts the range", () => {
    const totals = totalsByMember(entries, { from: "2026-10-01", to: "2026-10-31" });
    expect(totals.get("a")).toBe(15);
    expect(totals.get("b")).toBe(7);
  });

  test("sumEntries", () => {
    expect(sumEntries(entries, { from: "2026-10-13", to: "2026-10-13" })).toBe(12);
  });
});

describe("buildRanking", () => {
  const members = [
    member("a", { fullName: "Alice" }),
    member("b", { fullName: "Bruno" }),
    member("c", { fullName: "Chloé" }),
    member("boss", { isProspector: false }),
  ];
  const entries = [
    entry("a", "2026-10-13", 20),
    entry("b", "2026-10-13", 20),
    entry("c", "2026-10-13", 5),
    entry("c", "2026-10-12", 12),
    entry("boss", "2026-10-13", 100),
  ];

  const ranking = buildRanking(
    members,
    entries,
    { from: "2026-10-13", to: "2026-10-13" },
    { from: "2026-10-12", to: "2026-10-12" },
  );

  test("excludes non-prospectors", () => {
    expect(ranking.map((row) => row.member.id)).not.toContain("boss");
  });

  test("ties share the same rank", () => {
    expect(ranking.map((row) => [row.member.fullName, row.rank])).toEqual([
      ["Alice", 1],
      ["Bruno", 1],
      ["Chloé", 3],
    ]);
  });

  test("computes the delta against the previous window", () => {
    const chloe = ranking.find((row) => row.member.id === "c");
    expect(chloe?.previousTotal).toBe(12);
    expect(chloe?.delta).toBe(-7);
  });

  test("sortOrder breaks ties before the name", () => {
    const ordered = buildRanking(
      [member("x", { fullName: "Zoé", sortOrder: 0 }), member("y", { fullName: "Adam", sortOrder: 1 })],
      [],
      { from: "2026-10-13", to: "2026-10-13" },
      { from: "2026-10-12", to: "2026-10-12" },
    );
    expect(ordered.map((row) => row.member.fullName)).toEqual(["Zoé", "Adam"]);
  });
});

describe("currentStreak", () => {
  const entries = [
    entry("a", "2026-10-10", 3),
    entry("a", "2026-10-11", 4),
    entry("a", "2026-10-12", 1),
    entry("a", "2026-10-09", 0),
  ];

  test("counts back from yesterday when today is not entered yet", () => {
    expect(currentStreak(entries, "a", "2026-10-13")).toBe(3);
  });

  test("includes today when entered", () => {
    expect(currentStreak([...entries, entry("a", "2026-10-13", 2)], "a", "2026-10-13")).toBe(4);
  });

  test("a zero day breaks the streak", () => {
    expect(currentStreak(entries, "a", "2026-10-10")).toBe(1);
  });

  test("returns 0 for someone without entries", () => {
    expect(currentStreak(entries, "b", "2026-10-13")).toBe(0);
  });
});

describe("buildMonthReport", () => {
  const members = [member("a", { fullName: "Alice" }), member("b", { fullName: "Bruno" }), member("z")];
  const entries = [
    entry("a", "2026-09-01", 10),
    entry("a", "2026-09-02", 30),
    entry("b", "2026-09-02", 20),
    entry("b", "2026-10-01", 500),
    entry("ghost", "2026-09-03", 7),
  ];
  const report = buildMonthReport(members, entries, "2026-09");

  test("covers every day of the month", () => {
    expect(report.days).toHaveLength(30);
    expect(report.teamDaily).toHaveLength(30);
  });

  test("team totals ignore other months and unknown members", () => {
    expect(report.teamTotal).toBe(60);
    expect(report.bestTeamDay).toEqual({ date: "2026-09-02", count: 50 });
    expect(report.activeMembers).toBe(2);
  });

  test("per-member stats", () => {
    const alice = report.rows.find((row) => row.member.id === "a");
    expect(alice).toMatchObject({
      rank: 1,
      total: 40,
      activeDays: 2,
      averagePerActiveDay: 20,
      bestDay: { date: "2026-09-02", count: 30 },
    });
    expect(alice?.share).toBeCloseTo(40 / 60);
  });

  test("members without activity", () => {
    const idle = report.rows.find((row) => row.member.id === "z");
    expect(idle).toMatchObject({ total: 0, activeDays: 0, averagePerActiveDay: 0, bestDay: null, rank: 3 });
  });

  test("an empty month", () => {
    const empty = buildMonthReport(members, [], "2026-02");
    expect(empty.teamTotal).toBe(0);
    expect(empty.bestTeamDay).toBeNull();
    expect(empty.rows.every((row) => row.share === 0)).toBe(true);
  });
});

describe("org chart", () => {
  const members = [
    member("ceo", { fullName: "Camille" }),
    member("sales", { managerId: "ceo", fullName: "Mehdi", sortOrder: 1 }),
    member("prod", { managerId: "ceo", fullName: "Inès", sortOrder: 2 }),
    member("rep", { managerId: "sales" }),
    member("orphan", { managerId: "deleted-user" }),
  ];

  test("buildOrgTree nests reports and promotes orphans to roots", () => {
    const tree = buildOrgTree(members);
    expect(tree.map((node) => node.member.id)).toEqual(["ceo", "orphan"]);
    expect(tree[0].reports.map((node) => node.member.id)).toEqual(["sales", "prod"]);
    expect(tree[0].reports[0].reports.map((node) => node.member.id)).toEqual(["rep"]);
  });

  test("wouldCreateCycle detects self and indirect loops", () => {
    expect(wouldCreateCycle(members, "ceo", "ceo")).toBe(true);
    expect(wouldCreateCycle(members, "ceo", "rep")).toBe(true);
    expect(wouldCreateCycle(members, "rep", "prod")).toBe(false);
    expect(wouldCreateCycle(members, "rep", null)).toBe(false);
  });

  test("wouldCreateCycle stops on pre-existing loops", () => {
    const looped = [
      { id: "x", managerId: "y" },
      { id: "y", managerId: "x" },
    ];
    expect(wouldCreateCycle(looped, "z", "x")).toBe(true);
  });
});

describe("initials", () => {
  test("first and last name", () => {
    expect(initials("Léa Fontaine")).toBe("LF");
    expect(initials("Jean Paul de la Tour")).toBe("JT");
    expect(initials("Mehdi")).toBe("M");
    expect(initials("   ")).toBe("?");
  });
});
