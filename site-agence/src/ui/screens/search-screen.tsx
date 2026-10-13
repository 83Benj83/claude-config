"use client";

import { CaretDownIcon, CheckCircleIcon, MagnifyingGlassIcon, MapPinIcon, PlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { channelLabel } from "@/lib/channels";
import { formatDayShort, formatRelativeDay } from "@/lib/dates";
import { searchTokens, type Establishment } from "@/lib/establishments";
import { firstName, formatInt } from "@/lib/format";
import type { DirectoryView } from "@/lib/views";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { controlClasses } from "../primitives/field";
import { ChannelIcon } from "../primitives/icon";
import { Badge, Card, EmptyState, ScreenHeader } from "../primitives/surface";

const SEARCH_DELAY_MS = 300;

type SearchState = { key: string; results: Establishment[] };

/**
 * « Déjà contacté ? » : on tape le nom d'un restaurant, on sait tout de suite
 * si l'équipe l'a déjà démarché, par qui, quand et comment.
 */
export function SearchScreen({ view }: { view: DirectoryView }) {
  const { actions, searchParams, Link } = usePlatform();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [city, setCity] = useState(searchParams.get("ville") ?? "");
  const [search, setSearch] = useState<SearchState | null>(null);
  const citiesId = useId();

  const searchable = searchTokens(query).length > 0;
  const key = `${query.trim()}|${city.trim()}`;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await actions.searchDirectory({ query: query.trim(), city: city.trim() });
      if (!cancelled) setSearch({ key, results });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [actions, query, city, key, searchable]);

  const loading = searchable && search?.key !== key;
  const results = searchable && search?.key === key ? search.results : null;
  const addHref = `/prospection?nom=${encodeURIComponent(query.trim())}${city.trim() ? `&ville=${encodeURIComponent(city.trim())}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Déjà contacté ?"
        description="Vérifie avant d'appeler : tous les établissements contactés par l'équipe sont ici."
      />

      <Card className="p-4 sm:p-5">
        <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="relative">
            <MagnifyingGlassIcon size={22} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom du restaurant"
              aria-label="Nom du restaurant"
              autoFocus
              className={`${controlClasses} h-14 pl-12 text-lg`}
            />
          </div>
          <div className="relative">
            <MapPinIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ville (facultatif)"
              aria-label="Ville (facultatif)"
              list={citiesId}
              className={`${controlClasses} h-14 pl-10`}
            />
            <datalist id={citiesId}>
              {view.cities.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </div>
        </form>
      </Card>

      <div aria-live="polite" className="flex flex-col gap-4">
        {!searchable ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Établissements déjà contactés" value={view.totalEstablishments} />
              <Stat label="Contactés cette semaine" value={view.contactedThisWeek} />
            </div>
            <Card aria-labelledby="recents">
              <h2 id="recents" className="px-5 pt-5 text-[0.9375rem] font-semibold tracking-tight text-fg sm:px-6">
                Contactés récemment
              </h2>
              {view.recent.length > 0 ? (
                <ul className="divide-y divide-line px-2 pt-2 pb-2 sm:px-3">
                  {view.recent.map((establishment) => (
                    <li key={establishment.key}>
                      <EstablishmentRow establishment={establishment} today={view.today} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Aucun établissement pour l'instant.">Les prospects de l&apos;équipe apparaîtront ici.</EmptyState>
              )}
            </Card>
          </>
        ) : loading ? (
          <p className="text-sm text-muted">Recherche…</p>
        ) : results && results.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CheckCircleIcon size={26} weight="fill" className="text-success" aria-hidden />}
              title="Jamais contacté"
              action={
                <Link href={addHref} className={buttonClasses({ className: "mt-2" })}>
                  <PlusIcon size={18} weight="bold" aria-hidden />
                  L&apos;ajouter à mes prospects
                </Link>
              }
            >
              Personne de l&apos;équipe n&apos;a contacté « {query.trim()} »{city.trim() ? ` à ${city.trim()}` : ""}. Il est pour toi.
            </EmptyState>
          </Card>
        ) : results ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-danger">
              <WarningCircleIcon size={18} weight="fill" aria-hidden />
              {results.length > 1 ? `${results.length} établissements déjà contactés correspondent` : "Déjà contacté"}
            </p>
            <Card>
              <ul className="divide-y divide-line px-2 py-2 sm:px-3">
                {results.map((establishment, index) => (
                  <li key={establishment.key}>
                    <EstablishmentRow establishment={establishment} today={view.today} defaultOpen={index === 0 && results.length <= 3} />
                  </li>
                ))}
              </ul>
            </Card>
            <p className="text-sm text-muted">
              Ce n&apos;est pas le bon ?{" "}
              <Link href={addHref} className="font-medium text-accent-ink underline-offset-4 hover:underline">
                Ajouter « {query.trim()} » comme nouveau prospect
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">{formatInt(value)}</p>
    </div>
  );
}

function EstablishmentRow({ establishment, today, defaultOpen = false }: { establishment: Establishment; today: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const last = establishment.contacts[0];
  const detailsId = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
          <ChannelIcon channel={last.channel} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-fg">{establishment.name}</span>
            {establishment.contacts.length > 1 && <Badge tone="accent">{establishment.contacts.length}×</Badge>}
          </span>
          <span className="block truncate text-sm text-subtle">
            {establishment.city}, par {firstName(last.memberName)} {formatRelativeDay(last.date, today).toLowerCase()}
          </span>
        </span>
        <CaretDownIcon size={16} className={`shrink-0 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ol id={detailsId} className="mb-3 ml-[4.25rem] flex flex-col gap-2 border-l border-line pl-4">
          {establishment.contacts.map((contact) => (
            <li key={contact.prospectId} className="text-sm">
              <p className="text-fg">
                <span className="font-medium">{contact.memberName}</span>{" "}
                <span className="text-subtle">
                  le {formatDayShort(contact.date)}, {channelLabel(contact.channel).toLowerCase()}
                </span>
              </p>
              {contact.contact && <p className="text-muted">{contact.contact}</p>}
              {contact.note && <p className="text-muted italic">{contact.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
