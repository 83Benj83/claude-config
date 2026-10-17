"use client";

import type { ReactNode } from "react";
import { NAV_GROUPS } from "@/config/navigation";
import { isActivePath, usePlatform } from "../platform";
import { Icon } from "./icon";

/** Carte : réservée aux blocs qui forment un objet distinct sur l'écran. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
} & Record<`aria-${string}`, string | undefined>) {
  return (
    <Tag className={`min-w-0 rounded-2xl border border-line bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-base font-bold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Rubrique courante et sa famille (« Résultats », « Ressources »…), d'après l'adresse. */
function useSection() {
  const { pathname } = usePlatform();
  for (const group of NAV_GROUPS) {
    const item = group.items.find((candidate) => isActivePath(pathname, candidate.href));
    if (item) return { group: group.title, item };
  }
  return null;
}

/** En-tête d'écran : famille de la rubrique (en couleur), titre, phrase d'accroche, actions à droite. */
export function ScreenHeader({
  title,
  description,
  actions,
  compactOnPhone = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Sur téléphone, sans la phrase d'explication (écrans où chaque ligne compte, comme l'échange). */
  compactOnPhone?: boolean;
}) {
  const section = useSection();
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {section && (
          <p className={`tone-${section.item.tone} mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[var(--tone-ink)] uppercase`}>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--tone-soft)]">
              <Icon name={section.item.icon} size={16} weight="fill" />
            </span>
            {section.group}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[2rem]">{title}</h1>
        {description && <p className={`mt-1.5 max-w-[62ch] text-[0.9375rem] text-muted ${compactOnPhone ? "max-sm:hidden" : ""}`}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon && <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">{icon}</span>}
      <p className="font-display text-lg font-bold tracking-tight text-balance text-fg">{title}</p>
      {children && <div className="max-w-sm text-sm text-pretty text-muted">{children}</div>}
      {action}
    </div>
  );
}

/**
 * Case de chiffre : la même dans toutes les rubriques (bilan, rappels,
 * contrats, admin, activité…). `alert` colore toute la case (à traiter),
 * `accent` seulement le chiffre (à voir aujourd'hui).
 */
export function StatTile({
  label,
  value,
  suffix,
  detail,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  /** Unité en petit après le chiffre (« jours »). */
  suffix?: ReactNode;
  /** Précision sous le chiffre (une date, un nom). */
  detail?: ReactNode;
  tone?: "neutral" | "accent" | "alert";
}) {
  const box = tone === "alert" ? "border-danger/40 bg-danger-soft" : "border-line bg-surface";
  const ink = tone === "alert" ? "text-danger" : tone === "accent" ? "text-accent-ink" : "text-fg";
  return (
    <div className={`min-w-0 rounded-2xl border px-3.5 py-3 sm:px-4 sm:py-3.5 ${box}`}>
      <p className={`text-xs ${tone === "alert" ? "text-danger" : "text-subtle"}`}>{label}</p>
      <p className={`mt-0.5 truncate font-display text-2xl font-bold tracking-tight tabular ${ink}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-subtle">{suffix}</span>}
      </p>
      {detail && <p className="truncate text-xs text-subtle">{detail}</p>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "danger" }) {
  const tones = {
    neutral: "border-line bg-surface-2 text-muted",
    accent: "border-accent/30 bg-accent-soft text-accent-ink",
    success: "border-success/30 bg-success-soft text-success",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
