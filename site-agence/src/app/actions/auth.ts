"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createMemberAccount } from "@/lib/auth/accounts";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { getDemoRepository } from "@/lib/data/demo-repository";
import { getInviteCode, getSupabaseConfig } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";

export type AuthFormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

const GENERIC_LOGIN_ERROR = "E-mail ou mot de passe incorrect.";
const TOO_MANY_ATTEMPTS = "Trop de tentatives. Réessaie dans quelques minutes.";

/** 10 tentatives par adresse IP et par quart d'heure, pour la connexion comme pour l'inscription. */
const loginLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
const signupLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnue";
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const config = getSupabaseConfig();
  if (!config) redirect("/connexion");

  const parsed = loginSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  const values = { email: text(formData, "email") };
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!loginLimiter(await clientIp())) return { errors: { form: TOO_MANY_ATTEMPTS }, values };

  const supabase = await createSessionClient(config);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { errors: { form: GENERIC_LOGIN_ERROR }, values };

  redirect("/");
}

function inviteCodeMatches(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const config = getSupabaseConfig();
  if (!config) redirect("/connexion");

  const values = { fullName: text(formData, "fullName"), email: text(formData, "email") };
  const parsed = signupSchema.safeParse({ ...values, password: text(formData, "password"), inviteCode: text(formData, "inviteCode") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!signupLimiter(await clientIp())) return { errors: { form: TOO_MANY_ATTEMPTS }, values };

  const expectedCode = getInviteCode();
  if (!expectedCode) {
    return { errors: { form: "Les inscriptions sont fermées pour le moment. Contacte ton responsable." }, values };
  }
  if (!inviteCodeMatches(parsed.data.inviteCode, expectedCode)) {
    return { errors: { inviteCode: "Code d'invitation invalide." }, values };
  }

  const result = await createMemberAccount(createAdminClient(config), parsed.data);
  if (!result.ok) {
    const message = result.reason === "exists" ? "Un compte existe déjà avec cet e-mail." : "Impossible de créer le compte pour le moment.";
    return { errors: { form: message }, values };
  }

  const supabase = await createSessionClient(config);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) redirect("/connexion");
  redirect("/");
}

/** Connexion du mode démo : on choisit simplement un membre de l'équipe fictive. */
export async function demoSignIn(formData: FormData): Promise<void> {
  if (getSupabaseConfig()) redirect("/connexion");
  const memberId = text(formData, "memberId");
  const member = await getDemoRepository().getMember(memberId);
  if (!member) redirect("/connexion");

  (await cookies()).set(DEMO_SESSION_COOKIE, member.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function signOut(): Promise<void> {
  const config = getSupabaseConfig();
  if (config) {
    const supabase = await createSessionClient(config);
    await supabase.auth.signOut();
  } else {
    (await cookies()).delete(DEMO_SESSION_COOKIE);
  }
  redirect("/connexion");
}
