import { Suspense, type ReactNode } from "react";
import { readCurrentMember } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { summarize } from "@/lib/views";
import { BrandMark } from "@/ui/primitives/brand-mark";
import { AppShell } from "@/ui/shell/app-shell";
import { ScreenSkeleton } from "@/ui/screens/screen-skeleton";
import { NextPlatform } from "../next-platform";

/**
 * L'entrée dans l'espace connecté attend la lecture de la session (depuis la
 * connexion uniquement) ; la navigation entre rubriques reste instantanée
 * grâce au squelette de chaque écran (loading.tsx).
 */
export const instant = false;

/** Espace connecté : menu, barre d'onglets mobile et écran courant. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

async function SignedIn({ children }: { children: ReactNode }) {
  // Lecture propre au menu ; chaque page vérifie aussi la session (les layouts ne se rejouent pas à la navigation).
  const me = await readCurrentMember();
  if (!me) redirect("/connexion");
  if (!me.welcomedAt) redirect("/bienvenue");
  return (
    <NextPlatform me={summarize(me)} isDemo={isDemoMode()}>
      {/* Chaque écran a son propre squelette (loading.tsx) : la navigation reste instantanée. */}
      <AppShell>{children}</AppShell>
    </NextPlatform>
  );
}

function ShellFallback() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[84rem] flex-col gap-8 px-4 pt-6 sm:px-6 md:pl-[7rem] lg:pl-[19rem]">
      <span className="opacity-60">
        <BrandMark href={null} />
      </span>
      <ScreenSkeleton />
    </div>
  );
}
