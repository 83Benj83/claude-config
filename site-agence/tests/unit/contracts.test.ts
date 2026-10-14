import { describe, expect, test } from "vitest";
import type { ContractFormValues } from "@/lib/actions-contract";
import { DemoRepository } from "@/lib/data/demo-repository";
import { countedSince } from "@/lib/services/loaders";
import * as contracts from "@/lib/services/contracts";
import * as members from "@/lib/services/members";
import * as prospects from "@/lib/services/prospects";
import { buildContractsView, buildProspectionView } from "@/lib/views";
import { resourceSchema } from "@/lib/validation";
import { makeMember, makeProspect } from "./helpers";

const TODAY = "2026-10-14";
const clock = { today: TODAY, now: `${TODAY}T10:00:00.000Z` };
const admin = makeMember("paul", { isAdmin: true, fullName: "Paul" });
const julien = makeMember("julien", { fullName: "Julien" });

const repository = () =>
  new DemoRepository({
    members: [admin, julien].map((member) => ({ member: { ...member }, passwordHash: null, sessionVersion: 1 })),
    prospects: [],
    resources: [],
    contracts: [],
  });

const form = (overrides: Partial<ContractFormValues> = {}): ContractFormValues => ({
  id: "",
  client: "Le Bistrot du Port",
  city: "Lyon",
  contact: "",
  pack: "Pro",
  options: "Commande en ligne",
  amount: "780",
  monthly: "25",
  status: "maquette",
  signedOn: "2026-10-10",
  deliveredOn: "",
  siteUrl: "",
  broughtBy: "julien",
  note: "",
  ...overrides,
});

describe("contrats", () => {
  test("seul l'admin les gère ; l'équipe les consulte", async () => {
    const repo = repository();
    expect(await contracts.saveContract(repo, julien, form(), clock)).toMatchObject({ ok: false });
    expect((await contracts.saveContract(repo, admin, form(), clock)).ok).toBe(true);
    const [saved] = await repo.listContracts();
    expect(await contracts.deleteContract(repo, julien, saved.id)).toMatchObject({ ok: false });
    const view = buildContractsView({ contracts: await repo.listContracts(), members: [admin, julien], me: julien, today: TODAY });
    expect(view.canEdit).toBe(false);
    expect(view.inProgress.map((c) => c.client)).toEqual(["Le Bistrot du Port"]);
    expect((await contracts.deleteContract(repo, admin, saved.id)).ok).toBe(true);
    expect(await repo.listContracts()).toEqual([]);
  });

  test("montants en euros, mise en ligne datée à aujourd'hui par défaut", async () => {
    const repo = repository();
    await contracts.saveContract(repo, admin, form({ amount: "1 090,50", status: "termine" }), clock);
    const [saved] = await repo.listContracts();
    expect(saved).toMatchObject({ amount: 1090.5, monthly: 25, deliveredOn: TODAY, broughtBy: "julien" });
    const view = buildContractsView({ contracts: [saved], members: [admin, julien], me: admin, today: TODAY });
    expect(view.totals).toEqual({ inProgress: 0, done: 1, signed: 1090.5, monthly: 25 });
  });

  test("refuse les dates incohérentes, les montants invalides et un apporteur inconnu", async () => {
    const repo = repository();
    const future = await contracts.saveContract(repo, admin, form({ signedOn: "2026-10-20" }), clock);
    expect(!future.ok && future.errors?.signedOn).toBeTruthy();
    const before = await contracts.saveContract(repo, admin, form({ status: "termine", deliveredOn: "2026-10-01" }), clock);
    expect(!before.ok && before.errors?.deliveredOn).toBeTruthy();
    const later = await contracts.saveContract(repo, admin, form({ status: "termine", deliveredOn: "2026-10-20" }), clock);
    expect(!later.ok && later.errors?.deliveredOn).toBeTruthy();
    const amount = await contracts.saveContract(repo, admin, form({ amount: "beaucoup" }), clock);
    expect(!amount.ok && amount.errors?.amount).toBeTruthy();
    const stranger = await contracts.saveContract(repo, admin, form({ broughtBy: "inconnu" }), clock);
    expect(!stranger.ok && stranger.errors?.broughtBy).toBeTruthy();
  });

  test("une modification garde la date de création", async () => {
    const repo = repository();
    await contracts.saveContract(repo, admin, form(), clock);
    const [saved] = await repo.listContracts();
    await contracts.saveContract(repo, admin, form({ id: saved.id, status: "validation" }), { today: TODAY, now: `${TODAY}T15:00:00.000Z` });
    expect(await repo.getContract(saved.id)).toMatchObject({ status: "validation", createdAt: clock.now, updatedAt: `${TODAY}T15:00:00.000Z` });
  });
});

