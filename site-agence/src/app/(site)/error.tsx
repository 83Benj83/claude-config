"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { buttonClasses } from "@/components/ui/button";

/** Erreur inattendue (base de données injoignable, par exemple) : on propose de réessayer. */
export default function SiteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <WarningCircleIcon size={28} aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Impossible de charger cette page.</h1>
      <p className="text-muted">
        Le serveur ou la base de données ne répond pas pour le moment. Réessaie dans quelques secondes.
      </p>
      <button type="button" onClick={() => retry()} className={buttonClasses()}>
        Réessayer
      </button>
    </div>
  );
}
