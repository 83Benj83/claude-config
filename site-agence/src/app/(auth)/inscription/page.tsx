import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer mon compte" };

export default function InscriptionPage() {
  if (isDemoMode()) redirect("/connexion");

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter text-fg">Créer mon compte</h1>
      <p className="mt-2 mb-8 text-muted">Il te faut le code d&apos;invitation transmis par ton responsable.</p>
      <SignupForm />
      <p className="mt-8 text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
