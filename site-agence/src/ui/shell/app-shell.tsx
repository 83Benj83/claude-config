"use client";

import { InfoIcon, ListIcon, SignOutIcon } from "@phosphor-icons/react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { HOME_ITEM, navGroupsFor, type NavItem } from "@/config/navigation";
import { ChatUnreadProvider, useChatUnread } from "../chat/unread";
import { isActivePath, usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { BrandMark } from "../primitives/brand-mark";
import { Icon } from "../primitives/icon";
import { Sheet } from "../primitives/sheet";
import { CallbacksDueProvider, DueBadge, useCallbacksDue } from "./callbacks-due";
import { ThemeToggle } from "./theme-toggle";

/*
 * Structure de l'application, la même sur téléphone, tablette et ordinateur :
 * une barre en haut avec le bouton « Menu » à gauche, qui ouvre toutes les
 * rubriques dans un tiroir. Le contenu prend toute la largeur.
 * Échelle de z-index : barre 40, panneaux 50, notifications 60.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, isDemo, pathname } = usePlatform();
  // Le menu reste ouvert tant qu'on est sur la rubrique où on l'a ouvert :
  // un changement de page (lien, retour arrière) le referme.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;
  const closeMenu = () => setOpenedAt(null);

  return (
    <ChatUnreadProvider>
      <CallbacksDueProvider>
      <div className="min-h-dvh">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-sm focus:text-on-inverse"
        >
          Aller au contenu
        </a>
        <TopBar menuOpen={menuOpen} onOpenMenu={() => setOpenedAt(pathname)} />

        <main id="contenu" className="mx-auto w-full max-w-6xl px-4 pt-5 pb-16 sm:px-6 md:pt-8 lg:px-8">
          {isDemo && <DemoNotice />}
          {children}
        </main>

        {me && <MenuDrawer open={menuOpen} onClose={closeMenu} />}
      </div>
      </CallbacksDueProvider>
    </ChatUnreadProvider>
  );
}

/** Pastille « Nouveau » : quelqu'un a écrit dans l'échange depuis la dernière visite. */
export function NewBadge({ id }: { id: string }) {
  return (
    <span id={id} className="tone-coral shrink-0 rounded-full bg-[var(--tone)] px-2 py-0.5 text-[0.6875rem] font-semibold text-white">
      Nouveau
    </span>
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
          ? "Ce que tu ajoutes est enregistré et visible par toutes les personnes qui ont accès à cet aperçu."
          : "Données fictives, remises à zéro au redémarrage."}
      </span>
    </p>
  );
}

/** Barre du haut : le menu à gauche, le nom de l'espace, le thème à droite. */
function TopBar({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  const { me } = usePlatform();
  const unread = useChatUnread();
  const due = useCallbacksDue();
  const notices = [unread ? "nouveaux messages dans l'échange" : null, due > 0 ? `${due} rappel${due > 1 ? "s" : ""} à faire aujourd'hui` : null].filter(Boolean);
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 before:absolute before:inset-0 before:-z-10 before:bg-bg/85 before:backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-3 sm:px-5 lg:px-7">
        {me && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-describedby={notices.length > 0 ? "menu-nouveaux" : undefined}
            className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-fg shadow-card transition-colors hover:border-accent hover:text-accent-ink"
          >
            <ListIcon size={22} weight="bold" aria-hidden />
            Menu
            {notices.length > 0 && (
              <span className={`${unread ? "tone-coral" : "tone-violet"} absolute -top-1 -right-1 size-3 rounded-full bg-[var(--tone)] ring-2 ring-bg`} aria-hidden />
            )}
          </button>
        )}
        {notices.length > 0 && (
          <span id="menu-nouveaux" className="sr-only first-letter:uppercase">
            {notices.join(" ; ")}
          </span>
        )}
        <BrandMark />
        <ThemeToggle className="ml-auto shrink-0" />
      </div>
    </header>
  );
}

/** Le menu : toutes les rubriques regroupées par usage, puis le compte. */
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me } = usePlatform();
  if (!me) return null;
  return (
    <Sheet open={open} onClose={onClose} title="Menu" side="left" footer={<AccountRow />}>
      <nav aria-label="Menu principal" className="-mx-2.5 flex flex-col gap-5">
        <MenuLink item={HOME_ITEM} onNavigate={onClose} />
        {navGroupsFor(me.isAdmin).map((group) => (
          <section key={group.title} aria-labelledby={`menu-${group.title}`}>
            <h3 id={`menu-${group.title}`} className="mb-1 px-2.5 text-xs font-semibold tracking-[0.08em] text-subtle uppercase">
              {group.title}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <MenuLink item={item} onNavigate={onClose} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </Sheet>
  );
}

function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { Link, pathname } = usePlatform();
  const active = isActivePath(pathname, item.href);
  const hintId = useId();
  const badgeId = useId();
  const unread = useChatUnread() && item.href === "/echange";
  const due = useCallbacksDue();
  const showDue = item.href === "/rappels" && due > 0;
  return (
    <Link
      href={item.href}
      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      aria-describedby={unread || showDue ? `${hintId} ${badgeId}` : hintId}
      className={`tone-${item.tone} flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors ${
        active ? "bg-[var(--tone-soft)]" : "hover:bg-surface-2"
      }`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-[var(--tone-ink)] ${active ? "bg-surface" : "bg-[var(--tone-soft)]"}`}
      >
        <Icon name={item.icon} size={21} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[0.9375rem] font-semibold ${active ? "text-[var(--tone-ink)]" : "text-fg"}`}>{item.label}</span>
        <span id={hintId} className="block truncate text-xs text-subtle">
          {item.hint}
        </span>
      </span>
      {unread && <NewBadge id={badgeId} />}
      {showDue && <DueBadge id={badgeId} count={due} />}
    </Link>
  );
}

/** Pied du menu : qui est connecté, et la déconnexion. */
function AccountRow() {
  const { me, actions, reload } = usePlatform();
  const [pending, start] = useTransition();
  if (!me) return null;
  const signOut = () =>
    start(async () => {
      await actions.signOut();
      reload("/connexion");
    });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <Avatar member={me} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{me.fullName}</p>
          <p className="text-xs text-subtle">{me.jobTitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
      >
        <SignOutIcon size={19} aria-hidden />
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </button>
    </div>
  );
}
