"use client";

import { ArrowRightIcon, FireIcon, MagnifyingGlassIcon, PlusIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { allNavItems } from "@/config/navigation";
import { formatDayLong } from "@/lib/dates";
import { firstName, formatInt, formatRank, pluralize } from "@/lib/format";
import type { HomeView } from "@/lib/views";
import { ProspectLine } from "../feed-item";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { controlClasses } from "../primitives/field";
import { Icon } from "../primitives/icon";
import { Card, CardHeader, EmptyState } from "../primitives/surface";
import { Podium } from "../ranking/podium";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
}

/** Rubriques proposées en tuiles (les trois actions du quotidien ont déjà leur place en haut). */
const TILE_EXCLUDED = new Set(["/", "/prospection", "/recherche"]);

/** Accueil : ma journée, la vérification « déjà contacté ? », puis toutes les rubriques en tuiles. */
export function HomeScreen({ view }: { view: HomeView }) {
  const { Link, navigate, me } = usePlatform();
  const [query, setQuery] = useState("");
  const tiles = allNavItems(Boolean(me?.isAdmin)).filter((item) => !TILE_EXCLUDED.has(item.href));

  const search = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche");
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-subtle first-letter:uppercase" suppressHydrationWarning>
          {formatDayLong(view.today)}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg sm:text-[2rem]" suppressHydrationWarning>
          {greeting()} {firstName(view.me.fullName)}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <MyDay view={view} />

        {/* Recherche rapide */}
        <Card className="flex flex-col lg:col-span-7" aria-labelledby="deja-contacte">
          <CardHeader
            id="deja-contacte"
            title="Déjà contacté ?"
            description={`Vérifie avant d'appeler : ${formatInt(view.establishmentsCount)} commerces déjà contactés par l'équipe.`}
          />
          <form onSubmit={search} className="flex flex-col gap-3 px-5 pt-4 pb-5 sm:flex-row sm:px-6" role="search">
            <div className="relative flex-1">
              <MagnifyingGlassIcon size={20} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom du restaurant"
                aria-label="Nom du restaurant à vérifier"
                className={`${controlClasses} h-12 pl-11 text-base`}
              />
            </div>
            <button type="submit" className={buttonClasses({ variant: "inverse", size: "lg" })}>
              Vérifier
            </button>
          </form>
          <div className="mt-auto grid grid-cols-3 border-t border-line">
            {[
              { label: "Aujourd'hui", value: view.team.today },
              { label: "Cette semaine", value: view.team.week },
              { label: "Ce mois-ci", value: view.team.month },
            ].map((figure, index) => (
              <div key={figure.label} className={`px-5 py-4 sm:px-6 ${index > 0 ? "border-l border-line" : ""}`}>
                <p className="text-xs text-subtle">{figure.label}</p>
                <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-fg tabular">{formatInt(figure.value)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Toutes les rubriques, en couleur */}
      <nav aria-label="Rubriques">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((item) => (
            <li key={item.href} className={`tone-${item.tone}`}>
              <Link
                href={item.href}
                className="group flex h-full min-h-28 flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--tone)]"
              >
                <span className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--tone-soft)] text-[var(--tone-ink)]">
                    <Icon name={item.icon} size={22} weight="fill" />
                  </span>
                  <ArrowRightIcon size={16} className="text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-[0.9375rem] font-bold tracking-tight text-fg">{item.label}</span>
                  <span className="block text-xs text-subtle">{item.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Podium */}
        <Card className="lg:col-span-5" aria-labelledby="podium-jour">
          <CardHeader
            id="podium-jour"
            title="Podium du jour"
            description={`${view.enteredToday} sur ${view.prospectorCount} ont déjà prospecté`}
            action={
              <Link href="/classement" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-accent-ink hover:underline">
                Classement <ArrowRightIcon size={14} aria-hidden />
              </Link>
            }
          />
          <div className="px-5 pt-6 sm:px-8">
            {view.podium.length > 0 ? (
              <Podium compact places={view.podium} />
            ) : (
              <EmptyState icon={<UsersThreeIcon size={22} aria-hidden />} title="Personne n'a encore prospecté aujourd'hui.">
                Le premier ajout prend la tête.
              </EmptyState>
            )}
          </div>
        </Card>

        {/* Derniers ajouts */}
        <Card className="lg:col-span-7" aria-labelledby="derniers-ajouts">
          <CardHeader
            id="derniers-ajouts"
            title="Derniers prospects de l'équipe"
            action={
              <Link href="/recherche" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-accent-ink hover:underline">
                Tout voir <ArrowRightIcon size={14} aria-hidden />
              </Link>
            }
          />
          {view.feed.length > 0 ? (
            <ul className="px-5 pt-2 pb-3 sm:px-6">
              {view.feed.slice(0, 6).map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <ProspectLine name={item.name} city={item.city} channel={item.channel} date={item.date} today={view.today} by={firstName(item.memberName)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucun prospect pour l'instant.">Les ajouts de l&apos;équipe apparaîtront ici dès le premier commerce contacté.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

/** « Ma journée » sur fond nuit : mon total (ou celui de l'équipe pour qui ne prospecte pas) et le bouton d'ajout. */
function MyDay({ view }: { view: HomeView }) {
  const { Link } = usePlatform();
  const prospector = view.me.isProspector;
  const count = prospector ? view.myToday : view.team.today;
  const chip = "rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5";
  return (
    <section aria-labelledby="ma-journee" className="sky sky-stars relative flex flex-col overflow-hidden rounded-2xl p-5 shadow-card sm:p-6 lg:col-span-5">
      <h2 id="ma-journee" className="font-display text-base font-bold tracking-tight">
        {prospector ? "Ma journée" : "L'équipe aujourd'hui"}
      </h2>
      <p className="mt-3 font-display text-6xl font-bold tracking-tight tabular">{formatInt(count)}</p>
      <p className="text-sm text-[var(--sky-muted)]">{count > 1 ? "prospects aujourd'hui" : "prospect aujourd'hui"}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {prospector ? (
          <>
            <div className={chip}>
              <dt className="flex items-center gap-1.5 text-xs text-[var(--sky-muted)]">
                <FireIcon size={14} aria-hidden /> Série
              </dt>
              <dd className="mt-0.5 font-semibold">{pluralize(view.myStreak, "jour")}</dd>
            </div>
            <div className={chip}>
              <dt className="flex items-center gap-1.5 text-xs text-[var(--sky-muted)]">
                <TrophyIcon size={14} aria-hidden /> Rang du jour
              </dt>
              <dd className="mt-0.5 font-semibold">{view.myRank && view.myToday > 0 ? `${formatRank(view.myRank)} / ${view.prospectorCount}` : "-"}</dd>
            </div>
          </>
        ) : (
          <>
            <div className={chip}>
              <dt className="text-xs text-[var(--sky-muted)]">Prospecteurs actifs</dt>
              <dd className="mt-0.5 font-semibold">
                {view.enteredToday} / {view.prospectorCount}
              </dd>
            </div>
            <div className={chip}>
              <dt className="text-xs text-[var(--sky-muted)]">Cette semaine</dt>
              <dd className="mt-0.5 font-semibold">{formatInt(view.team.week)}</dd>
            </div>
          </>
        )}
      </dl>
      <Link
        href="/prospection"
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#a99bea] px-6 font-semibold text-[#17151f] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
      >
        <PlusIcon size={18} weight="bold" aria-hidden />
        Ajouter un prospect
      </Link>
    </section>
  );
}
