"use server";

/**
 * Server Actions du site : chacune vérifie la session, puis délègue aux
 * services partagés (les mêmes règles que l'aperçu interactif).
 * Elles sont joignables par POST direct : rien n'est supposé côté client.
 */
import { refresh } from "next/cache";
import { headers } from "next/headers";
import {
  GENERIC_ERROR,
  SESSION_EXPIRED,
  type ActionResult,
  type ContractFormValues,
  type CsvExport,
  type MemberFormValues,
  type ProspectFormValues,
  type ResourceFormValues,
} from "@/lib/actions-contract";
import { closeSession, getCurrentMember, openSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { loginKey } from "@/lib/data/repository";
import { todayIso } from "@/lib/dates";
import type { DuplicateCheck, Establishment } from "@/lib/establishments";
import { createRateLimiter } from "@/lib/rate-limit";
import * as contracts from "@/lib/services/contracts";
import * as members from "@/lib/services/members";
import * as prospects from "@/lib/services/prospects";
import type { Member, Prospect } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

/*
 * Freins contre les essais en série, sur un quart d'heure :
 * - 30 essais par adresse IP ;
 * - 8 échecs par identifiant depuis une même adresse (quelqu'un qui se trompe) ;
 * - 50 essais par identifiant toutes adresses confondues, comptés avant la
 *   vérification (les requêtes parallèles ne passent pas entre les mailles).
 *   Plafond volontairement haut : un tiers ne bloque pas facilement un collègue.
 */
const WINDOW_MS = 15 * 60_000;
const ipLimiter = createRateLimiter({ limit: 30, windowMs: WINDOW_MS });
const failuresByLoginAndIp = createRateLimiter({ limit: 8, windowMs: WINDOW_MS });
const attemptsByLogin = createRateLimiter({ limit: 50, windowMs: WINDOW_MS });
const TOO_MANY_ATTEMPTS = "Trop de tentatives. Réessaie dans quelques minutes.";

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnue";
}

export async function signIn(input: { login: string; password: string }): Promise<ActionResult<{ next: string }>> {
  const ip = await clientIp();
  if (!ipLimiter(ip)) return { ok: false, message: TOO_MANY_ATTEMPTS };
  // Même normalisation que la recherche de l'identifiant : « Paul », « paúl »… comptent ensemble.
  const key = loginKey(String(input?.login ?? ""));
  const pairKey = `${key}|${ip}`;
  if (!failuresByLoginAndIp(pairKey, Date.now(), { peek: true }) || !attemptsByLogin(key)) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const repository = await getRepository();
  const result = await members.authenticate(repository, { login: String(input?.login ?? ""), password: String(input?.password ?? "") });
  if (!result.ok) {
    if (result.message) failuresByLoginAndIp(pairKey);
    return { ok: false, message: result.message, errors: result.errors };
  }

  const { member, sessionVersion } = result.credentials;
  await repository.updateMember(member.id, { lastLoginAt: new Date().toISOString() });
  await openSession(member.id, sessionVersion);
  return { ok: true, data: { next: member.welcomedAt ? "/" : "/bienvenue" } };
}

export async function signOut(): Promise<void> {
  await closeSession();
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function withMember<T>(
  run: (actor: Member) => Promise<ActionResult<T>>,
  { allowFirstLogin = false } = {},
): Promise<ActionResult<T>> {
  const actor = await getCurrentMember();
  if (!actor || (!actor.welcomedAt && !allowFirstLogin)) return { ok: false, message: SESSION_EXPIRED };
  try {
    const result = await run(actor);
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

const clock = () => ({ today: todayIso(), now: new Date().toISOString() });

/* ------------------------------------------------------------------ */
/* Actions de l'application                                            */
/* ------------------------------------------------------------------ */

export async function completeWelcome(input: { fullName: string }): Promise<ActionResult> {
  return withMember(async (actor) => members.completeWelcome(await getRepository(), actor, input, clock().now), {
    allowFirstLogin: true,
  });
}

export async function addProspect(input: ProspectFormValues): Promise<ActionResult<{ prospect: Prospect; todayCount: number }>> {
  return withMember(async (actor) => prospects.addProspect(await getRepository(), actor, input, clock()));
}

export async function deleteProspect(id: string): Promise<ActionResult> {
  return withMember(async (actor) => prospects.deleteProspect(await getRepository(), actor, String(id), clock().today));
}

export async function checkEstablishment(input: { name: string; city: string }): Promise<DuplicateCheck> {
  const actor = await getCurrentMember();
  if (!actor) return { sameCity: null, otherCities: [] };
  return prospects.checkEstablishment(await getRepository(), String(input?.name ?? ""), String(input?.city ?? ""));
}

export async function searchDirectory(input: { query: string; city: string }): Promise<Establishment[]> {
  const actor = await getCurrentMember();
  if (!actor) return [];
  return prospects.searchDirectory(await getRepository(), String(input?.query ?? ""), String(input?.city ?? ""));
}

export async function saveResource(input: ResourceFormValues): Promise<ActionResult> {
  return withMember(async (actor) => members.saveResource(await getRepository(), actor, input));
}

export async function deleteResource(id: string): Promise<ActionResult> {
  return withMember(async (actor) => members.deleteResource(await getRepository(), actor, String(id)));
}

export async function saveMember(input: MemberFormValues): Promise<ActionResult> {
  return withMember(async (actor) => members.saveMember(await getRepository(), actor, input));
}

export async function resetStatistics(input: { confirmation: string }): Promise<ActionResult> {
  return withMember(async (actor) => members.resetStatistics(await getRepository(), actor, String(input?.confirmation ?? ""), clock().now));
}

export async function saveContract(input: ContractFormValues): Promise<ActionResult> {
  return withMember(async (actor) => contracts.saveContract(await getRepository(), actor, input, clock()));
}

export async function deleteContract(id: string): Promise<ActionResult> {
  return withMember(async (actor) => contracts.deleteContract(await getRepository(), actor, String(id)));
}

export async function exportCsv(input: { month: string; kind: "bilan" | "prospects" }): Promise<ActionResult<CsvExport>> {
  const actor = await getCurrentMember();
  if (!actor?.welcomedAt) return { ok: false, message: SESSION_EXPIRED };
  const kind = input?.kind === "prospects" ? "prospects" : "bilan";
  return prospects.exportCsv(await getRepository(), actor, { month: String(input?.month ?? ""), kind }, clock().today);
}