describe("remise à zéro des statistiques", () => {
  test("réservée à l'admin, confirmée par « zéro », sans rien supprimer", async () => {
    const repo = repository();
    expect(await members.resetStatistics(repo, julien, "zéro", clock.now)).toMatchObject({ ok: false });
    expect((await members.resetStatistics(repo, admin, "oui", clock.now)).ok).toBe(false);
    expect((await members.resetStatistics(repo, admin, " ZÉRO ", clock.now)).ok).toBe(true);
    expect(await repo.getStatsSince()).toBe(clock.now);
  });

  test("seuls les prospects ajoutés après la remise à zéro comptent", () => {
    const before = makeProspect({ createdAt: "2026-10-14T09:00:00.000Z" });
    const after = makeProspect({ createdAt: "2026-10-14T11:00:00.000Z" });
    expect(countedSince([before, after], clock.now)).toEqual([after]);
    expect(countedSince([before, after], null)).toHaveLength(2);
  });

  test("la saisie garde mes prospects d'avant la remise à zéro, les compteurs repartent de zéro", () => {
    const before = makeProspect({ memberId: julien.id, date: TODAY, createdAt: "2026-10-14T09:00:00.000Z" });
    const after = makeProspect({ memberId: julien.id, date: TODAY, createdAt: "2026-10-14T11:00:00.000Z" });
    const view = buildProspectionView({ prospects: [before, after], since: clock.now, me: julien, today: TODAY });
    expect(view.mine.map((prospect) => prospect.id)).toEqual([after.id, before.id]);
    expect(view).toMatchObject({ todayCount: 1, weekCount: 1 });
  });

  test("le bilan exporté reprend les chiffres de l'écran", async () => {
    const repo = repository();
    await repo.addProspect(makeProspect({ memberId: julien.id, date: TODAY, createdAt: "2026-10-14T09:00:00.000Z" }));
    await members.resetStatistics(repo, admin, "zéro", clock.now);
    await repo.addProspect(makeProspect({ memberId: julien.id, date: TODAY, createdAt: "2026-10-14T11:00:00.000Z" }));
    const bilan = await prospects.exportCsv(repo, admin, { month: "2026-10", kind: "bilan" }, TODAY);
    const list = await prospects.exportCsv(repo, admin, { month: "2026-10", kind: "prospects" }, TODAY);
    if (!bilan.ok || !list.ok) throw new Error("export refusé");
    expect(bilan.data.content).toMatch(/^1;Julien;[^;]*;1;/m);
    expect(list.data.content.trim().split("\n")).toHaveLength(3);
  });
});

describe("ressources", () => {
  test("accepte un numéro de téléphone, refuse n'importe quel texte", () => {
    const base = { id: "", kind: "phone", title: "Téléphone", note: "", sortOrder: "1" };
    expect(resourceSchema.safeParse({ ...base, value: "06 22 82 88 32" }).success).toBe(true);
    expect(resourceSchema.safeParse({ ...base, value: "appelle-moi" }).success).toBe(false);
  });
});
