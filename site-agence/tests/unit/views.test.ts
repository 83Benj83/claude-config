import { describe, expect, test } from "vitest";
import {
  buildAdminView,
  buildDirectoryView,
  buildHomeView,
  buildProspectionView,
  buildRankingView,
  buildReportView,
  buildResourcesView,
  buildTeamView,
  entriesFromProspects,
} from "@/lib/views";
import { makeMember, makeProspect } from "./helpers";

const today = "2026-10-14"; // mercredi
const members = [
  makeMember("a", { fullName: "Alice", sortOrder: 1 }),
  makeMember("b", { fullName: "Bruno", sortOrder: 2 }),
  makeMember("boss", { fullName: "Camille", isProspector: false, isAdmin: true }),
  makeMember("old", { fullName: "Olivier", active: false }),
];
const prospects = [
  makeProspect({ memberId: "a", date: today, name: "Le Zinc", city: "Lyon" }),
  makeProspect({ memberId: "a", date: today, name: "La Table", city: "Lyon", channel: "instagram" }),
  makeProspect({ memberId: "b", date: today, name: "Le Zinc", city: "Lyon" }),
  makeProspect({ memberId: "a", date: "2026-10-13", name: "Sushi Kyo", city: "Nice", channel: "email" }),
  makeProspect({ memberId: "b", date: "2026-10-12", name: "Burger Bonheur", city: "Lille" }),
  makeProspect({ memberId: "old", date: "2026-10-02", name: "Café des Arts", city: "Lyon" }),
  makeProspect({ memberId: "a", date: "2026-09-20", name: "Crêperie Lumière", city: "Rennes" }),
];
const me = members[0];

describe("entriesFromProspects", () => {
  test("counts prospects per member and day", () => {
    const entries = entriesFromProspects(prospects);
    expect(entries.find((e) => e.memberId === "a" && e.date === today)?.count).toBe(2);
    expect(entries).toHaveLength(6);
  });
});

describe("home view", () => {
  test("no figures and no ranking on the home screen", () => {
    const view = buildHomeView({ me, today });
    expect(Object.keys(view).sort()).toEqual(["me", "today"]);
    expect(view.me).toMatchObject({ id: me.id, fullName: me.fullName });
    expect(view.me).not.toHaveProperty("passwordHash");
  });
});

describe("prospection view", () => {
  const view = buildProspectionView({ prospects, me, today });

  test("only my editable prospects, most recent first", () => {
    expect(view.mine.map((p) => p.name)).toEqual(["La Table", "Le Zinc", "Sushi Kyo"]);
    expect(view.todayCount).toBe(2);
    expect(view.weekCount).toBe(3);
    expect(view.days[0]).toEqual({ value: today, label: "Aujourd'hui" });
    expect(view.days).toHaveLength(8);
    expect(view.cities[0]).toBe("Lyon");
  });
});

describe("directory view", () => {
  test("counts establishments and recent ones", () => {
    const view = buildDirectoryView({ members, prospects, today });
    expect(view.totalEstablishments).toBe(6);
    expect(view.contactedThisWeek).toBe(4);
    expect(view.recent.map((e) => e.name).slice(0, 2)).toEqual(["La Table", "Le Zinc"]);
    expect(view.recent[1].contacts).toHaveLength(2);
  });
});

describe("ranking view", () => {
  test("all periods are computed at once", () => {
    const view = buildRankingView({ members, prospects, me, today });
    expect(Object.keys(view.periods)).toEqual(["semaine", "mois", "annee"]);
    expect(view.periods.semaine.rows.map((r) => [r.member.id, r.total])).toEqual([
      ["a", 3],
      ["b", 2],
    ]);
    expect(view.periods.semaine.teamTotal).toBe(5);
    expect(view.periods.mois.teamTotal).toBe(6);
    expect(view.periods.annee.teamTotal).toBe(7);
    expect(view.periods.semaine.podium[0].isMe).toBe(true);
    expect(view.myStreak).toBe(2);
  });
});

describe("report view", () => {
  test("monthly report keeps inactive members who prospected that month", () => {
    const view = buildReportView({ members, prospects, me, month: "2026-10", today });
    expect(view.report.rows.map((r) => r.member.id).sort()).toEqual(["a", "b", "old"]);
    expect(view.report.teamTotal).toBe(6);
    expect(view.lastDay).toBe(today);
    expect(view.channels[0]).toEqual({ channel: "telephone", count: 4 });
    expect(view.channelsByMember.a.map((c) => c.channel).sort()).toEqual(["email", "instagram", "telephone"]);
  });

  test("past month ends on its last day", () => {
    const view = buildReportView({ members, prospects, me, month: "2026-09", today });
    expect(view.lastDay).toBe("2026-09-30");
    expect(view.report.teamTotal).toBe(1);
  });
});

describe("team, resources and admin views", () => {
  test("team view hides inactive members and shows no figures", () => {
    const view = buildTeamView({ members, me });
    expect(view.members.map((m) => m.id)).toEqual(["a", "b", "boss"]);
    expect(Object.keys(view).sort()).toEqual(["meId", "members"]);
  });

  test("resources are sorted and editable by the whole team", () => {
    const resources = [
      { id: "2", kind: "link" as const, title: "B", value: "https://b.fr", note: null, sortOrder: 2 },
      { id: "1", kind: "email" as const, title: "A", value: "a@b.fr", note: null, sortOrder: 1 },
    ];
    expect(buildResourcesView({ resources, me }).canEdit).toBe(true);
    expect(buildResourcesView({ resources, me: members[2] }).resources.map((r) => r.id)).toEqual(["1", "2"]);
  });

  test("admin view lists active members first", () => {
    const view = buildAdminView({ members, me: members[2], stats: { since: null, establishments: 0, countedThisMonth: 0 } });
    expect(view.members.at(-1)?.id).toBe("old");
    expect(view.departments).toEqual(["Commercial"]);
  });
});
