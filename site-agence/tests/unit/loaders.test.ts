import { describe, expect, test } from "vitest";
import { createDemoState, DemoRepository } from "@/lib/data/demo-repository";
import { DEMO_MEMBERS, generateDemoProspects } from "@/lib/data/demo-seed";
import { firstName, formatDelta, formatRank, pluralize } from "@/lib/format";
import * as loaders from "@/lib/services/loaders";
import { exportCsv } from "@/lib/services/prospects";

const TODAY = "2026-10-14";

async function demo() {
  const repository = new DemoRepository(await createDemoState(TODAY));
  const me = (await repository.getCredentialsById("lea"))!.member;
  return { repository, me };
}

describe("données de démonstration", () => {
  test("sont identiques d'une génération à l'autre et restent dans la fenêtre", () => {
    const first = generateDemoProspects(TODAY);
    expect(generateDemoProspects(TODAY)).toEqual(first);
    expect(first.length).toBeGreaterThan(300);
    expect(first.every((p) => p.date <= TODAY && p.date >= "2026-08-30")).toBe(true);
  });

  test("chaque compte se connecte avec identifiant + 2026", () => {
    expect(DEMO_MEMBERS.every((m) => m.demoPassword === `${m.login}2026`)).toBe(true);
  });
});

describe("chargement des écrans", () => {
  test("chaque écran se construit à partir des données", async () => {
    const { repository, me } = await demo();
    const choices = await loaders.loadLoginChoices(repository);
    expect(choices[0]).not.toHaveProperty("passwordHash");
    expect(choices.map((c) => c.login)).toContain("recrue");

    expect(loaders.loadHomeView(me, TODAY)).toMatchObject({ today: TODAY, me: { id: me.id } });

    expect((await loaders.loadProspectionView(repository, me, TODAY)).days[0].value).toBe(TODAY);
    expect((await loaders.loadDirectoryView(repository, TODAY)).recent.length).toBeGreaterThan(0);
    expect((await loaders.loadRankingView(repository, me, TODAY)).periods.mois.rows.length).toBeGreaterThan(0);
    expect((await loaders.loadTeamView(repository, me)).members.length).toBe(DEMO_MEMBERS.length);
    expect((await loaders.loadResourcesView(repository, me)).canEdit).toBe(true);
    expect((await loaders.loadContractsView(repository, me, TODAY)).canEdit).toBe(false);
    const admin = await loaders.loadAdminView(repository, me, TODAY);
    expect(admin.departments).toContain("Commercial");
    expect(admin.stats.since).toBeNull();
  });

  test("le bilan ignore un mois futur ou invalide", async () => {
    const { repository, me } = await demo();
    expect((await loaders.loadReportView(repository, me, TODAY, "2026-09")).month).toBe("2026-09");
    expect((await loaders.loadReportView(repository, me, TODAY, "2027-01")).month).toBe("2026-10");
    expect((await loaders.loadReportView(repository, me, TODAY, "n'importe quoi")).month).toBe("2026-10");
  });

  test("l'export produit le bilan ou la liste du mois demandé", async () => {
    const { repository, me } = await demo();
    const bilan = await exportCsv(repository, me, { month: "2026-09", kind: "bilan" }, TODAY);
    expect(bilan.ok && bilan.data.filename).toBe("bilan-prospection-2026-09.csv");
    const list = await exportCsv(repository, me, { month: "2099-01", kind: "prospects" }, TODAY);
    expect(list.ok && list.data.filename).toBe("prospects-2026-10.csv");
  });
});

describe("activité (admins)", () => {
  test("visites et connexions du jour, sur les données de démo", async () => {
    const { repository } = await demo();
    const now = new Date("2026-10-14T09:00:00.000Z");
    await repository.recordPresence("lea", TODAY, "2026-10-14T08:00:00.000Z");
    await repository.recordPresence("lea", TODAY, "2026-10-14T08:40:00.000Z");
    await repository.recordPresence("lea", TODAY, "2026-10-14T08:20:00.000Z");
    await repository.recordLogin({ memberId: "lea", login: "lea", ok: true, at: "2026-10-14T07:59:00.000Z" });
    await repository.recordLogin({ memberId: null, login: "lea", ok: false, at: "2026-10-14T07:58:00.000Z" });

    const view = await loaders.loadActivityView(repository, TODAY, now);
    const lea = view.rows[0];
    expect(lea.member.id).toBe("lea");
    expect(lea.today).toEqual({ firstSeenAt: "2026-10-14T08:00:00.000Z", lastSeenAt: "2026-10-14T08:40:00.000Z" });
    expect(lea.lastSeenAt).toBe("2026-10-14T08:40:00.000Z");
    expect(view.totals.presentToday).toBe(1);
    expect(view.totals.refusedToday).toBe(1);
    expect(view.logins.map((event) => [event.ok, event.name])).toEqual([
      [true, "Léa Fontaine"],
      [false, "Léa Fontaine"],
    ]);
    expect(view.site.files).toBe(0);
  });

  test("les écrans de toute l'équipe ne montrent pas les heures de visite et de connexion", async () => {
    const { repository, me } = await demo();
    await repository.recordPresence("karim", TODAY, "2026-10-14T08:00:00.000Z");
    await repository.updateMember("karim", { lastLoginAt: "2026-10-14T07:59:00.000Z" });
    const team = await loaders.loadTeamView(repository, me);
    const karim = team.members.find((member) => member.id === "karim")!;
    expect([karim.lastSeenAt, karim.lastLoginAt]).toEqual([null, null]);
    const ranking = await loaders.loadRankingView(repository, me, TODAY);
    expect(ranking.periods.annee.rows.every((row) => row.member.lastSeenAt === null && row.member.lastLoginAt === null)).toBe(true);
    // L'activité (admins) les garde.
    const activity = await loaders.loadActivityView(repository, TODAY, new Date("2026-10-14T09:00:00.000Z"));
    expect(activity.rows.find((row) => row.member.id === "karim")?.lastSeenAt).toBe("2026-10-14T08:00:00.000Z");
  });

  test("le classement compte par jour, depuis la remise à zéro", async () => {
    const { repository, me } = await demo();
    const before = await loaders.loadRankingView(repository, me, TODAY);
    expect(before.periods.annee.teamTotal).toBeGreaterThan(0);
    await repository.setStatsSince("2999-01-01T00:00:00.000Z");
    const after = await loaders.loadRankingView(repository, me, TODAY);
    expect(after.periods.annee.teamTotal).toBe(0);
  });
});

describe("formats", () => {
  test("rangs, variations, prénoms et pluriels", () => {
    expect([formatRank(1), formatRank(2)]).toEqual(["1er", "2e"]);
    expect([formatDelta(3), formatDelta(-2), formatDelta(0)]).toEqual(["+3", "-2", "0"]);
    expect(firstName("  Léa Fontaine ")).toBe("Léa");
    expect([pluralize(1, "prospect"), pluralize(2, "prospect")]).toEqual(["1 prospect", "2 prospects"]);
  });
});
