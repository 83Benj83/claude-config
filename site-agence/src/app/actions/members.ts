"use server";

import { refresh } from "next/cache";
import { getCurrentMember } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { wouldCreateCycle } from "@/lib/stats";
import { fieldErrors, memberUpdateSchema } from "@/lib/validation";

export type MemberFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export async function updateMember(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const actor = await getCurrentMember();
  if (!actor?.isAdmin) return { status: "error", message: "Action réservée aux administrateurs." };

  const parsed = memberUpdateSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    department: formData.get("department") ?? "",
    managerId: formData.get("managerId") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    isProspector: formData.get("isProspector") === "on",
    isAdmin: formData.get("isAdmin") === "on",
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const { id, ...patch } = parsed.data;
  try {
    const repository = await getRepository();
    const members = await repository.listMembers();
    const target = members.find((member) => member.id === id);
    if (!target) return { status: "error", message: "Ce membre n'existe plus." };

    if (patch.managerId && !members.some((member) => member.id === patch.managerId)) {
      return { status: "error", errors: { managerId: "Responsable introuvable." } };
    }
    if (wouldCreateCycle(members, id, patch.managerId)) {
      return { status: "error", errors: { managerId: "Ce choix créerait une boucle dans l'organigramme." } };
    }
    const remainingAdmins = members.filter((m) => m.isAdmin && m.id !== id).length;
    if (target.isAdmin && !patch.isAdmin && remainingAdmins === 0) {
      return { status: "error", errors: { isAdmin: "Il faut garder au moins un administrateur." } };
    }

    await repository.updateMember(id, patch);
  } catch (error) {
    console.error("[updateMember]", error);
    return { status: "error", message: "La mise à jour a échoué. Réessaie dans un instant." };
  }

  refresh();
  return { status: "success", message: "Modifications enregistrées." };
}
