"use client";

import { site } from "@/config/site";
import { AppLink } from "../platform";

/** Monogramme + nom de l'agence. `href={null}` : logo seul, sans lien (hors contexte de navigation). */
export function BrandMark({ href = "/", compact = false }: { href?: string | null; compact?: boolean }) {
  const content = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent text-[0.8125rem] font-bold tracking-tight text-on-accent transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-rotate-6">
        {site.monogram}
      </span>
      {!compact && <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-fg">{site.name}</span>}
    </>
  );
  if (href === null) return <span className="inline-flex min-w-0 items-center gap-2.5">{content}</span>;
  return (
    <AppLink href={href} className="group inline-flex min-w-0 items-center gap-2.5 rounded-full" aria-label={`${site.name}, accueil`}>
      {content}
    </AppLink>
  );
}
