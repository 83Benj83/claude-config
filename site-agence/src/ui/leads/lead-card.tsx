"use client";

import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  MapPinIcon,
  PhoneCallIcon,
  PhoneIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useId, useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { channelLabel } from "@/lib/channels";
import { formatDayShort } from "@/lib/dates";
import { arrondissement, type LeadRow } from "@/lib/leads";
import type { Channel } from "@/lib/types";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { CopyButton } from "../primitives/copy-button";
import { Icon } from "../primitives/icon";
import { useToast } from "../primitives/toast";
import { CallbackForm, emptyCallback } from "../rappels/callback-form";

/** Liste des lignes : une seule carte, lignes séparées par un filet. */
export const LEAD_LIST_CLASSES = "divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card";

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Lien direct vers la coordonnée : appel, e-mail, page Instagram ou Facebook. */
function ContactLink({ channel, value }: { channel: Channel; value: string }) {
  const className = "min-w-0 flex-1 truncate text-sm font-medium text-fg underline-offset-2 hover:underline";
  if (channel === "telephone") return <a className={className} href={telHref(value)}>{value}</a>;
  if (channel === "email") return <a className={className} href={`mailto:${value}`}>{value}</a>;
  const path = value.replace(/^https:\/\/(?:www\.|m\.)?/, "").replace(/\/$/, "");
  const label = channel === "instagram" ? `@${path.split("/").pop()}` : path;
  return (
    <a className={className} href={value} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

type Mode = "idle" | "done" | "callback" | "remove";

/**
 * Un commerce à contacter, en une ligne légère : le nom et le numéro (appel en
 * un geste). La flèche déplie le reste : les infos utiles pour l'appel,
 * l'adresse, les autres coordonnées, puis les deux issues : « Effectué »
 * (compté au classement) ou « À rappeler plus tard » (date, heure, info).
 * Dans un fichier extrait (`batch`), « Effectué » est compté à la clôture.
 */
export function LeadCard({
  row,
  today,
  canManage,
  addedBy,
  batch = false,
}: {
  row: LeadRow;
  today: string;
  canManage: boolean;
  addedBy?: string;
  batch?: boolean;
}) {
  const nameId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const { lead, known } = row;
  const handled = batch ? lead.outcome : null;
  const place = arrondissement(lead.address);
  const meta = [lead.category, place ?? null, lead.phone].filter(Boolean).join(" · ");

  return (
    <article aria-labelledby={nameId} className={handled ? "bg-success-soft/40" : undefined}>
      <div className="flex items-center gap-2 py-1.5 pr-3 pl-1.5 sm:pr-4">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="group flex w-full min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            <span className="min-w-0 flex-1">
              <span id={nameId} className="block truncate text-[0.9375rem] font-semibold text-fg">
                {lead.name}
              </span>
              {meta && <span className="mt-0.5 block truncate text-sm text-subtle tabular-nums">{meta}</span>}
            </span>
            {known && <span className="hidden shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold-ink sm:inline">Déjà contacté</span>}
            {handled && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircleIcon size={14} weight="fill" aria-hidden />
                {handled === "contacted" ? "Effectué" : "Rappel"}
              </span>
            )}
            <span className="sr-only">{open ? "Masquer le détail" : "Voir le détail"}</span>
            <CaretDownIcon
              size={18}
              weight="bold"
              aria-hidden
              className={`shrink-0 text-subtle transition-transform duration-200 group-hover:text-fg ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h3>
        {lead.phone ? (
          <a
            href={telHref(lead.phone)}
            aria-label={`Appeler ${lead.name}`}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success transition-transform hover:scale-105 active:scale-95"
          >
            <PhoneIcon size={18} weight="fill" aria-hidden />
          </a>
        ) : (
          // Même largeur sans numéro : les flèches restent alignées d'une ligne à l'autre.
          <span className="size-10 shrink-0" aria-hidden />
        )}
      </div>
      {open && (
        <div id={panelId} className="reveal-in px-4 pt-1 pb-4 sm:px-5">
          <LeadDetails row={row} addedBy={addedBy} />
          <LeadActions row={row} today={today} canManage={canManage} batch={batch} />
        </div>
      )}
    </article>
  );
}

/** Infos pour l'appel, adresse, coordonnées et notes. */
function LeadDetails({ row, addedBy }: { row: LeadRow; addedBy?: string }) {
  const { lead, contacts, known } = row;
  return (
    <div className="flex flex-col gap-3">
      {known && (
        <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm text-gold-ink">
          Déjà contacté par <strong className="font-semibold">{known.name}</strong> le {formatDayShort(known.date)} ({channelLabel(known.channel)}).
        </p>
      )}

      {lead.tips.length > 0 && (
        <section aria-label={`Pour l'appel à ${lead.name}`} className="rounded-xl bg-accent-soft/60 px-3.5 py-3">
          <p className="text-xs font-semibold tracking-wide text-accent-ink uppercase">Pour l&apos;appel</p>
          <ol className="mt-2 flex flex-col gap-1.5">
            {lead.tips.map((tip, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-fg">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[0.6875rem] font-bold text-accent-ink" aria-hidden>
                  {index + 1}
                </span>
                <span className="min-w-0">{tip}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {lead.address && (
        <p className="flex items-start gap-2.5 text-sm text-muted">
          <MapPinIcon size={18} className="mt-px shrink-0 text-subtle" aria-hidden />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name} ${lead.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 underline-offset-2 hover:text-fg hover:underline"
          >
            {lead.address}
          </a>
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
      {addedBy && <p className="text-xs text-subtle">Ajouté par {addedBy}</p>}
    </div>
  );
}

/** « Effectué » ou « À rappeler plus tard » (et, pour un admin, retirer de la liste). */
function LeadActions({ row, today, canManage, batch }: { row: LeadRow; today: string; canManage: boolean; batch: boolean }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const { lead, contacts } = row;
  const choices = [...new Set<Channel>([...contacts.map((contact) => contact.channel), "visite", "autre"])];
  const [mode, setMode] = useState<Mode>("idle");
  const [channel, setChannel] = useState<Channel>(choices[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const handled = batch ? lead.outcome : null;

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      setError(null);
      toast(result.message ?? "C'est fait.");
    });

  const back = () => {
    setMode("idle");
    setError(null);
  };

  return (
    <div className="mt-4">
      {error && mode === "idle" && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      )}
      {mode === "remove" ? (
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
            <button type="button" onClick={back} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Garder
            </button>
          </div>
        </div>
      ) : mode === "callback" ? (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="mb-3 text-sm font-semibold text-fg">À rappeler plus tard</p>
          <CallbackForm
            today={today}
            initial={emptyCallback(today, { name: lead.name, city: lead.city, phone: lead.phone ?? "" })}
            lockedName
            submitLabel="Envoyer dans les rappels"
            onCancel={back}
            onSubmit={async (values) => {
              const result = batch
                ? await actions.handleBatchLead({ id: lead.id, outcome: "callback", callback: values })
                : await actions.deferLead({ id: lead.id, callback: values });
              if (result.ok) {
                toast(result.message ?? "Rappel enregistré.");
                setMode("idle");
              }
              return result;
            }}
          />
        </div>
      ) : mode === "done" && !batch ? (
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
            <button type="button" disabled={pending} onClick={() => run(() => actions.claimLead({ id: lead.id, channel }))} className={buttonClasses({ size: "sm" })}>
              <CheckSquareIcon size={16} weight="bold" aria-hidden />
              {pending ? "Ajout…" : "Ajouter à mes prospects"}
            </button>
            <button type="button" onClick={back} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Annuler
            </button>
          </div>
        </div>
      ) : handled ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircleIcon size={18} weight="fill" aria-hidden />
            {handled === "contacted" ? "Effectué" : "Dans les rappels"}
          </span>
          {handled === "contacted" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => actions.handleBatchLead({ id: lead.id, outcome: "none" }))}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-fg"
            >
              <ArrowCounterClockwiseIcon size={14} aria-hidden />
              Annuler
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => (batch ? run(() => actions.handleBatchLead({ id: lead.id, outcome: "contacted" })) : setMode("done"))}
              className={buttonClasses({})}
            >
              <CheckSquareIcon size={18} aria-hidden />
              Effectué
            </button>
            <button type="button" onClick={() => setMode("callback")} className={buttonClasses({ variant: "secondary" })}>
              <PhoneCallIcon size={18} aria-hidden />
              À rappeler plus tard
            </button>
          </div>
          {canManage && !batch && (
            <button
              type="button"
              onClick={() => setMode("remove")}
              className="flex items-center gap-1.5 self-end text-xs font-medium text-subtle hover:text-danger"
              aria-label={`Retirer ${lead.name} de la liste`}
            >
              <TrashIcon size={14} aria-hidden />
              Retirer de la liste
            </button>
          )}
        </div>
      )}
    </div>
  );
}
