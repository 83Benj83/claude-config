import { Suspense, type ReactNode } from "react";
import { ScreenSkeleton } from "@/ui/screens/screen-skeleton";

/**
 * Limite de chargement propre à chaque écran : en naviguant d'une rubrique à
 * l'autre, le squelette s'affiche tout de suite, les données suivent.
 */
export function Screen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>;
}
