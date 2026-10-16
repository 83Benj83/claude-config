import { describe, expect, test } from "vitest";
import { buildCallbacksView } from "@/lib/callbacks";
import { buildLeadsView } from "@/lib/leads";
import { DemoRepository } from "@/lib/data/demo-repository";
import * as callbacks from "@/lib/services/callbacks";
import * as leads from "@/lib/services/leads";
import type { Lead } from "@/lib/types";
import { makeMember } from "./helpers";

const TODAY = "2026-10-14";
const clock = { today: TODAY, now: `${TODAY}T10:00:00.000Z` };
const admin = makeMember("admin", { isAdmin: true, fullName: "Camille Admin" });
const lea = makeMember("lea", { fullName: "Léa Fontaine" });
const theo = makeMember("theo", { fullName: "Théo Garnier" });

const lead = (id: string, overrides: Partial<Lead> = {}): Lead => ({
  id,
  name: `Commerce ${id}`,
  city: "Toulon",
  category: null,
  phone: "06 12 34 56 78",
  email: null,
  instagram: null,
  facebook: null,
  note: null,
  listDay: TODAY,
  status: "open",
  doneBy: null,
  doneAt: null,
  prospectId: null,
  addedBy: null,
  batchId: null,
  outcome: null,
  createdAt: `${TODAY}T06:00:00.000Z`,
  ...overrides,
});

const repositoryWith = (list: Lead[]) =>
  new DemoRepository({
    members: [admin, lea, theo].map((member) => ({ member, passwordHash: null, sessionVersion: 1 })),
    prospects: [],
    resources: [],
    contracts: [],
    leads: list,
  });

const callbackInput = (overrides: Record<string, unknown> = {}) => ({
  name: "Boulangerie Soleil",
  city: "Toulon",
  phone: "04 94 00 00 00",
  contactName: "Mme Rossi",
  dueOn: "2026-10-15",
  dueTime: "10:30",
  priority: "haute",
  note: "",
  ...overrides,
});

describe("rappels", () => {
  test("un rappel garde le nom de la personne qui l'a ajouté et se coche pour disparaître", async () => {
    const repository = repositoryWith([]);
    const added = await callbacks.addCallback(repository, lea, callbackInput(), clock);
    expect(added.ok).toBe(true);
    const view = buildCallbacksView({ callbacks: await repository.listCallbacks("2026-10-01T00:00:00Z"), members: [admin, lea, theo], me: theo, today: TODAY });
    expect(view.pending).toHaveLength(1);
    expect(view.pending[0]).toMatchObject({ addedByName: "Léa Fontaine", when: "soon", canDelete: false });

    const id = view.pending[0].callback.id;
    expect(await callbacks.completeCallback(repository, theo, id, clock)).toMatchObject({ ok: true });
    const after = buildCallbacksView({ callbacks: await repository.listCallbacks("2026-10-01T00:00:00Z"), members: [admin, lea, theo], me: theo, today: TODAY });
    expect(after.pending).toHaveLength(0);
    expect(after.done[0]).toMatchObject({ addedByName: "Léa Fontaine", doneByName: "Théo Garnier" });
  });

  test("refuse un jour passé, un numéro invalide et un nom vide", async () => {
    const repository = repositoryWith([]);
    expect(await callbacks.addCallback(repository, lea, callbackInput({ dueOn: "2026-10-01" }), clock)).toMatchObject({ ok: false, errors: { dueOn: expect.any(String) } });
    expect(await callbacks.addCallback(repository, lea, callbackInput({ phone: "abc" }), clock)).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
    expect(await callbacks.addCallback(repository, lea, callbackInput({ name: "" }), clock)).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(await repository.listCallbacks("2026-01-01T00:00:00Z")).toHaveLength(0);
  });

  test("classe en retard, aujourd'hui, cette semaine", () => {
    const base = { city: null, phone: null, contactName: null, dueTime: null, priority: "moyenne" as const, note: null, addedBy: "lea", leadId: null, status: "pending" as const, doneBy: null, doneAt: null, createdAt: clock.now };
    const view = buildCallbacksView({
      callbacks: [
        { ...base, id: "1", name: "A", dueOn: "2026-10-13" },
        { ...base, id: "2", name: "B", dueOn: TODAY },
        { ...base, id: "3", name: "C", dueOn: "2026-10-20" },
        { ...base, id: "4", name: "D", dueOn: "2026-12-01" },
      ],
      members: [lea],
      me: lea,
      today: TODAY,
    });
    expect(view.pending.map((r) => r.when)).toEqual(["late", "today", "soon", "later"]);
    expect(view.counts).toEqual({ late: 1, today: 1, pending: 4 });
  });

  test("seuls l'auteur et les admins suppriment ; reporter change le jour", async () => {
    const repository = repositoryWith([]);
    const { data } = (await callbacks.addCallback(repository, lea, callbackInput(), clock)) as { ok: true; data: { callback: { id: string } } };
    const id = data.callback.id;
    expect(await callbacks.deleteCallback(repository, theo, id)).toMatchObject({ ok: false });
    expect(await callbacks.rescheduleCallback(repository, theo, { id, dueOn: "2026-10-20", dueTime: "" }, clock)).toMatchObject({ ok: true });
    expect(await repository.getCallback(id)).toMatchObject({ dueOn: "2026-10-20", dueTime: null });
    expect(await callbacks.deleteCallback(repository, admin, id)).toMatchObject({ ok: true });
    expect(await repository.getCallback(id)).toBeNull();
  });
});

