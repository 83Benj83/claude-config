"use server";

import { refresh } from "next/cache";
import { getCurrentMember } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { formatRelativeDay, todayIso } from "@/lib/dates";
import { EDITABLE_PAST_DAYS } from "@/lib/rules";
import { entrySchema, fieldErrors, isEditableDate } from "@/lib/validation";

export type EntryFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Incrémenté à chaque succès pour rejouer l'animation de confirmation. */
  version: number;
};

export async function saveEntry(prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const member = await getCurrentMember();
  if (!member) return { ...prev, status: "error", message: "Ta session a expiré : reconnecte-toi." };

  const parsed = entrySchema.safeParse({ date: formData.get("date"), count: formData.get("count") });
  if (!parsed.success) {
    return { ...prev, status: "error", errors: fieldErrors(parsed.error), message: undefined };
  }

  const today = todayIso();
  if (!isEditableDate(parsed.data.date, today)) {
    return {
      ...prev,
      status: "error",
      errors: { date: `Tu peux saisir aujourd'hui et les ${EDITABLE_PAST_DAYS} derniers jours.` },
    };
  }

  try {
    const repository = await getRepository();
    await repository.upsertEntry({ memberId: member.id, date: parsed.data.date, count: parsed.data.count });
  } catch (error) {
    console.error("[saveEntry]", error);
    return { ...prev, status: "error", message: "L'enregistrement a échoué. Réessaie dans un instant." };
  }

  refresh();
  const relative = formatRelativeDay(parsed.data.date, today);
  const day = relative === "Aujourd'hui" || relative === "Hier" ? relative.toLowerCase() : `le ${relative}`;
  const plural = parsed.data.count > 1 ? "s" : "";
  return {
    status: "success",
    message: `${parsed.data.count} prospection${plural} enregistrée${plural} pour ${day}.`,
    version: prev.version + 1,
  };
}
