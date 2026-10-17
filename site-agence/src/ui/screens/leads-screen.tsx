"use client";

import { ArrowCounterClockwiseIcon, CheckCircleIcon, ListChecksIcon, MagnifyingGlassIcon, PlusIcon, UsersIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { APP_TIME_ZONE, formatDayLong } from "@/lib/dates";
import { normalizeText } from "@/lib/establishments";
import { pluralize } from "@/lib/format";
import { arrondissement, type DoneLeadRow, type LeadRow, type LeadsView } from "@/lib/leads";
import { AddLead } from "../leads/add-lead";
import { ExtractBatch, MyBatch } from "../leads/batch-panel";
import { ImportLeads } from "../leads/import-leads";
import { LEAD_LIST_CLASSES, LeadCard } from "../leads/lead-card";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Card, CardHeader, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });

/**
 * Liste « À contacter » : surtout des commerces à appeler. Chacun ajoute les
 * siens, extrait un fichier de 10 à 50 commerces, ou prend un commerce de la
 * liste : « Effectué » (compté au classement) ou « À rappeler plus tard ».
 */
export function LeadsScreen({ view }: { view: LeadsView }) {
  const [city, setCity] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const inCity = city ? view.open.filter((row) => normalizeText(row.lead.city) === city) : view.open;
  const rows = query.trim() ? inCity.filter((row) => matches(row, query)) : inCity;
  const groups = groupByCity(rows);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="À contacter"
        description="Des commerces à appeler. Extrais un fichier de 10 à 50 commerces, ou prends-en un : une fois appelé, coche « Effectué » ; sinon « À rappeler plus tard »."
        actions={
          <button type="button" onClick={() => setAdding((value) => !value)} aria-expanded={adding} className={buttonClasses({})}>
            <PlusIcon size={18} weight="bold" aria-hidden />
            Ajouter un numéro
          </button>
        }
      />

      {adding && <AddLead cities={view.cities.map((entry) => entry.city)} onDone={() => setAdding(false)} />}

      <MyBatch view={view} />
      {!view.myBatch && <ExtractBatch view={view} />}
      <ImportLeads />

      {view.otherBatches.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <UsersIcon size={16} aria-hidden />
          Fichiers en cours :{" "}
          {view.otherBatches.map((other) => `${other.memberName} (${other.remaining})`).join(", ")}
        </p>
      )}

      {view.open.length === 0 ? (
        <Card>
          <EmptyState icon={<ListChecksIcon size={24} aria-hidden />} title="Rien à contacter pour l'instant.">
            Ajoute un numéro avec le bouton ci-dessus : toute l&apos;équipe en profite.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {view.listDay && (
                <>
                  Liste du <strong className="font-semibold text-fg">{formatDayLong(view.listDay)}</strong> ·{" "}
                </>
              )}
              {pluralize(view.open.length, "commerce")} à contacter
            </p>
            {view.cities.length > 1 && (
              <div className="chip-row" role="group" aria-label="Filtrer par ville">
                <CityChip label={`Toutes (${view.open.length})`} pressed={city === null} onClick={() => setCity(null)} />
                {view.cities.map((entry) => (
                  <CityChip
                    key={entry.city}
                    label={`${entry.city} (${entry.count})`}
                    pressed={city === normalizeText(entry.city)}
                    onClick={() => setCity(normalizeText(entry.city))}
                  />
                ))}
              </div>
            )}
            {view.open.length > SEARCH_FROM && (
              <label className="relative block max-w-md">
                <span className="sr-only">Rechercher un commerce</span>
                <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nom, secteur, arrondissement…"
                  className="h-11 w-full rounded-full border border-line-input bg-surface pr-4 pl-10 text-[0.9375rem] text-fg placeholder:text-subtle focus:border-accent"
                />
              </label>
            )}
          </div>

          {groups.length === 0 && <p className="text-sm text-muted">Aucun commerce ne correspond à « {query.trim()} ».</p>}

          {groups.map((group) => (
            <section key={group.city} aria-label={group.city} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 font-display text-lg font-bold tracking-tight text-fg">
                {group.city}
                <span className="text-sm font-medium text-subtle">{pluralize(group.rows.length, "commerce")}</span>
              </h2>
              <ul className={LEAD_LIST_CLASSES}>
                {group.rows.map((row) => (
                  <li key={row.lead.id} className="min-w-0">
                    <LeadCard row={row} today={view.today} canManage={view.canManage} addedBy={view.addedByNames[row.lead.id]} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {view.doneToday.length > 0 && <DoneToday rows={view.doneToday} />}
    </div>
  );
}

/** Au-delà de ce nombre de commerces, une recherche aide à s'y retrouver. */
const SEARCH_FROM = 12;

/** Recherche sans accents dans le nom, le secteur, l'adresse et l'arrondissement (« 11e »). */
function matches(row: LeadRow, query: string) {
  const { lead } = row;
  const haystack = normalizeText([lead.name, lead.category, lead.address, arrondissement(lead.address), lead.city].filter(Boolean).join(" "));
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function groupByCity(rows: LeadRow[]) {
  const groups: { city: string; rows: LeadRow[] }[] = [];
  const byCity = new Map<string, { city: string; rows: LeadRow[] }>();
  for (const row of rows) {
    const key = normalizeText(row.lead.city);
    let group = byCity.get(key);
    if (!group) {
      group = { city: row.lead.city, rows: [] };
      byCity.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

function CityChip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        pressed ? "border-accent bg-accent-soft text-accent-ink" : "border-line-input bg-surface text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}

/** Coches du jour : qui a pris quoi ; la personne (ou un admin) peut annuler. */
function DoneToday({ rows }: { rows: DoneLeadRow[] }) {
  return (
    <Card aria-labelledby="coches-du-jour">
      <CardHeader id="coches-du-jour" title="Cochés aujourd'hui" description="Ils sont dans les prospects de la personne qui les a cochés." />
      <ul className="mt-3 divide-y divide-line border-t border-line" aria-label="Commerces cochés aujourd'hui">
        {rows.map((row) => (
          <DoneRow key={row.lead.id} row={row} />
        ))}
      </ul>
    </Card>
  );
}

function DoneRow({ row }: { row: DoneLeadRow }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const { lead } = row;

  const undo = () =>
    start(async () => {
      const result = await actions.releaseLead(lead.id);
      toast(result.message ?? (result.ok ? "Coche annulée." : GENERIC_ERROR), result.ok ? "success" : "error");
    });

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <CheckCircleIcon size={20} weight="fill" className="shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {lead.name} <span className="font-normal text-subtle">· {lead.city}</span>
        </p>
        <p className="text-xs text-subtle" suppressHydrationWarning>
          par {row.doneByName}
          {lead.doneAt ? ` à ${timeFormatter.format(new Date(lead.doneAt))}` : ""}
        </p>
      </div>
      {row.canUndo && (
        <button
          type="button"
          disabled={pending}
          onClick={undo}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
          aria-label={`Annuler la coche de ${lead.name}`}
        >
          <ArrowCounterClockwiseIcon size={16} aria-hidden />
          {pending ? "…" : "Annuler"}
        </button>
      )}
    </li>
  );
}
