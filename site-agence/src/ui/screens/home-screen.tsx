"use client";

import { ArrowRightIcon, FireIcon, MagnifyingGlassIcon, PlusIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { formatDayLong } from "@/lib/dates";
import { firstName, formatInt, formatRank, pluralize } from "@/lib/format";
import type { HomeView } from "@/lib/views";
import { TrendChart } from "../charts/trend-chart";
import { ProspectLine } from "../feed-item";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { controlClasses } from "../primitives/field";
import { Card, CardHeader, EmptyState } from "../primitives/surface";
import { Podium } from "../ranking/podium";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
}

/** Tableau de bord : tout l'essentiel de la journée, sans défiler. */
export function HomeScreen({ view }: { view: HomeView }) {
  const { Link, navigate } = usePlatform();
  const [query, setQuery] = useState("");

  const search = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-subtle first-letter:uppercase" suppressHydrationWarning>
            {formatDayLong(view.today)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl" suppressHydrationWarning>
            {greeting()} {firstName(view.me.fullName)}
          </h1>
        </div>
        <Link href="/prospection" className={buttonClasses({ className: "max-sm:hidden" })}>
          <PlusIcon size={18} weight="bold" aria-hidden />
          Ajouter un prospect
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Ma journée */}
        <Card className="relative overflow-hidden lg:col-span-4" aria-labelledby="ma-journee">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-accent/12 blur-2xl" />
          <CardHeader id="ma-journee" title="Ma journée" />
          <div className="px-5 pt-3 pb-5 sm:px-6">
            {view.me.isProspector ? (
              <>
                <p className="text-6xl font-semibold tracking-tighter text-fg">{formatInt(view.myToday)}</p>
                <p className="text-sm text-muted">{view.myToday > 1 ? "prospects aujourd'hui" : "prospect aujourd'hui"}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-xs text-subtle">
                      <FireIcon size={14} aria-hidden /> Série
                    </dt>
                    <dd className="mt-0.5 font-semibold text-fg">{pluralize(view.myStreak, "jour")}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-xs text-subtle">
                      <TrophyIcon size={14} aria-hidden /> Rang du jour
                    </dt>
                    <dd className="mt-0.5 font-semibold text-fg">
                      {view.myRank && view.myToday > 0 ? `${formatRank(view.myRank)} / ${view.prospectorCount}` : "-"}
                    </dd>
                  </div>
                </dl>
                <Link href="/prospection" className={buttonClasses({ className: "mt-5 w-full sm:hidden" })}>
                  <PlusIcon size={18} weight="bold" aria-hidden />
                  Ajouter un prospect
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">Tu n&apos;apparais pas dans le classement : tes ajouts restent visibles par l&apos;équipe.</p>
            )}
          </div>
        </Card>

        {/* Recherche rapide */}
        <Card className="lg:col-span-8" aria-labelledby="deja-contacte">
          <CardHeader
            id="deja-contacte"
            title="Déjà contacté ?"
            description={`${formatInt(view.establishmentsCount)} établissements déjà contactés par l'équipe`}
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
          <div className="grid grid-cols-3 border-t border-line">
            {[
              { label: "Aujourd'hui", value: view.team.today },
              { label: "Cette semaine", value: view.team.week },
              { label: "Ce mois-ci", value: view.team.month },
            ].map((figure, index) => (
              <div key={figure.label} className={`px-5 py-4 sm:px-6 ${index > 0 ? "border-l border-line" : ""}`}>
                <p className="text-xs text-subtle">{figure.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">{formatInt(figure.value)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Podium */}
        <Card className="lg:col-span-5" aria-labelledby="podium-jour">
          <CardHeader
            id="podium-jour"
            title="Podium du jour"
            description={`${view.enteredToday} sur ${view.prospectorCount} ont déjà prospecté`}
            action={
              <Link href="/classement" className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:underline">
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

        {/* Tendance */}
        <Card className="p-5 sm:p-6 lg:col-span-7">
          <TrendChart points={view.trend} label="Prospects de l'équipe, 14 derniers jours" />
        </Card>

        {/* Derniers ajouts */}
        <Card className="lg:col-span-12" aria-labelledby="derniers-ajouts">
          <CardHeader
            id="derniers-ajouts"
            title="Derniers prospects de l'équipe"
            action={
              <Link href="/recherche" className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:underline">
                Tout voir <ArrowRightIcon size={14} aria-hidden />
              </Link>
            }
          />
          {view.feed.length > 0 ? (
            <ul className="grid gap-x-8 px-5 pt-2 pb-3 sm:px-6 md:grid-cols-2">
              {view.feed.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                  <ProspectLine name={item.name} city={item.city} channel={item.channel} date={item.date} today={view.today} by={firstName(item.memberName)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucun prospect pour l'instant.">Les ajouts de l&apos;équipe apparaîtront ici.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
