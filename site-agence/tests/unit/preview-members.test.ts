import { describe, expect, test } from "vitest";
import { membersFromPreview } from "../../scripts/preview-members";

const HASH = "pbkdf2$600000$c2VsZGV0ZXN0$ZW1wcmVpbnRlZGV0ZXN0";

describe("reprise des identifiants de l'aperçu", () => {
  test("garde noms, postes, rôles, responsable et empreinte ; jamais de mot de passe en clair", () => {
    const { members, problems } = membersFromPreview(
      {
        paul: { login: "paul", fullName: "Paul", jobTitle: "Co-directeur", isAdmin: true, isProspector: false, sortOrder: 0, welcomedAt: "2026-10-14T08:00:00.000Z" },
        julien: { data: { login: "julien", fullName: "Julien", jobTitle: "Chargé de prospection", managerId: "paul", isProspector: true, sortOrder: 2 } },
      },
      { paul: { passwordHash: HASH }, julien: { data: { passwordHash: HASH, sessionVersion: 3 } } },
    );
    expect(problems).toEqual([]);
    expect(members.map((m) => [m.login, m.isAdmin, m.isProspector, m.managerKey, m.welcomedAt])).toEqual([
      ["paul", true, false, null, "2026-10-14T08:00:00.000Z"],
      ["julien", false, true, "paul", null],
    ]);
    expect(members.every((m) => m.passwordHash === HASH && !("password" in m))).toBe(true);
  });

  test("refuse une empreinte absente ou une équipe sans admin", () => {
    const { problems } = membersFromPreview({ julien: { login: "julien", fullName: "Julien" } }, { julien: { passwordHash: "secret" } });
    expect(problems).toEqual(["julien : empreinte du mot de passe absente ou illisible."]);
    expect(membersFromPreview({ a: { login: "a", fullName: "A" } }, { a: { passwordHash: HASH } }).problems).toEqual(["aucun admin actif."]);
  });
});
