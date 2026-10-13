import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentMember } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { DEMO_MEMBERS } from "@/lib/data/demo-seed";
import { isDemoMode } from "@/lib/env";
import { loadLoginChoices } from "@/lib/services/loaders";
import { LoginScreen } from "@/ui/screens/login-screen";
import { NextPlatform } from "../next-platform";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

async function Login() {
  const current = await getCurrentMember();
  if (current) redirect(current.welcomedAt ? "/" : "/bienvenue");

  const choices = await loadLoginChoices(await getRepository());
  const demo = isDemoMode();
  // Comptes d'exemple affichés uniquement en mode démo (données fictives, mots de passe publics).
  const demoAccounts = demo
    ? DEMO_MEMBERS.filter((member) => member.active).map((member) => ({ login: member.login, password: member.demoPassword }))
    : undefined;

  return (
    <NextPlatform me={null} isDemo={demo}>
      <LoginScreen choices={choices} demoAccounts={demoAccounts} />
    </NextPlatform>
  );
}
