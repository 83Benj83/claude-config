"use client";

import { ArrowRightIcon, ListIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { navGroupsFor, type NavItem } from "@/config/navigation";
import { site } from "@/config/site";
import { formatDayLong } from "@/lib/dates";
import { firstName } from "@/lib/format";
import type { HomeView } from "@/lib/views";
import { useChatUnread } from "../chat/unread";
import { usePlatform } from "../platform";
import { NovaLogo } from "../primitives/brand-mark";
import { Icon } from "../primitives/icon";
import { NewBadge } from "../shell/app-shell";
import { DueBadge, useCallbacksDue } from "../shell/callbacks-due";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
}

/**
 * Accueil volontairement simple : un mot de bienvenue, puis toutes les
 * rubriques à égalité (aucun chiffre, aucun classement mis en avant).
 */
export function HomeScreen({ view }: { view: HomeView }) {
  const { me } = usePlatform();
  const items = navGroupsFor(Boolean(me?.isAdmin)).flatMap((group) => group.items);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="bienvenue" className="sky sky-stars relative overflow-hidden rounded-3xl px-5 py-6 shadow-card sm:px-10 sm:py-10">
        <NovaLogo size={40} />
        <p className="mt-4 text-sm text-[var(--sky-muted)] first-letter:uppercase sm:mt-5" suppressHydrationWarning>
          {formatDayLong(view.today)}
        </p>
        <h1 id="bienvenue" className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl" suppressHydrationWarning>
          {greeting()} {firstName(view.me.fullName)}
        </h1>
        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--sky-muted)]">
          Bienvenue dans l&apos;espace équipe d&apos;{site.name}. Choisis une rubrique ci-dessous, ou ouvre le{" "}
          <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 font-semibold text-white">
            <ListIcon size={14} weight="bold" aria-hidden />
            Menu
          </span>{" "}
          en haut à gauche, depuis n&apos;importe quelle page.
        </p>
      </section>

      <section aria-labelledby="rubriques">
        <h2 id="rubriques" className="mb-3 font-display text-lg font-bold tracking-tight text-fg">
          Les rubriques
        </h2>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.href} className={`tone-${item.tone} min-w-0`}>
              <SectionTile item={item} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Une rubrique : toutes ont la même taille et le même poids. */
function SectionTile({ item }: { item: NavItem }) {
  const { Link } = usePlatform();
  const hintId = useId();
  const badgeId = useId();
  const unread = useChatUnread() && item.href === "/echange";
  const due = useCallbacksDue();
  const showDue = item.href === "/rappels" && due > 0;
  return (
    <Link
      href={item.href}
      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label={item.label}
      aria-describedby={unread || showDue ? `${hintId} ${badgeId}` : hintId}
      className="group flex h-full items-center gap-3.5 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--tone)] sm:gap-4 sm:p-4"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--tone-soft)] text-[var(--tone-ink)]">
        <Icon name={item.icon} size={23} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-[0.9375rem] font-bold tracking-tight text-fg">{item.label}</span>
          {unread && <NewBadge id={badgeId} />}
          {showDue && <DueBadge id={badgeId} count={due} />}
        </span>
        <span id={hintId} className="block text-xs text-subtle">
          {item.hint}
        </span>
      </span>
      <ArrowRightIcon size={16} className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
