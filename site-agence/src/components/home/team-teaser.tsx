import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { getHomeData } from "@/lib/queries";

const MAX_AVATARS = 9;

export async function TeamTeaser() {
  const { members } = await getHomeData();
  const departments = new Map<string, number>();
  for (const member of members) {
    const key = member.department ?? "Équipe";
    departments.set(key, (departments.get(key) ?? 0) + 1);
  }
  const visible = members.slice(0, MAX_AVATARS);
  const hidden = members.length - visible.length;

  return (
    <Reveal className="grid items-center gap-10 rounded-2xl border border-line bg-surface-2 p-6 sm:p-10 lg:grid-cols-2">
      <div>
        <h2 className="text-3xl font-semibold tracking-tighter text-fg sm:text-4xl">
          {pluralize(members.length, "personne")}, {pluralize(departments.size, "pôle")}.
        </h2>
        <p className="mt-4 max-w-[48ch] leading-relaxed text-muted">
          Qui fait quoi, qui manage qui : l&apos;organigramme est à jour et chaque fiche affiche les prospections du mois.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {[...departments].map(([name, count]) => (
            <li key={name} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
              {name} <span className="text-subtle tabular">({count})</span>
            </li>
          ))}
        </ul>
        <Link href="/equipe" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>
          Voir l&apos;organigramme
          <ArrowRightIcon size={16} aria-hidden />
        </Link>
      </div>

      <ul className="flex flex-wrap justify-center gap-y-4 lg:justify-end" aria-label="Membres de l'équipe">
        {visible.map((member, index) => (
          <li key={member.id} className={`-ml-3 first:ml-0 ${index % 2 === 1 ? "lg:translate-y-2.5" : ""}`}>
            <span className="sr-only">{member.fullName}</span>
            <Avatar member={member} size="lg" className="ring-4 ring-surface-2 lg:size-20 lg:text-xl" />
          </li>
        ))}
        {hidden > 0 && (
          <li className="-ml-3 grid size-14 place-items-center rounded-full bg-accent text-base font-semibold text-on-accent ring-4 ring-surface-2 lg:size-20 lg:text-lg">
            +{hidden}
          </li>
        )}
      </ul>
    </Reveal>
  );
}