describe("ajout d'un numéro par un membre", () => {
  test("ajoute à la liste avec son nom ; refuse sans téléphone et les doublons", async () => {
    const repository = repositoryWith([]);
    const ok = await leads.addLead(repository, lea, { name: "Café du Port", city: "Toulon", phone: "04 94 11 22 33" }, clock);
    expect(ok.ok).toBe(true);
    const [stored] = await repository.listLeads("2026-10-01T00:00:00Z");
    expect(stored).toMatchObject({ name: "Café du Port", addedBy: "lea", status: "open" });
    expect(await leads.addLead(repository, theo, { name: "Café du Port", city: "Toulon", phone: "04 94 11 22 33" }, clock)).toMatchObject({ ok: false });
    expect(await leads.addLead(repository, theo, { name: "Autre", city: "Toulon" }, clock)).toMatchObject({ ok: false });
  });
});

describe("à rappeler plus tard depuis la liste", () => {
  test("le commerce quitte la liste, rejoint les rappels et n'est pas compté", async () => {
    const repository = repositoryWith([lead("a")]);
    const result = await leads.deferLead(repository, lea, { id: "a", callback: callbackInput({ name: "Commerce a" }) }, clock);
    expect(result.ok).toBe(true);
    expect(await repository.getLead("a")).toMatchObject({ status: "done", outcome: "callback", doneBy: "lea" });
    expect(await repository.listCallbacks("2026-10-01T00:00:00Z")).toHaveLength(1);
    expect(await repository.listProspects({ from: TODAY, to: TODAY })).toHaveLength(0);
  });

  test("détails invalides : rien n'est modifié", async () => {
    const repository = repositoryWith([lead("a")]);
    expect((await leads.deferLead(repository, lea, { id: "a", callback: callbackInput({ dueOn: "2020-01-01" }) }, clock)).ok).toBe(false);
    expect(await repository.getLead("a")).toMatchObject({ status: "open" });
  });
});

