import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type NewMember = { fullName: string; email: string; password: string };

export type CreateAccountResult = { ok: true } | { ok: false; reason: "exists" | "failed" };

/**
 * Crée le compte Supabase puis le profil de l'équipe, avec la clé secrète.
 * Seul ce chemin crée des profils : un compte créé directement auprès de
 * Supabase n'en a pas et n'a donc accès à rien (voir la migration SQL).
 * Le tout premier membre devient administrateur.
 */
export async function createMemberAccount(admin: SupabaseClient, member: NewMember): Promise<CreateAccountResult> {
  const { data, error } = await admin.auth.admin.createUser({
    email: member.email,
    password: member.password,
    email_confirm: true,
    user_metadata: { full_name: member.fullName },
  });
  if (error || !data.user) {
    return { ok: false, reason: error && /already|registered|exists/i.test(error.message) ? "exists" : "failed" };
  }

  const { count, error: countError } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const { error: profileError } = countError
    ? { error: countError }
    : await admin.from("profiles").insert({ id: data.user.id, full_name: member.fullName, is_admin: count === 0 });

  if (profileError) {
    console.error("[createMemberAccount] création du profil", profileError);
    // Pas de compte sans profil : on annule la création.
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, reason: "failed" };
  }
  return { ok: true };
}
