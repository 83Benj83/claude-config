import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getRepository } from "../data";
import { getSupabaseConfig } from "../env";
import { createSessionClient } from "../supabase/server";
import type { Member } from "../types";

/** Cookie du mode démo : identifiant du membre choisi à la connexion. */
export const DEMO_SESSION_COOKIE = "demo_member";

async function getSessionMemberId(): Promise<string | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return (await cookies()).get(DEMO_SESSION_COOKIE)?.value ?? null;
  }
  const supabase = await createSessionClient(config);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

/** Membre connecté, ou `null`. Mémorisé pour la durée de la requête. */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const memberId = await getSessionMemberId();
  if (!memberId) return null;
  const repository = await getRepository();
  return repository.getMember(memberId);
});

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/connexion");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.isAdmin) redirect("/");
  return member;
}
