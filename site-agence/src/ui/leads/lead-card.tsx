"use client";

import { ArrowCounterClockwiseIcon, CheckCircleIcon, CheckSquareIcon, PhoneCallIcon, TrashIcon } from "@phosphor-icons/react";
import { useId, useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { channelLabel } from "@/lib/channels";
import { formatDayShort } from "@/lib/dates";
import type { LeadRow } from "@/lib/leads";
import type { Channel } from "@/lib/types";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { CopyButton } from "../primitives/copy-button";
import { Icon } from "../primitives/icon";
import { useToast } from "../primitives/toast";
import { CallbackForm, emptyCallback } from "../rappels/callback-form";

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

type Mode = "idle" | "done" | "callback" | "remove";

/**
 * Un commerce à contacter. Deux issues : « Effectué » (compté au classement) ou
 * « À rappeler plus tard » (rejoint les rappels de l'équipe, après quelques détails).
 * Dans un fichier extrait (`batch`), « Effectué » est noté et compté à la clôture du fichier.
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
  const { actions } = usePlatform();
  const toast = useToast();
  const titleId = useId();
  const { lead, contacts, known } = row;
  const choices = [...new Set<Channel>([...contacts.map((contact) => contact.channel), "visite", "autre"])];
  const [mode, setMode] = useState<Mode>("idle");
  const [channel, setChannel] = useState<Channel>(choices[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      setError(null);
      toast(result.message ?? "C'est fait.");
      after?.();
    });

  const handled = batch ? lead.outcome : null;
  const callbackDefaults = emptyCallback(today, {
    name: lead.name,
    city: lead.city,
    phone: lead.phone ?? "",
    note: lead.note ?? "",
  });

  return (
    <article
      aria-labelledby={titleId}
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-surface p-4 sm:p-5 ${handled ? "border-success/50" : "border-line"}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="font-display text-lg leading-tight font-bold tracking-tight text-fg">
            {lead.name}
          </h3>
          <p className="mt-0.5 text-sm text-subtle">{[lead.category, lead.city].filter(Boolean).join(" · ")}</p>
          {addedBy && <p className="mt-0.5 text-xs text-subtle">Ajouté par {addedBy}</p>}
        </div>
        {canManage && !batch && mode !== "remove" && (
          <button
            type="button"
            onClick={() => setMode("remove")}
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
              <button type="button" onClick={() => setMode("idle")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Garder
              </button>
            </div>
          </div>
        ) : mode === "callback" ? (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-3 text-sm font-medium text-fg">Quand rappeler ?</p>
            <CallbackForm
              today={today}
              initial={callbackDefaults}
              lockedName
              submitLabel="Envoyer dans les rappels"
              onCancel={() => setMode("idle")}
              onSubmit={async (values) => {
                const result = batch
                  ? await actions.handleBatchLead({ id: lead.id, outcome: "callback", callback: values })
                  : await actions.deferLead({ id: lead.id, callback: values });
                if (result.ok) toast(result.message ?? "Rappel enregistré.");
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
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setError(null);
                }}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
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
        )}
      </div>
    </article>
  );
}
