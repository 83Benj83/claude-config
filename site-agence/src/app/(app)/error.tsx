"use client";

import { ArrowClockwiseIcon, HouseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonClasses } from "@/ui/primitives/button";
import { Card, EmptyState } from "@/ui/primitives/surface";

/**
 * Une rubrique qui plante (base injoignable, coupure réseau…) : un message
 * clair et deux issues, au lieu d'une page blanche. Le menu reste utilisable.
 */
export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[rubrique]", error.digest ?? error.message);
  }, [error]);

  return (
    <Card>
      <EmptyState
        icon={<WarningCircleIcon size={24} aria-hidden />}
        title="Cette rubrique n'a pas pu s'afficher."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className={buttonClasses({})}>
              <ArrowClockwiseIcon size={18} weight="bold" aria-hidden />
              Réessayer
            </button>
            <Link href="/" className={buttonClasses({ variant: "ghost" })}>
              <HouseIcon size={18} aria-hidden />
              Accueil
            </Link>
          </div>
        }
      >
        C&apos;est souvent passager (connexion ou serveur occupé). Réessaie dans un instant ; si ça continue, préviens Paul ou Benjamin.
      </EmptyState>
    </Card>
  );
}
