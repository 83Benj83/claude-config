import { type ActionResult } from "../actions-contract";
import type { Repository } from "../data/repository";
import type { Callback, IsoDate, Member } from "../types";
import { callbackSchema } from "../validation";

type Clock = { today: IsoDate; now: string };

const GONE = "Ce rappel n'existe plus.";

function firstErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

/** Valide la saisie d'un rappel (formulaire ou fiche d'un commerce). */
export function parseCallback(input: unknown, clock: Clock): { ok: true; data: ReturnType<typeof callbackSchema.parse> } | { ok: false; errors: Record<string, string> } {
  const parsed = callbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error) };
  if (parsed.data.dueOn < clock.today) return { ok: false, errors: { dueOn: "Choisis aujourd'hui ou un jour à venir." } };
  return { ok: true, data: parsed.data };
}

/** Enregistre un appel à refaire, visible de toute l'équipe avec le nom de la personne qui l'ajoute. */
export async function addCallback(
  repository: Repository,
  actor: Member,
  input: unknown,
  clock: Clock,
  leadId: string | null = null,
): Promise<ActionResult<{ callback: Callback }>> {
  const parsed = parseCallback(input, clock);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, message: "Vérifie les champs en rouge." };
  const callback: Callback = {
    id: crypto.randomUUID(),
    ...parsed.data,
    addedBy: actor.id,
    leadId,
    status: "pending",
    doneBy: null,
    doneAt: null,
    createdAt: clock.now,
  };
  await repository.saveCallback(callback);
  return { ok: true, data: { callback }, message: `${callback.name} : rappel enregistré pour toute l'équipe.` };
}

/** Coche un rappel fait : il disparaît de la liste à rappeler. */
export async function completeCallback(repository: Repository, actor: Member, id: unknown, clock: Clock): Promise<ActionResult> {
  const callback = await repository.getCallback(String(id ?? ""));
  if (!callback) return { ok: false, message: GONE };
  if (callback.status === "done") return { ok: true, data: null, message: "Déjà fait." };
  if (!(await repository.completeCallback(callback.id, actor.id, clock.now))) return { ok: true, data: null, message: "Déjà fait." };
  return { ok: true, data: null, message: `${callback.name} : rappel fait.` };
}

/** Annule la coche (tout membre) : le rappel revient dans la liste. */
export async function reopenCallback(repository: Repository, _actor: Member, id: unknown): Promise<ActionResult> {
  const callback = await repository.getCallback(String(id ?? ""));
  if (!callback) return { ok: false, message: GONE };
  await repository.reopenCallback(callback.id);
  return { ok: true, data: null, message: `${callback.name} est de retour dans les rappels.` };
}

/** Repousse un rappel à un autre jour ou une autre heure. */
export async function rescheduleCallback(
  repository: Repository,
  _actor: Member,
  input: { id: unknown; dueOn: unknown; dueTime: unknown; priority?: unknown },
  clock: Clock,
): Promise<ActionResult> {
  const callback = await repository.getCallback(String(input?.id ?? ""));
  if (!callback || callback.status !== "pending") return { ok: false, message: GONE };
  const parsed = parseCallback(
    { ...callback, city: callback.city ?? "", phone: callback.phone ?? "", contactName: callback.contactName ?? "", note: callback.note ?? "", dueOn: input.dueOn, dueTime: input.dueTime ?? "", priority: input.priority ?? callback.priority },
    clock,
  );
  if (!parsed.ok) return { ok: false, errors: parsed.errors, message: Object.values(parsed.errors)[0] };
  await repository.saveCallback({ ...callback, dueOn: parsed.data.dueOn, dueTime: parsed.data.dueTime, priority: parsed.data.priority });
  return { ok: true, data: null, message: `${callback.name} : rappel reporté.` };
}

export async function deleteCallback(repository: Repository, actor: Member, id: unknown): Promise<ActionResult> {
  const callback = await repository.getCallback(String(id ?? ""));
  if (!callback) return { ok: false, message: GONE };
  if (!actor.isAdmin && callback.addedBy !== actor.id) return { ok: false, message: "Seule la personne qui l'a ajouté (ou un admin) peut le supprimer." };
  await repository.deleteCallback(callback.id);
  return { ok: true, data: null, message: `${callback.name} : rappel supprimé.` };
}

/** Rappels à faire aujourd'hui ou en retard : la pastille du menu et de l'accueil. */
export async function callbacksDue(repository: Repository, clock: Clock): Promise<number> {
  const all = await repository.listCallbacks(clock.now);
  return all.filter((callback) => callback.status === "pending" && callback.dueOn <= clock.today).length;
}
