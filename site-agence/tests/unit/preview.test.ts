import { describe, expect, test } from "vitest";
import { PreviewRepository } from "../../preview/repository";
import { PreviewStore, type Db } from "../../preview/store";
import { makeProspect } from "./helpers";

type Docs = Record<string, Record<string, Record<string, unknown>>>;

/** Base minimale : snapshots immédiats, écritures enregistrées. */
function fakeDb(initial: Docs) {
  const data: Docs = structuredClone(initial);
  const writes: string[] = [];
  const listeners: { collection: string; next: (snap: unknown) => void }[] = [];
  const snapshot = (collection: string) => ({
    docs: Object.entries(data[collection] ?? {}).map(([id, body]) => ({ id, exists: true, data: () => body })),
  });
  const emit = (collection: string) => listeners.filter((l) => l.collection === collection).forEach((l) => l.next(snapshot(collection)));
  const query = (collection: string) => ({
    orderBy: () => query(collection),
    limit: () => query(collection),
    onSnapshot(next: (snap: unknown) => void) {
      listeners.push({ collection, next });
      next(snapshot(collection));
      return () => {};
    },
  });
  const db = {
    collection: (collection: string) => ({
      ...query(collection),
      doc: (id: string) => ({
        async set(body: Record<string, unknown>) {
          writes.push(`set ${collection}/${id}`);
          (data[collection] ??= {})[id] = body;
          emit(collection);
        },
        async delete() {
          writes.push(`delete ${collection}/${id}`);
          delete data[collection]?.[id];
          emit(collection);
        },
      }),
    }),
  } as unknown as Db;
  return { db, data, writes };
}

const seed: Docs = {
  members: {
    lea: { login: "lea", fullName: "Léa Fontaine", jobTitle: "Prospectrice", isProspector: true },
    pirate: { login: 42, fullName: "Sans identifiant" },
    photo: { login: "photo", fullName: "Photo", avatarUrl: "javascript:alert(1)" },
  },
  credentials: {
    lea: { passwordHash: "x", sessionVersion: 1 },
  },
  prospects: {
    "lea_2026-10": {
      memberId: "lea",
      month: "2026-10",
      items: [
        { id: "p1", name: "Chez Paulette", city: "Lyon", channel: "telephone", date: "2026-10-13", createdAt: "2026-10-13T10:00:00.000Z" },
        { id: "bad", name: "Sans canal", city: "Lyon", channel: "pigeon", date: "2026-10-13" },
      ],
    },
  },
  resources: {
    ok: { kind: "link", title: "Portfolio", value: "https://exemple.fr" },
    xss: { kind: "link", title: "Piège", value: "javascript:alert(1)" },
    kind: { kind: "fax", title: "Inconnu", value: "x" },
  },
};

function setup() {
  const fake = fakeDb(seed);
  const store = new PreviewStore(fake.db);
  store.start();
  return { ...fake, store, repo: new PreviewRepository(store) };
}

describe("aperçu : lecture de la base partagée", () => {
  test("ignore les documents mal formés et les URL dangereuses", async () => {
    const { store, repo } = setup();
    expect(store.status).toBe("ready");
    expect((await repo.listMembers()).map((m) => m.id).sort()).toEqual(["lea", "photo"]);
    expect((await repo.getCredentialsById("photo"))?.member.avatarUrl).toBeNull();
    expect((await repo.listProspects()).map((p) => p.id)).toEqual(["p1"]);
    expect((await repo.listResources()).map((r) => r.id)).toEqual(["ok"]);
  });

  test("ne transmet jamais l'empreinte du mot de passe dans la liste des membres", async () => {
    const { repo } = setup();
    expect(Object.keys((await repo.listMembers())[0])).not.toContain("passwordHash");
  });

  test("sans accès aux informations de connexion, personne ne peut se connecter", async () => {
    const fake = fakeDb({ ...seed, credentials: {} });
    const store = new PreviewStore(fake.db);
    store.start();
    expect(store.canSignIn).toBe(false);
    expect((await new PreviewRepository(store).getCredentialsByLogin("lea"))?.passwordHash).toBeNull();
  });
});

describe("aperçu : écritures", () => {
  test("range un prospect dans le document du membre et du mois", async () => {
    const { repo, data, writes } = setup();
    await repo.addProspect(makeProspect({ id: "p2", memberId: "lea", date: "2026-10-14", name: "Le Zinc" }));
    await repo.addProspect(makeProspect({ id: "p3", memberId: "lea", date: "2026-09-30", name: "Le Comptoir" }));
    expect(writes).toEqual(["set prospects/lea_2026-10", "set prospects/lea_2026-09"]);
    // p1 + p2 : l'entrée illisible du document d'origine n'est pas recopiée.
    expect((data.prospects["lea_2026-10"].items as { id: string }[]).map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(await repo.getProspect("p3")).toMatchObject({ name: "Le Comptoir", memberId: "lea" });
  });

  test("supprime le document du mois quand il se vide", async () => {
    const { repo, data } = setup();
    await repo.addProspect(makeProspect({ id: "seul", memberId: "lea", date: "2026-08-01" }));
    await repo.deleteProspect("seul");
    expect(data.prospects["lea_2026-08"]).toBeUndefined();
    expect(await repo.getProspect("seul")).toBeNull();
  });

  test("un nouveau mot de passe incrémente la version de session, dans la collection protégée", async () => {
    const { repo, data, writes } = setup();
    await repo.updateMember("lea", { passwordHash: "nouveau", revokeSessions: true });
    expect(await repo.getCredentialsById("lea")).toMatchObject({ passwordHash: "nouveau", sessionVersion: 2 });
    expect(data.credentials.lea).toEqual({ passwordHash: "nouveau", sessionVersion: 2 });
    expect(data.members.lea).not.toHaveProperty("passwordHash");
    expect(writes).toEqual(["set members/lea", "set credentials/lea"]);
  });

  test("une simple mise à jour du profil ne réécrit pas les informations de connexion", async () => {
    const { repo, writes } = setup();
    await repo.updateMember("lea", { lastLoginAt: "2026-10-14T08:00:00.000Z" });
    expect(writes).toEqual(["set members/lea"]);
  });
});
