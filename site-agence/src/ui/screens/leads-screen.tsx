"use client";

import { ArrowCounterClockwiseIcon, CheckCircleIcon, CheckSquareIcon, ListChecksIcon, TrashIcon } from "@phosphor-icons/react";
import { useId, useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { channelLabel } from "@/lib/channels";
import { APP_TIME_ZONE, formatDayLong, formatDayShort } from "@/lib/dates";
import { normalizeText } from "@/lib/establishments";
import { pluralize } from "@/lib/format";
import type { DoneLeadRow, LeadRow, LeadsView } from "@/lib/leads";
import type { Channel } from "@/lib/types";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { CopyButton } from "../primitives/copy-button";
import { Icon } from "../primitives/icon";
import { Card, CardHeader, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });

/**
 * Liste « À contacter » : les commerces sans site web, ville par ville. On
 * contacte, on coche : le commerce passe dans ses prospects du jour et sort
 * de la liste pour toute l'équipe.
 */
export function LeadsScreen({ view }: { view: LeadsView }) {
  const [city, setCity] = useState<string | null>(null);
  const rows = city ? view.open.filter((row) => normalizeText(row.lead.city) === city) : view.open;
  const groups = groupByCity(rows);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="À contacter"
        description="Des commerces sans site web, ville par ville. Contacte-en un, puis coche-le : il passe dans tes prospects du jour et sort de la liste pour toute l'équipe."
      />

      {view.open.length === 0 ? (
        <Card>
          <EmptyState icon={<ListChecksIcon size={24} aria-hidden />} title="Rien à contacter pour l'instant.">
            La prochaine liste arrive bientôt. En attendant, tu peux prospecter de ton côté.
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
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par ville">
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
          </div>

          {groups.map((group) => (
            <section key={group.city} aria-label={group.city} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 font-display text-lg font-bold tracking-tight text-fg">
                {group.city}
                <span className="text-sm font-medium text-subtle">{pluralize(group.rows.length, "commerce")}</span>
              </h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {group.rows.map((row) => (
                  <li key={row.lead.id} className="min-w-0">
                    <LeadCard row={row} canManage={view.canManage} />
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

function groupByCity(rows: LeadRow[]) {
  const groups: { city: string; rows: LeadRow[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && normalizeText(last.city) === normalizeText(row.lead.city)) last.rows.push(row);
    else groups.push({ city: row.lead.city, rows: [row] });
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

/** Lien direct vers la coordonnée : appel, e-mail, page Instagram ou Facebook. */
function ContactLink({ channel, value }: { channel: Channel; value: string }) {
  const className = "min-w-0 flex-1 truncate text-sm font-medium text-fg underline-offset-2 hover:underline";
  if (channel === "telephone") return <a className={className} href={`tel:${value.replace(/[^\d+]/g, "")}`}>{value}</a>;
  if (channel === "email") return <a className={className} href={`mailto:${value}`}>{value}</a>;
  const path = value.replace(/^https:\/\/(?:www\.|m\.)?/, "").replace(/\/$/, "");
  const label = channel === "instagram" ? `@${path.split("/").pop()}` : path;
  return (
    <a className={className} href={value} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

function LeadCard({ row, canManage }: { row: LeadRow; canManage: boolean }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const titleId = useId();
  const { lead, contacts, known } = row;
  const choices = [...new Set<Channel>([...contacts.map((contact) => contact.channel), "visite", "autre"])];
  const [ticking, setTicking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [channel, setChannel] = useState<Channel>(choices[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      toast(result.message ?? "C'est fait.");
    });

  return (
    <article aria-labelledby={titleId} className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="font-display text-lg leading-tight font-bold tracking-tight text-fg">
            {lead.name}
          </h3>
          <p className="mt-0.5 text-sm text-subtle">{[lead.category, lead.city].filter(Boolean).join(" · ")}</p>
        </div>
        {canManage && !removing && (
          <button
            type="button"
            onClick={() => setRemoving(true)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
            aria-label={`Retirer ${lead.name} de la liste`}
          >
            <TrashIcon size={18} aria-hidden />
          </button>
        )}
      </header>

      {known && (
        <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm text-gold-ink">
          Déjà contacté par <strong className="font-semibold">{known.name}</strong> le {formatDayShort(known.date)} ({channelLabel(known.channel)}).
        </p>
      )}

      {contacts.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label={`Coordonnées de ${lead.name}`}>
          {contacts.map((contact) => (
            <li key={contact.channel} className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                <Icon name={`channel-${contact.channel}`} size={16} />
                <span className="sr-only">{channelLabel(contact.channel)} :</span>
              </span>
              <ContactLink channel={contact.channel} value={contact.value} />
              <CopyButton text={contact.value} label={`Copier : ${channelLabel(contact.channel)}`} compact />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-subtle">Pas de coordonnées : à démarcher sur place.</p>
      )}

      {lead.note && <p className="text-sm text-muted">{lead.note}</p>}

      <div className="mt-auto pt-1">
        {removing ? (
          <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3">
            <p className="text-sm text-fg">Retirer {lead.name} de la liste pour toute l&apos;équipe ?</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => actions.deleteLead(lead.id))}
                className={buttonClasses({ variant: "secondary", size: "sm", className: "border-danger text-danger" })}
              >
                {pending ? "Retrait…" : "Retirer"}
              </button>
              <button type="button" onClick={() => setRemoving(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Garder
              </button>
            </div>
          </div>
        ) : ticking ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <ChipGroup
              label="Tu l'as contacté comment ?"
              name={`contact-${lead.id}`}
              value={channel}
              onChange={setChannel}
              options={choices.map((value) => ({ value, label: channelLabel(value), icon: <Icon name={`channel-${value}`} size={16} /> }))}
            />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => actions.claimLead({ id: lead.id, channel }))}
                className={buttonClasses({ size: "sm" })}
              >
                <CheckSquareIcon size={16} weight="bold" aria-hidden />
                {pending ? "Ajout…" : "Ajouter à mes prospects"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTicking(false);
                  setError(null);
                }}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setTicking(true)} className={buttonClasses({ variant: "secondary", className: "w-full" })}>
            <CheckSquareIcon size={18} aria-hidden />
            Je l&apos;ai contacté
          </button>
        )}
      </div>
    </article>
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
