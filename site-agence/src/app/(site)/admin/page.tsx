import { CaretDownIcon, KeyIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { MemberForm } from "@/components/admin/member-form";
import { Avatar } from "@/components/avatar";
import { PageIntro, Section } from "@/components/page-intro";
import { requireAdmin } from "@/lib/auth/session";
import { getInviteCode, isDemoMode } from "@/lib/env";
import { getAdminData } from "@/lib/queries";

export const metadata: Metadata = { title: "Gestion de l'équipe" };

export default function AdminPage() {
  return (
    <>
      <PageIntro
        title="Gestion de l'équipe"
        description="Postes, pôles, responsables et accès. Les changements s'appliquent tout de suite à l'organigramme et au classement."
      />
      <Suspense fallback={<div className="mx-auto mt-8 h-96 max-w-7xl px-4 sm:px-6 lg:px-8"><div className="skeleton h-full rounded-2xl" /></div>}>
        <AdminView />
      </Suspense>
    </>
  );
}

async function AdminView() {
  await requireAdmin();
  const { members } = await getAdminData();
  const departments = [...new Set(members.map((m) => m.department).filter((d): d is string => Boolean(d)))].sort();
  const managers = members.map(({ id, fullName }) => ({ id, fullName }));

  return (
    <Section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <ul className="flex flex-col gap-3">
        {members.map((member) => (
          <li key={member.id}>
            <details className="group rounded-2xl border border-line bg-surface open:shadow-card">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <Avatar member={member} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{member.fullName}</span>
                  <span className="block truncate text-sm text-subtle">
                    {member.jobTitle}
                    {member.department ? `, ${member.department}` : ""}
                  </span>
                </span>
                <span className="hidden gap-1.5 sm:flex">
                  {member.isAdmin && <Badge>Admin</Badge>}
                  {member.isProspector && <Badge>Classement</Badge>}
                </span>
                <CaretDownIcon size={18} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-line p-4 sm:p-6">
                <MemberForm member={member} managers={managers} departments={departments} />
              </div>
            </details>
          </li>
        ))}
      </ul>

      <aside className="rounded-2xl border border-line bg-surface-2 p-5 lg:sticky lg:top-24">
        <h2 className="flex items-center gap-2 font-semibold text-fg">
          <KeyIcon size={18} className="text-accent-ink" aria-hidden />
          Ajouter un membre
        </h2>
        <InviteHelp />
      </aside>
    </Section>
  );
}

function InviteHelp() {
  if (isDemoMode()) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-muted">
        En mode démo, l&apos;équipe est fictive. Une fois Supabase branché, chaque membre crée son compte sur la page
        d&apos;inscription avec le code d&apos;invitation.
      </p>
    );
  }
  const code = getInviteCode();
  return code ? (
    <div className="mt-3 text-sm leading-relaxed text-muted">
      <p>Envoie ce code à la nouvelle recrue, avec le lien de la page « Créer mon compte » :</p>
      <p className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-fg select-all">{code}</p>
      <p className="mt-3">Son profil apparaîtra ici : complète son poste et son responsable.</p>
    </div>
  ) : (
    <p className="mt-3 text-sm leading-relaxed text-muted">
      Inscriptions fermées : définis la variable <code className="font-mono text-fg">TEAM_INVITE_CODE</code> (au moins
      12 caractères) pour les ouvrir.
    </p>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{children}</span>;
}
