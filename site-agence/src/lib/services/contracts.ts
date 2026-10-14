import { ADMIN_ONLY, type ActionResult, type ContractFormValues } from "../actions-contract";
import type { Repository } from "../data/repository";
import type { Contract, IsoDate, Member } from "../types";
import { contractSchema, fieldErrors } from "../validation";

/**
 * Règles des contrats, communes au site et à l'aperçu : toute l'équipe les
 * consulte, seuls les admins les ajoutent, les font avancer et les suppriment.
 */
export async function saveContract(
  repository: Repository,
  actor: Member,
  input: ContractFormValues,
  clock: { today: IsoDate; now: string },
): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...fields } = parsed.data;

  const existing = id ? await repository.getContract(id) : null;
  if (id && !existing) return { ok: false, message: "Ce contrat n'existe plus." };
  if (fields.signedOn > clock.today) return { ok: false, errors: { signedOn: "La signature ne peut pas être dans le futur." } };
  if (fields.broughtBy && !(await repository.listMembers()).some((member) => member.id === fields.broughtBy)) {
    return { ok: false, errors: { broughtBy: "Membre introuvable." } };
  }

  // Effectué : date de mise en ligne (aujourd'hui par défaut). En cours : pas encore de mise en ligne.
  const done = fields.status === "termine";
  const deliveredOn = done ? (fields.deliveredOn ?? clock.today) : null;
  if (deliveredOn && deliveredOn < fields.signedOn) {
    return { ok: false, errors: { deliveredOn: "La mise en ligne ne peut pas précéder la signature." } };
  }

  const contract: Contract = {
    ...fields,
    id: id ?? crypto.randomUUID(),
    deliveredOn,
    createdAt: existing?.createdAt ?? clock.now,
    updatedAt: clock.now,
  };
  await repository.saveContract(contract);
  return { ok: true, data: null, message: existing ? "Contrat mis à jour." : `Contrat « ${contract.client} » ajouté.` };
}

export async function deleteContract(repository: Repository, actor: Member, id: string): Promise<ActionResult> {
  if (!actor.isAdmin) return { ok: false, message: ADMIN_ONLY };
  const contract = await repository.getContract(id);
  if (!contract) return { ok: false, message: "Ce contrat n'existe plus." };
  await repository.deleteContract(id);
  return { ok: true, data: null, message: `Contrat « ${contract.client} » supprimé.` };
}
