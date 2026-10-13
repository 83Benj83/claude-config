import type { Metadata } from "next";
import Link from "next/link";
import { demoSignIn } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { DEMO_MEMBERS } from "@/lib/data/demo-seed";
import { isDemoMode } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  if (isDemoMode()) return <DemoLogin />;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter text-fg">Connexion</h1>
      <p className="mt-2 mb-8 text-muted">Content de te revoir. Connecte-toi pour saisir ta journée.</p>
      <LoginForm />
      <p className="mt-8 text-sm text-muted">
        Nouveau dans l&apos;équipe ?{" "}
        <Link href="/inscription" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          Créer mon compte
        </Link>
      </p>
    </>
  );
}

/** En mode démo, on choisit un membre fictif pour explorer le site. */
function DemoLogin() {
  const departments = [...new Set(DEMO_MEMBERS.map((member) => member.department ?? "Équipe"))];
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter text-fg">Choisis un profil</h1>
      <p className="mt-2 mb-8 text-muted">
        Mode démo : entre dans la peau d&apos;un membre de l&apos;équipe fictive pour tester le site.
      </p>
      <div className="flex flex-col gap-6">
        {departments.map((department) => (
          <section key={department} aria-labelledby={`pole-${department}`}>
            <h2 id={`pole-${department}`} className="mb-2 text-sm font-medium text-subtle">
              {department}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {DEMO_MEMBERS.filter((member) => (member.department ?? "Équipe") === department).map((member) => (
                <li key={member.id}>
                  <form action={demoSignIn}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-card active:scale-[0.99]"
                    >
                      <Avatar member={member} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{member.fullName}</span>
                        <span className="block truncate text-xs text-subtle">{member.jobTitle}</span>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
