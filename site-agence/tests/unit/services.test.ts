import { beforeEach, describe, expect, test } from "vitest";
import type { MemberFormValues, ProspectFormValues } from "@/lib/actions-contract";
import { DemoRepository } from "@/lib/data/demo-repository";
import { hashPassword } from "@/lib/password";
import * as members from "@/lib/services/members";
import * as prospects from "@/lib/services/prospects";
import type { Member, Prospect } from "@/lib/types";
import { makeMember, makeProspect } from "./helpers";

const TODAY = "2026-10-14";
const clock = { today: TODAY, now: `${TODAY}T10:00:00.000Z` };

const admin = makeMember("admin", { isAdmin: true, isProspector: false, fullName: "Camille Admin" });
const lea = makeMember("lea", { fullName: "Léa Fontaine" });
const theo = makeMember("theo", { fullName: "Théo Garnier" });

async function repositoryWith(prospectList: Prospect[] = []) {
  const stored = await Promise.all(
    [admin, lea, theo].map(async (member) => ({ member: { ...member }, passwordHash: await hashPassword(`${member.id}2026`, 1_000), sessionVersion: 1 })),
  );
  return new DemoRepository({ members: stored, prospects: prospectList.map((p) => ({ ...p })), resources: [] });
}

const prospectForm = (overrides: Partial<ProspectFormValues> = {}): ProspectFormValues => ({
  name: "Le Bistrot du Port",
  city: "Lyon",
  channel: "telephone",
  contact: "",
  note: "",
  date: TODAY,
  ...overrides,
});

const memberForm = (overrides: Partial<MemberFormValues> = {}): MemberFormValues => ({
  id: "",
  login: "sami",
  fullName: "Sami Test",
  jobTitle: "Prospecteur",
  department: "",
  managerId: "",
  avatarUrl: "",
  password: "motdepasse",
  isProspector: true,
  isAdmin: false,
  active: true,
  ...overrides,
});

describe("connexion", () => {
  test("accepte le bon mot de passe, quelle que soit la casse de l'identifiant", async () => {
    const repo = await repositoryWith();
    const result = await members.authenticate(repo, { login: "LEA", password: "lea2026" });
    expect(result.ok && result.credentials.member.id).toBe("lea");
  });

  test("refuse un identifiant sans mot de passe enregistré, quel que soit le mot de passe tapé", async () => {
    const repo = await repositoryWith();
    // Identifiant créé sans empreinte (ex. inséré à la main dans la base).
    const state = (repo as unknown as { state: { members: { member: Member; passwordHash: string | null }[] } }).state;
    state.members.find((m) => m.member.id === "theo")!.passwordHash = null;
    for (const password of ["identifiant-inexistant", "theo2026"]) {
      expect((await members.authenticate(repo, { login: "theo", password })).ok).toBe(false);
    }
  });

  test("refuse un mauvais mot de passe ou un identifiant désactivé, sans dire lequel", async () => {
    const repo = await repositoryWith();
    expect(await members.authenticate(repo, { login: "lea", password: "faux" })).toEqual({ ok: false, message: members.WRONG_CREDENTIALS });
    await repo.updateMember("lea", { active: false });
    expect(await members.authenticate(repo, { login: "lea", password: "lea2026" })).toEqual({ ok: false, message: members.WRONG_CREDENTIALS });
  });
});

describe("ajout de prospects", () => {
  test("enregistre le prospect et compte ceux du jour", async () => {
    const repo = await repositoryWith([makeProspect({ memberId: "lea", date: TODAY })]);
    const result = await prospects.addProspect(repo, lea, prospectForm(), clock);
    expect(result.ok && result.data.todayCount).toBe(2);
    expect(result.ok && result.data.prospect.memberId).toBe("lea");
  });

  test("exige nom, ville et moyen de contact", async () => {
    const repo = await repositoryWith();
    const result = await prospects.addProspect(repo, lea, prospectForm({ name: "", city: "", channel: "" }), clock);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors ?? {}).sort()).toEqual(["channel", "city", "name"]);
  });

  test("refuse une date trop ancienne ou future", async () => {
    const repo = await repositoryWith();
    for (const date of ["2026-09-30", "2026-10-15"]) {
      const result = await prospects.addProspect(repo, lea, prospectForm({ date }), clock);
      expect(!result.ok && result.errors?.date).toBeTruthy();
    }
  });
});

describe("suppression de prospects", () => {
  let repo: DemoRepository;
  beforeEach(async () => {
    repo = await repositoryWith([
      makeProspect({ id: "recent", memberId: "lea", date: "2026-10-12" }),
      makeProspect({ id: "ancien", memberId: "lea", date: "2026-09-20" }),
    ]);
  });

  test("chacun supprime ses prospects récents", async () => {
    expect((await prospects.deleteProspect(repo, lea, "recent", TODAY)).ok).toBe(true);
  });

  test("personne ne supprime ceux d'un autre, ni ses anciens", async () => {
    expect((await prospects.deleteProspect(repo, theo, "recent", TODAY)).ok).toBe(false);
    expect((await prospects.deleteProspect(repo, lea, "ancien", TODAY)).ok).toBe(false);
  });

  test("un admin peut tout supprimer", async () => {
    expect((await prospects.deleteProspect(repo, admin, "ancien", TODAY)).ok).toBe(true);
  });
});

