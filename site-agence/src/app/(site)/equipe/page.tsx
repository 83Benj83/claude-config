import { GearIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageIntro, Section } from "@/components/page-intro";
import { OrgChart } from "@/components/team/org-chart";
import { buttonClasses } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { getTeamData } from "@/lib/queries";
import { buildOrgTree } from "@/lib/stats";

export const metadata: Metadata = { title: "Équipe" };

export default function EquipePage() {
  return (
    <>
      <PageIntro
        title="L'équipe"
        description="Qui fait quoi et qui travaille avec qui. Chaque fiche de prospecteur affiche son total du mois en cours."
      />
      <Suspense fallback={<TeamSkeleton />}>
        <TeamView />
      </Suspense>
    </>
  );
}

async function TeamView() {
  const { me, members, monthTotals } = await getTeamData();
  const departments = new Set(members.map((m) => m.department).filter(Boolean));
  const prospectors = members.filter((m) => m.isProspector).length;

  return (
    <Section className="mt-8">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-2 text-sm">
          {[pluralize(members.length, "membre"), pluralize(departments.size, "pôle"), pluralize(prospectors, "prospecteur")].map(
            (label) => (
              <li key={label} className="rounded-full border border-line bg-surface px-3 py-1 text-muted">
                {label}
              </li>
            ),
          )}
        </ul>
        {me.isAdmin && (
          <Link href="/admin" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <GearIcon size={16} aria-hidden />
            Gérer l&apos;équipe
          </Link>
        )}
      </div>

      {members.length > 0 ? (
        <div className="dot-grid rounded-2xl border border-line px-4 py-10 sm:px-8 sm:py-14">
          <OrgChart roots={buildOrgTree(members)} meId={me.id} monthTotals={monthTotals} />
        </div>
      ) : (
        <p className="text-muted">Aucun membre pour le moment.</p>
      )}
    </Section>
  );
}

function TeamSkeleton() {
  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden>
      <div className="skeleton mb-10 h-8 w-80 rounded-full" />
      <div className="flex flex-col items-center gap-10 rounded-2xl border border-line p-10">
        <div className="skeleton h-20 w-72" />
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    </div>
  );
}