describe("fichiers de 10 à 50 commerces", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => lead(`l${i}`, { phone: i % 5 === 0 ? null : "06 12 34 56 78" }));

  test("refuse une taille hors 10/20/30/40/50", async () => {
    const repository = repositoryWith(many(30));
    expect((await leads.extractBatch(repository, lea, 15, clock)).ok).toBe(false);
  });

  test("les commerces extraits disparaissent de la liste des autres, ceux avec téléphone d'abord", async () => {
    const repository = repositoryWith(many(30));
    const result = await leads.extractBatch(repository, lea, 10, clock);
    expect(result).toMatchObject({ ok: true, data: { count: 10 } });
    const mine = await repository.listBatchLeads((await repository.listActiveBatches())[0].id);
    expect(mine.every((l) => l.phone)).toBe(true);

    const all = await repository.listLeads("2026-10-01T00:00:00Z");
    const theoView = buildLeadsView({ leads: all, members: [admin, lea, theo], contacted: [], me: theo, today: TODAY, batches: await repository.listActiveBatches() });
    expect(theoView.open).toHaveLength(20);
    expect(theoView.myBatch).toBeNull();
    expect(theoView.otherBatches[0]).toMatchObject({ memberName: "Léa Fontaine", remaining: 10 });
    expect(await leads.claimLead(repository, theo, { id: mine[0].id, channel: "telephone" }, clock)).toMatchObject({ ok: false });
  });

  test("un seul fichier en cours par personne", async () => {
    const repository = repositoryWith(many(30));
    await leads.extractBatch(repository, lea, 10, clock);
    expect((await leads.extractBatch(repository, lea, 10, clock)).ok).toBe(false);
  });

  test("clôture impossible tant que tout n'est pas traité, puis les appelés rejoignent les prospects", async () => {
    const repository = repositoryWith(many(12));
    await leads.extractBatch(repository, lea, 10, clock);
    const batch = (await repository.listActiveBatches())[0];
    const items = await repository.listBatchLeads(batch.id);
    expect(items).toHaveLength(10);

    expect((await leads.finishBatch(repository, lea, clock)).ok).toBe(false);
    for (const [index, item] of items.entries()) {
      const outcome = index === 0 ? ({ outcome: "callback", callback: callbackInput({ name: item.name }) } as const) : ({ outcome: "contacted" } as const);
      expect((await leads.handleBatchLead(repository, lea, { id: item.id, ...outcome }, clock)).ok).toBe(true);
    }
    const done = await leads.finishBatch(repository, lea, clock);
    expect(done).toMatchObject({ ok: true, data: { counted: 9 } });
    expect(await repository.listProspects({ from: TODAY, to: TODAY })).toHaveLength(9);
    expect(await repository.listActiveBatches()).toHaveLength(0);
    expect(await repository.listCallbacks("2026-10-01T00:00:00Z")).toHaveLength(1);
    expect((await repository.getLead(items[1].id))?.status).toBe("done");
  });

  test("une deuxième clôture (double clic) ne recrée pas les prospects", async () => {
    const repository = repositoryWith(many(12));
    await leads.extractBatch(repository, lea, 10, clock);
    const batch = (await repository.listActiveBatches())[0];
    for (const item of await repository.listBatchLeads(batch.id)) {
      await leads.handleBatchLead(repository, lea, { id: item.id, outcome: "contacted" }, clock);
    }
    expect((await leads.finishBatch(repository, lea, clock)).ok).toBe(true);
    expect((await leads.finishBatch(repository, lea, clock)).ok).toBe(false);
    expect(await repository.listProspects({ from: TODAY, to: TODAY })).toHaveLength(10);
  });

  test("rappeler plusieurs fois le même commerce ne crée qu'un seul rappel", async () => {
    const repository = repositoryWith(many(12));
    await leads.extractBatch(repository, lea, 10, clock);
    const [item] = await repository.listBatchLeads((await repository.listActiveBatches())[0].id);
    const input = { id: item.id, outcome: "callback", callback: callbackInput({ name: item.name }) } as const;
    await leads.handleBatchLead(repository, lea, input, clock);
    await leads.handleBatchLead(repository, lea, input, clock);
    expect(await repository.listCallbacks("2026-10-01T00:00:00Z")).toHaveLength(1);
  });

  test("un autre membre ne peut pas traiter mon fichier ; rendre le fichier remet tout dans la liste", async () => {
    const repository = repositoryWith(many(12));
    await leads.extractBatch(repository, lea, 10, clock);
    const batch = (await repository.listActiveBatches())[0];
    const [first] = await repository.listBatchLeads(batch.id);
    expect((await leads.handleBatchLead(repository, theo, { id: first.id, outcome: "contacted" }, clock)).ok).toBe(false);
    expect((await leads.releaseBatch(repository, theo, batch.id)).ok).toBe(false);
    expect(await leads.releaseBatch(repository, lea, batch.id)).toMatchObject({ ok: true });
    expect((await repository.listLeads("2026-10-01T00:00:00Z")).every((l) => !l.batchId)).toBe(true);
  });
});
