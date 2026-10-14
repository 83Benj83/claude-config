import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { cache } from "react";
import { isPresenceDue } from "../activity";
import { getRepository } from "../data";
import { todayIso } from "../dates";
import { getSessionSecret } from "../env";
import { SESSION_DAYS } from "../rules";
import type { Member } from "../types";
import { createToken, readToken } from "./token";

/** Nom du cookie de session (httpOnly, jamais lisible par le JavaScript de la page). */
export const SESSION_COOKIE = "session";

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Membre connecté (session valide, identifiant actif), ou `null`. */
export async function readCurrentMember(): Promise<Member | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // L'expiration se compare à l'heure de la requête, jamais à celle d'un pré-rendu.
  await connection();
  const payload = readToken(token, getSessionSecret());
  if (!payload) return null;
  const repository = await getRepository();
  const credentials = await repository.getCredentialsById(payload.memberId);
  if (!credentials?.member.active || credentials.sessionVersion !== payload.version) return null;
  return credentials.member;
}

/** Même lecture, mémorisée pour le rendu en cours (plusieurs appels dans une page). */
export const getCurrentMember = cache(readCurrentMember);

/**
 * Membre connecté, sinon redirection vers la connexion. Tant que l'écran de
 * bienvenue n'a pas été validé (première connexion), on y renvoie.
 */
export async function requireMember({ allowFirstLogin = false } = {}): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/connexion");
  if (!member.welcomedAt && !allowFirstLogin) redirect("/bienvenue");
  notePresence(member.id, member.lastSeenAt);
  return member;
}

/**
 * Visite notée pour la rubrique Activité : au plus toutes les 5 minutes, une
 * fois par rendu, après l'envoi de la page. Une erreur n'empêche rien.
 */
const notePresence = cache((memberId: string, lastSeenAt: string | null) => {
  const now = new Date();
  if (!isPresenceDue(lastSeenAt, now)) return;
  after(async () => {
    try {
      await (await getRepository()).recordPresence(memberId, todayIso(now), now.toISOString());
    } catch (error) {
      console.error("[activité]", error);
    }
  });
});

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.isAdmin) redirect("/");
  return member;
}

export async function openSession(memberId: string, sessionVersion: number): Promise<void> {
  const expiresAt = Date.now() + SESSION_MS;
  (await cookies()).set(SESSION_COOKIE, createToken({ memberId, version: sessionVersion, expiresAt }, getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function closeSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
