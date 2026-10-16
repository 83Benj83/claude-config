/**
 * Rappels : les appels à refaire plus tard, pour toute l'équipe. Fonctions
 * pures (tri, regroupement par urgence), communes au site et à l'aperçu.
 */
import { todayIso } from "./dates";
import type { Callback, CallbackPriority, IsoDate, Member } from "./types";

export const PRIORITY_LABELS: Record<CallbackPriority, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  haute: "Haute",
  urgente: "Urgente",
};
const PRIORITY_RANK: Record<CallbackPriority, number> = { urgente: 0, haute: 1, moyenne: 2, faible: 3 };

export type CallbackRow = {
  callback: Callback;
  addedByName: string;
  doneByName: string | null;
  /** « En retard », « Aujourd'hui »… */
  when: "late" | "today" | "soon" | "later";
  /** La personne qui l'a ajouté ou un admin peut le supprimer. */
  canDelete: boolean;
};

export type CallbacksView = {
  today: IsoDate;
  /** En retard, puis aujourd'hui, puis à venir : triés par jour, heure, importance. */
  pending: CallbackRow[];
  counts: { late: number; today: number; pending: number };
  done: CallbackRow[];
};

const SOON_DAYS = 7;

const sortKey = (c: Callback) => `${c.dueOn} ${c.dueTime ?? "99:99"} ${PRIORITY_RANK[c.priority]}`;

export function buildCallbacksView(input: { callbacks: Callback[]; members: Member[]; me: Member; today: IsoDate }): CallbacksView {
  const { me, today } = input;
  const names = new Map(input.members.map((member) => [member.id, member.fullName]));
  const soonLimit = new Date(`${today}T12:00:00Z`);
  soonLimit.setUTCDate(soonLimit.getUTCDate() + SOON_DAYS);
  const soon = soonLimit.toISOString().slice(0, 10);

  const row = (callback: Callback): CallbackRow => ({
    callback,
    addedByName: names.get(callback.addedBy) ?? "Ancien membre",
    doneByName: callback.doneBy ? (names.get(callback.doneBy) ?? "Ancien membre") : null,
    when: callback.dueOn < today ? "late" : callback.dueOn === today ? "today" : callback.dueOn <= soon ? "soon" : "later",
    canDelete: me.isAdmin || callback.addedBy === me.id,
  });

  const pending = input.callbacks
    .filter((c) => c.status === "pending")
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .map(row);
  const done = input.callbacks
    .filter((c) => c.status === "done")
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))
    .map(row);

  return {
    today,
    pending,
    done,
    counts: {
      late: pending.filter((r) => r.when === "late").length,
      today: pending.filter((r) => r.when === "today").length,
      pending: pending.length,
    },
  };
}

/** Jour d'un instant ISO, à l'heure de Paris. */
export const dayOf = (iso: string): IsoDate => todayIso(new Date(iso));
