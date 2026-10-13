import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { monthReportToCsv } from "@/lib/csv";
import { createDemoState, DemoRepository } from "@/lib/data/demo-repository";
import { DEMO_MEMBERS, generateDemoEntries } from "@/lib/data/demo-seed";
import { formatDecimal, formatDelta, formatInt, formatPercent, formatRank, firstName, pluralize } from "@/lib/format";
import { extractHeadings, slugify } from "@/lib/guide";
import { buildMonthReport, buildRanking } from "@/lib/stats";
import type { Member } from "@/lib/types";

const member = (id: string, fullName: string): Member => ({
  id,
  fullName,
  jobTitle: "Prospecteur",
  department: null,
  managerId: null,
  avatarUrl: null,
  isProspector: true,
  isAdmin: false,
  sortOrder: 0,
});

describe("CSV export", () => {
  const report = buildMonthReport(
    [member("a", "Alice Martin"), member("b", "=HYPERLINK(\"evil\")")],
    [
      { memberId: "a", date: "2026-02-03", count: 12 },
      { memberId: "b", date: "2026-02-04", count: 5 },
    ],
    "2026-02",
  );
  const csv = monthReportToCsv(report);
  const lines = csv.split("\r\n");

  test("starts with a UTF-8 BOM and uses semicolons for French Excel", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toContain("Rang;Membre;Poste;Total");
  });

  test("has one line per prospector plus header and team total", () => {
    expect(lines).toHaveLength(4);
    expect(lines[3]).toContain("Équipe");
    expect(lines[3]).toContain(";17;");
  });

  test("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(csv).not.toMatch(/;=HYPERLINK/);
    expect(csv).toContain(`"'=HYPERLINK(""evil"")"`);
  });
});

describe("guide helpers", () => {
  test("slugify removes accents and punctuation", () => {
    expect(slugify("Répondre aux objections !")).toBe("repondre-aux-objections");
    expect(slugify("  Le premier   message ")).toBe("le-premier-message");
  });

  test("extractHeadings only keeps level 2 titles outside code blocks", () => {
    const markdown = ["# Titre", "## Avant de commencer", "### Sous-partie", "```", "## pas un titre", "```", "## Les relances ##"].join("\n");
    expect(extractHeadings(markdown)).toEqual([
      { id: "avant-de-commencer", title: "Avant de commencer" },
      { id: "les-relances", title: "Les relances" },
    ]);
  });
});

describe("demo data", () => {
  test("the seed is deterministic and never in the future", () => {
    const first = generateDemoEntries("2026-10-13");
    expect(generateDemoEntries("2026-10-13")).toEqual(first);
    expect(first.every((entry) => entry.date <= "2026-10-13" && entry.count >= 0 && entry.count <= 500)).toBe(true);
  });

  test("only some members have entered today, so the reminder can be demoed", () => {
    const today = generateDemoEntries("2026-10-13").filter((entry) => entry.date === "2026-10-13");
    const ids = new Set(today.map((entry) => entry.memberId));
    expect(ids.size).toBeGreaterThan(0);
    expect(ids.has("theo")).toBe(false);
  });

  test("the demo org chart has a single root and valid managers", () => {
    const ids = new Set(DEMO_MEMBERS.map((m) => m.id));
    expect(DEMO_MEMBERS.filter((m) => m.managerId === null)).toHaveLength(1);
    expect(DEMO_MEMBERS.every((m) => m.managerId === null || ids.has(m.managerId))).toBe(true);
  });

  test("DemoRepository reads, upserts and updates without leaking references", async () => {
    const repository = new DemoRepository(createDemoState("2026-10-13"));
    await repository.upsertEntry({ memberId: "theo", date: "2026-10-13", count: 3 });
    await repository.upsertEntry({ memberId: "theo", date: "2026-10-13", count: 8 });
    const today = await repository.listEntries({ from: "2026-10-13", to: "2026-10-13" });
    expect(today.filter((entry) => entry.memberId === "theo")).toEqual([{ memberId: "theo", date: "2026-10-13", count: 8 }]);

    await repository.updateMember("theo", { jobTitle: "Business developer" });
    expect((await repository.getMember("theo"))?.jobTitle).toBe("Business developer");
    expect(await repository.getMember("inconnu")).toBeNull();

    const members = await repository.listMembers();
    members[0].fullName = "Modifié";
    expect((await repository.listMembers())[0].fullName).not.toBe("Modifié");
  });
});

describe("formatting", () => {
  test("French number formats", () => {
    expect(formatInt(1284)).toBe("1 284");
    expect(formatDecimal(12.345)).toBe("12,3");
    expect(formatPercent(0.237)).toBe("24 %");
    expect(formatDelta(12)).toBe("+12");
    expect(formatDelta(-3)).toBe("-3");
    expect(formatRank(1)).toBe("1er");
    expect(formatRank(4)).toBe("4e");
    expect(firstName("Léa Fontaine")).toBe("Léa");
    expect(pluralize(1, "jour")).toBe("1 jour");
    expect(pluralize(3, "jour")).toBe("3 jours");
  });
});

describe("ranking entry flag", () => {
  test("hasEntry distinguishes a real zero from a missing entry", () => {
    const rows = buildRanking(
      [member("a", "Alice"), member("b", "Bruno")],
      [{ memberId: "a", date: "2026-10-13", count: 0 }],
      { from: "2026-10-13", to: "2026-10-13" },
      { from: "2026-10-12", to: "2026-10-12" },
    );
    expect(rows.find((row) => row.member.id === "a")?.hasEntry).toBe(true);
    expect(rows.find((row) => row.member.id === "b")?.hasEntry).toBe(false);
  });
});

describe("environment", () => {
  test("demo mode until all three Supabase variables are set", async () => {
    const { getSupabaseConfig, isDemoMode, getInviteCode } = await import("@/lib/env");
    vi.stubEnv("SUPABASE_URL", "https://projet.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(isDemoMode()).toBe(true);

    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_x");
    expect(isDemoMode()).toBe(false);
    expect(getSupabaseConfig()).toEqual({
      url: "https://projet.supabase.co",
      publishableKey: "sb_publishable_x",
      secretKey: "sb_secret_x",
    });

    vi.stubEnv("TEAM_INVITE_CODE", "   ");
    expect(getInviteCode()).toBeNull();
    vi.stubEnv("TEAM_INVITE_CODE", " vif-2026 ");
    expect(getInviteCode()).toBe("vif-2026");
    vi.unstubAllEnvs();
  });
});
