"use client";

import type { ReactNode } from "react";

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
        <h2 id={id} className="text-[0.9375rem] font-semibold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** En-tête d'écran : titre, phrase d'accroche, actions à droite. */
export function ScreenHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon && <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">{icon}</span>}
      <p className="text-base font-semibold tracking-tight text-fg">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
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