describe("déjà contacté ?", () => {
  test("retrouve un établissement malgré les accents, la casse et les articles", async () => {
    const repo = await repositoryWith([makeProspect({ memberId: "lea", name: "Le Café des Arts", city: "Lyon" })]);
    const check = await prospects.checkEstablishment(repo, "cafe des arts", "lyon");
    expect(check.sameCity?.contacts[0].memberName).toBe("Léa Fontaine");
    const results = await prospects.searchDirectory(repo, "CAFÉ ARTS", "");
    expect(results.map((e) => e.name)).toEqual(["Le Café des Arts"]);
  });

  test("signale le même nom dans une autre ville sans le compter comme doublon", async () => {
    const repo = await repositoryWith([makeProspect({ memberId: "lea", name: "Chez Paulette", city: "Lille" })]);
    const check = await prospects.checkEstablishment(repo, "Chez Paulette", "Lyon");
    expect(check.sameCity).toBeNull();
    expect(check.otherCities.map((e) => e.city)).toEqual(["Lille"]);
  });
});

describe("gestion des identifiants", () => {
  test("réservée aux admins", async () => {
    const repo = await repositoryWith();
    expect(await members.saveMember(repo, lea, memberForm())).toMatchObject({ ok: false });
  });

  test("crée un identifiant utilisable avec son mot de passe", async () => {
    const repo = await repositoryWith();
    expect((await members.saveMember(repo, admin, memberForm())).ok).toBe(true);
    const login = await members.authenticate(repo, { login: "sami", password: "motdepasse" });
    expect(login.ok && login.credentials.member.welcomedAt).toBeNull();
  });

  test("refuse un identifiant déjà pris ou un nouvel identifiant sans mot de passe", async () => {
    const repo = await repositoryWith();
    const taken = await members.saveMember(repo, admin, memberForm({ login: "LEA" }));
    expect(!taken.ok && taken.errors?.login).toMatch(/déjà utilisé/);
    const noPassword = await members.saveMember(repo, admin, memberForm({ password: "" }));
    expect(!noPassword.ok && noPassword.errors?.password).toBeTruthy();
  });

  test("un nouveau mot de passe ferme les sessions ouvertes", async () => {
    const repo = await repositoryWith();
    const before = (await repo.getCredentialsById("lea"))!.sessionVersion;
    const form = memberForm({ id: "lea", login: "lea", fullName: lea.fullName, password: "nouveau-mdp" });
    expect((await members.saveMember(repo, admin, form)).ok).toBe(true);
    expect((await repo.getCredentialsById("lea"))!.sessionVersion).toBe(before + 1);
  });

  test("garde au moins un admin actif", async () => {
    const repo = await repositoryWith();
    const form = memberForm({ id: "admin", login: "admin", fullName: admin.fullName, password: "", isAdmin: false });
    const result = await members.saveMember(repo, admin, form);
    expect(!result.ok && result.errors?.isAdmin).toMatch(/au moins un administrateur/);
  });

  test("empêche une boucle dans l'organigramme", async () => {
    const repo = await repositoryWith();
    await repo.updateMember("theo", { managerId: "lea" });
    const form = memberForm({ id: "lea", login: "lea", fullName: lea.fullName, password: "", managerId: "theo" });
    const result = await members.saveMember(repo, admin, form);
    expect(!result.ok && result.errors?.managerId).toMatch(/boucle/);
  });
});

describe("première connexion", () => {
  test("enregistre le nom choisi et la date de bienvenue", async () => {
    const repo = await repositoryWith();
    const newcomer: Member = { ...theo, welcomedAt: null };
    expect((await members.completeWelcome(repo, newcomer, { fullName: "Théo G." }, clock.now)).ok).toBe(true);
    const saved = (await repo.getCredentialsById("theo"))!.member;
    expect(saved).toMatchObject({ fullName: "Théo G.", welcomedAt: clock.now });
  });

  test("ne sert qu'une fois : ensuite, le nom est géré par les admins", async () => {
    const repo = await repositoryWith();
    const result = await members.completeWelcome(repo, theo, { fullName: "Lea Fontaine" }, clock.now);
    expect(result.ok).toBe(false);
    expect((await repo.getCredentialsById("theo"))!.member.fullName).toBe("Théo Garnier");
  });
});

describe("ressources", () => {
  test("seul un admin ajoute, avec un lien web valide", async () => {
    const repo = await repositoryWith();
    const form = { id: "", kind: "link", title: "Portfolio", value: "javascript:alert(1)", note: "", sortOrder: "0" };
    expect((await members.saveResource(repo, lea, { ...form, value: "https://exemple.fr" })).ok).toBe(false);
    expect((await members.saveResource(repo, admin, form)).ok).toBe(false);
    expect((await members.saveResource(repo, admin, { ...form, value: "https://exemple.fr" })).ok).toBe(true);
    expect(await repo.listResources()).toHaveLength(1);
  });
});
