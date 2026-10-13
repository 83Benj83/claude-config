import Link from "next/link";
import { site } from "@/config/site";

/** Monogramme + nom de l'agence. */
export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 rounded-full" aria-label={`${site.name}, accueil`}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-[0.8125rem] font-bold tracking-tight text-on-accent transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-rotate-6">
        {site.monogram}
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-tight text-fg">{site.name}</span>
    </Link>
  );
}
