"use client";

import { createContext, use, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import type { AppActions, CsvExport } from "@/lib/actions-contract";
import type { MemberSummary } from "@/lib/views";

/**
 * Ce que les écrans attendent de leur environnement. Le site (Next.js) et
 * l'aperçu interactif fournissent chacun leur version : les écrans sont
 * identiques dans les deux.
 */
export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode };

export type Platform = {
  /** « site » en production, « preview » dans l'aperçu interactif. */
  kind: "site" | "preview";
  /** Données d'exemple (mode démo ou aperçu) : affiche les comptes de test. */
  isDemo: boolean;
  me: MemberSummary | null;
  Link: ComponentType<LinkProps>;
  pathname: string;
  searchParams: URLSearchParams;
  navigate(href: string, options?: { replace?: boolean }): void;
  /** Recharge complète (connexion, déconnexion) : aucun état ne survit d'un membre à l'autre. */
  reload(href: string): void;
  actions: AppActions;
  download(file: CsvExport): Promise<void>;
  /** Adresse d'affichage ou de téléchargement d'un fichier de l'échange. */
  fileUrl(id: string): string;
};

const PlatformContext = createContext<Platform | null>(null);

export function PlatformProvider({ value, children }: { value: Platform; children: ReactNode }) {
  return <PlatformContext value={value}>{children}</PlatformContext>;
}

export function usePlatform(): Platform {
  const platform = use(PlatformContext);
  if (!platform) throw new Error("usePlatform doit être utilisé sous un PlatformProvider.");
  return platform;
}

export const useActions = () => usePlatform().actions;

/** Lien interne, rendu par le routeur de l'environnement. */
export function AppLink(props: LinkProps) {
  const { Link } = usePlatform();
  return <Link {...props} />;
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Téléchargement d'un fichier texte dans un navigateur classique. */
export async function downloadInBrowser({ filename, content }: CsvExport): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
