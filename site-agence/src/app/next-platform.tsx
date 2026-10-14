"use client";

import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import type { AppActions } from "@/lib/actions-contract";
import type { MemberSummary } from "@/lib/views";
import { downloadInBrowser, PlatformProvider, type LinkProps } from "@/ui/platform";
import { ToastProvider } from "@/ui/primitives/toast";
import * as serverActions from "./actions";

/** Les Server Actions du site, vues par les écrans à travers le contrat commun. */
const actions: AppActions = serverActions;

function Link({ href, children, ...rest }: LinkProps) {
  return (
    <NextLink href={href} {...rest}>
      {children}
    </NextLink>
  );
}

/**
 * Environnement Next.js des écrans partagés : liens et navigation du routeur,
 * Server Actions, téléchargement navigateur. Doit être rendu sous `<Suspense>`
 * (lecture des paramètres d'URL).
 */
export function NextPlatform({ me, isDemo, children }: { me: MemberSummary | null; isDemo: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const platform = useMemo(
    () => ({
      kind: "site" as const,
      isDemo,
      me,
      Link,
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
      navigate: (href: string, options?: { replace?: boolean }) => (options?.replace ? router.replace(href) : router.push(href)),
      reload: (href: string) => window.location.assign(href),
      actions,
      download: downloadInBrowser,
      fileUrl: (id: string) => `/fichiers/${encodeURIComponent(id)}`,
    }),
    [isDemo, me, pathname, searchParams, router],
  );

  return (
    <PlatformProvider value={platform}>
      <ToastProvider>{children}</ToastProvider>
    </PlatformProvider>
  );
}
