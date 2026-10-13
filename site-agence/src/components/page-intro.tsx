import type { ReactNode } from "react";

/** En-tête de page : titre + phrase d'accroche, actions optionnelles à droite. */
export function PageIntro({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tighter text-fg sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">{description}</p>
        </div>
        {actions}
      </div>
    </div>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
