import { ADMIN_ONLY, type ActionResult, type MockupFormValues } from "../actions-contract";
import type { Repository } from "../data/repository";
import type { IsoDate, Member, Mockup } from "../types";
import { fieldErrors, mockupSchema } from "../validation";

/**
 * Règles des maquettes : toute l'équipe les consulte ; seuls les admins les
 * ajoutent, les font avancer et les suppriment (comme les contrats).
 */
export async function saveMockup(
  repository: Repository,
  actor: Member,
  input: MockupFormValues,
  clock: { today: IsoDate; now: string },
): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const parsed = mockupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...fields } = parsed.data;

  const existing = id ? await repository.getMockup(id) : null;
  if (id && !existing) return { ok: false, message: "Cette maquette n'existe plus." };
  if (fields.startedOn > clock.today) return { ok: false, errors: { startedOn: "Le début ne peut pas être dans le futur." } };
  if (fields.madeBy && !(await repository.listMembers()).some((member) => member.id === fields.madeBy)) {
    return { ok: false, errors: { madeBy: "Membre introuvable." } };
  }

  // Terminée : date de fin (aujourd'hui par défaut). En cours : pas de date de fin.
  const done = fields.status === "terminee";
  const doneOn = done ? (fields.doneOn ?? clock.today) : null;
  if (doneOn && doneOn < fields.startedOn) return { ok: false, errors: { doneOn: "La fin ne peut pas précéder le début." } };
  if (doneOn && doneOn > clock.today) return { ok: false, errors: { doneOn: "La fin ne peut pas être dans le futur." } };

  const mockup: Mockup = { ...fields, id: id ?? crypto.randomUUID(), doneOn, createdAt: existing?.createdAt ?? clock.now, updatedAt: clock.now };
  await repository.saveMockup(mockup);
  return { ok: true, data: null, message: existing ? "Maquette mise à jour." : `Maquette « ${mockup.client} » ajoutée.` };
}

export async function deleteMockup(repository: Repository, actor: Member, id: string): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const mockup = await repository.getMockup(id);
  if (!mockup) return { ok: false, message: "Cette maquette n'existe plus." };
  await repository.deleteMockup(id);
  return { ok: true, data: null, message: `Maquette « ${mockup.client} » supprimée.` };
}
