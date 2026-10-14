"use client";

import { useId } from "react";
import { site } from "@/config/site";
import { AppLink } from "../platform";

/** Logo Astrinova : une étoile « nova » violette et une petite étoile dorée, sur fond nuit. */
export function NovaLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b7abf0" />
          <stop offset="1" stopColor="#5b48c2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#17151f" />
      <path d="M30 12c1.6 10.4 6.6 15.4 17 17-10.4 1.6-15.4 6.6-17 17-1.6-10.4-6.6-15.4-17-17 10.4-1.6 15.4-6.6 17-17z" fill={`url(#${gradient})`} />
      <path d="M47 40c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" fill="#e8c177" />
    </svg>
  );
}

/** Logo + nom. `href={null}` : sans lien (hors contexte de navigation). `compact` : logo seul. */
export function BrandMark({ href = "/", compact = false }: { href?: string | null; compact?: boolean }) {
  const content = (
    <>
      <NovaLogo size={compact ? 40 : 34} className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-rotate-6" />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-[1.0625rem] font-bold tracking-tight text-fg">{site.name}</span>
          <span className="block truncate text-[0.6875rem] font-medium tracking-wide text-subtle uppercase">{site.space}</span>
        </span>
      )}
    </>
  );
  if (href === null) return <span className="inline-flex min-w-0 items-center gap-2.5">{content}</span>;
  return (
    <AppLink href={href} className="group inline-flex min-w-0 items-center gap-2.5 rounded-xl" aria-label={`${site.name}, accueil`}>
      {content}
    </AppLink>
  );
}
