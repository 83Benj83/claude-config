"use client";

import { DotsThreeIcon, InfoIcon, MoonIcon, PlusIcon, SignOutIcon, SunIcon } from "@phosphor-icons/react";
import { useState, useTransition, type ReactNode } from "react";
import { allNavItems, MOBILE_TABS, NAV_GROUPS, type NavItem } from "@/config/navigation";
import { firstName } from "@/lib/format";
import { isActivePath, usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { BrandMark } from "../primitives/brand-mark";
import { Icon } from "../primitives/icon";
import { Sheet } from "../primitives/sheet";
import { ThemeToggle, toggleTheme, useNextThemeLabel } from "./theme-toggle";

/*
 * Structure de l'application, sans défilement pour changer de rubrique :
 * - ordinateur (≥ 1024 px) : menu latéral complet ;
 * - tablette (768 à 1023 px) : rail d'icônes avec libellés ;
 * - téléphone : barre du haut + barre d'onglets en bas, bouton central « Ajouter ».
 * Échelle de z-index : barres 40, panneaux 50, notifications 60.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, isDemo } = usePlatform();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-dvh md:pl-[5.5rem] lg:pl-[17rem]">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-sm focus:text-on-inverse"
      >
        Aller au contenu
      </a>
      <Sidebar />
      <Rail />
      <MobileTopBar onOpenMore={() => setMoreOpen(true)} />

      <main id="contenu" className="mx-auto w-full max-w-[84rem] px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:pt-8 md:pb-12 lg:px-10">
        {isDemo && <DemoNotice />}
        {children}
      </main>

      <MobileTabBar onOpenMore={() => setMoreOpen(true)} />
      {me && <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />}
    </div>
  );
}

function DemoNotice() {
  const { kind } = usePlatform();
  return (
    <p className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[0.8125rem] text-muted">
      <InfoIcon size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
      <span>
        <strong className="font-medium text-fg">{kind === "preview" ? "Aperçu interactif." : "Mode démo."}</strong>{" "}
        {kind === "preview"
          ? "Les prospects déjà présents sont des exemples ; ce que tu ajoutes est enregistré et visible par toute l'équipe."
          : "Données fictives, remises à zéro au redémarrage."}
      </span>
    </p>
  );
}

function NavLink({ item, variant }: { item: NavItem; variant: "sidebar" | "rail" }) {
  const { Link, pathname } = usePlatform();
  const active = isActivePath(pathname, item.href);
  if (variant === "rail") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[0.6875rem] font-medium transition-colors ${
          active ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <Icon name={item.icon} size={22} weight={active ? "fill" : "regular"} />
        <span className="max-w-full truncate">{item.short}</span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] transition-colors ${
        active ? "bg-accent-soft font-medium text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <Icon name={item.icon} size={20} weight={active ? "fill" : "regular"} />
      {item.label}
    </Link>
  );
}

function Sidebar() {
  const { me, Link } = usePlatform();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <BrandMark />
      </div>
      <div className="px-4">
        <Link
          href="/prospection"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98]"
        >
          <PlusIcon size={18} weight="bold" aria-hidden />
          Ajouter un prospect
        </Link>
      </div>
      <nav aria-label="Navigation principale" className="mt-5 flex-1 overflow-y-auto px-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => me?.isAdmin || !item.adminOnly);
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mb-5">
              <p className="mb-1.5 px-3 text-xs font-medium text-subtle">{group.title}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} variant="sidebar" />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      {me && <UserCard />}
    </aside>
  );
}

function UserCard() {
  const { me } = usePlatform();
  if (!me) return null;
  return (
    <div className="flex items-center gap-3 border-t border-line p-3">
      <Avatar member={me} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{me.fullName}</p>
        <p className="truncate text-xs text-subtle">@{me.login}</p>
      </div>
      <ThemeToggle />
      <SignOutButton compact />
    </div>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { actions, reload } = usePlatform();
  const [pending, start] = useTransition();
  const signOut = () =>
    start(async () => {
      await actions.signOut();
      reload("/connexion");
    });
  if (compact) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <SignOutIcon size={19} aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-[0.9375rem] text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
    >
      <SignOutIcon size={20} aria-hidden />
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}

function Rail() {
  const { me, Link } = usePlatform();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col items-center border-r border-line bg-surface py-4 md:flex lg:hidden">
      <BrandMark compact />
      <Link
        href="/prospection"
        aria-label="Ajouter un prospect"
        className="mt-5 grid size-12 place-items-center rounded-2xl bg-accent text-on-accent shadow-pop transition-transform active:scale-95"
      >
        <PlusIcon size={22} weight="bold" aria-hidden />
      </Link>
      <nav aria-label="Navigation principale" className="mt-4 flex w-full flex-1 flex-col gap-1 overflow-y-auto px-2">
        {allNavItems(Boolean(me?.isAdmin))
          .filter((item) => item.href !== "/prospection")
          .map((item) => (
            <NavLink key={item.href} item={item} variant="rail" />
          ))}
      </nav>
      <ThemeToggle />
      <SignOutButton compact />
    </aside>
  );
}

function MobileTopBar({ onOpenMore }: { onOpenMore: () => void }) {
  const { me } = usePlatform();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line/80 px-4 before:absolute before:inset-0 before:-z-10 before:bg-bg/85 before:backdrop-blur-xl md:hidden">
      <BrandMark />
      {me && (
        <button type="button" onClick={onOpenMore} className="rounded-full" aria-label={`Compte de ${me.fullName}`}>
          <Avatar member={me} size="sm" />
        </button>
      )}
    </header>
  );
}

function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const { Link, pathname } = usePlatform();
  const moreActive = !MOBILE_TABS.some((tab) => isActivePath(pathname, tab.href));
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
        {MOBILE_TABS.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          if (tab.icon === "add") {
            return (
              <li key={tab.href} className="flex justify-center">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  aria-label="Ajouter un prospect"
                  className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-pop ring-4 ring-bg transition-transform active:scale-95"
                >
                  <PlusIcon size={26} weight="bold" aria-hidden />
                </Link>
              </li>
            );
          }
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-1.5 text-[0.6875rem] font-medium ${active ? "text-accent-ink" : "text-muted"}`}
              >
                <Icon name={tab.icon} size={24} weight={active ? "fill" : "regular"} />
                {tab.short}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            className={`flex w-full flex-col items-center gap-0.5 py-1.5 text-[0.6875rem] font-medium ${moreActive ? "text-accent-ink" : "text-muted"}`}
          >
            <DotsThreeIcon size={24} weight="bold" aria-hidden />
            Plus
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Menu « Plus » sur téléphone : les autres rubriques, le thème et la déconnexion. */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, Link, pathname } = usePlatform();
  const themeLabel = useNextThemeLabel();
  const tabs = new Set(MOBILE_TABS.map((tab) => tab.href));
  const items = allNavItems(Boolean(me?.isAdmin)).filter((item) => !tabs.has(item.href));
  return (
    <Sheet open={open} onClose={onClose} title={me ? firstName(me.fullName) : "Menu"} description={me ? `@${me.login}` : undefined} side="bottom">
      <nav aria-label="Autres rubriques">
        <ul className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-20 flex-col justify-between rounded-2xl border p-3 text-sm font-medium ${
                    active ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface-2 text-fg"
                  }`}
                >
                  <Icon name={item.icon} size={22} weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-[0.9375rem] text-muted hover:bg-surface-2 hover:text-fg"
        >
          <MoonIcon size={20} className="theme-icon-light" aria-hidden />
          <SunIcon size={20} className="theme-icon-dark" aria-hidden />
          {themeLabel}
        </button>
        <SignOutButton />
      </div>
    </Sheet>
  );
}
