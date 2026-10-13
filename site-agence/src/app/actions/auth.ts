"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { getDemoRepository } from "@/lib/data/demo-repository";
import { getInviteCode, getSupabaseConfig } from "@/lib/env";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";

export type AuthFormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

const GENERIC_LOGIN_ERROR = "E-mail ou mot de passe incorrect.";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const config = getSupabaseConfig();
  if (!config) redirect("/connexion");

  const parsed = loginSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  const values = { email: text(formData, "email") };
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

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

  const expectedCode = getInviteCode();
  if (!expectedCode) {
    return { errors: { form: "Les inscriptions sont fermées : aucun code d'invitation n'est configuré." }, values };
  }
  if (!inviteCodeMatches(parsed.data.inviteCode, expectedCode)) {
    return { errors: { inviteCode: "Code d'invitation invalide." }, values };
  }

  // Les inscriptions publiques sont désactivées dans Supabase : seul le serveur crée les comptes.
  const admin = createAdminClient(config);
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError) {
    const alreadyExists = /already|registered|exists/i.test(createError.message);
    return {
      errors: { form: alreadyExists ? "Un compte existe déjà avec cet e-mail." : "Impossible de créer le compte pour le moment." },
      values,
    };
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
