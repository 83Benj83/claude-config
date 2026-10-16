"use client";

import { ArrowCounterClockwiseIcon, CalendarCheckIcon, CheckCircleIcon, ClockIcon, PhoneCallIcon, PhoneIcon, TrashIcon, UserIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { PRIORITY_LABELS, type CallbackRow, type CallbacksView } from "@/lib/callbacks";
import { formatDayLong, formatRelativeDay } from "@/lib/dates";
import { pluralize } from "@/lib/format";
import type { CallbackPriority } from "@/lib/types";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { CopyButton } from "../primitives/copy-button";
import { Field } from "../primitives/field";
import { Card, CardHeader, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";
import { CallbackForm, emptyCallback } from "../rappels/callback-form";

const PRIORITY_STYLE: Record<CallbackPriority, string> = {
  faible: "bg-surface-2 text-muted",
  moyenne: "bg-accent-soft text-accent-ink",
  haute: "bg-gold-soft text-gold-ink",
  urgente: "bg-danger-soft text-danger",
};

type Filter = "pending" | "done" | "all";

/**
 * Rappels : tout ce qu'il faut rappeler, pour toute l'équipe. On voit qui, quand,
 * à quel numéro et qui l'a noté ; une coche et le rappel disparaît.
 */
export function CallbacksScreen({ view }: { view: CallbacksView }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [adding, setAdding] = useState(false);

  const groups: { key: CallbackRow["when"]; title: string; rows: CallbackRow[] }[] = [
    { key: "late", title: "En retard", rows: view.pending.filter((r) => r.when === "late") },
    { key: "today", title: "Aujourd'hui", rows: view.pending.filter((r) => r.when === "today") },
    { key: "soon", title: "Cette semaine", rows: view.pending.filter((r) => r.when === "soon") },
    { key: "later", title: "Plus tard", rows: view.pending.filter((r) => r.when === "later") },
  ];

  const filters: { value: Filter; label: string }[] = [
    { value: "pending", label: `À rappeler (${view.counts.pending})` },
    { value: "done", label: `Déjà appelés (${view.done.length})` },
    { value: "all", label: "Tous" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Rappels"
        description="Les appels à refaire, pour toute l'équipe : qui rappeler, quand, et qui l'a noté. Une coche et il disparaît."
        actions={
          <button type="button" onClick={() => setAdding((value) => !value)} aria-expanded={adding} className={buttonClasses({})}>
            <PhoneCallIcon size={18} weight="bold" aria-hidden />
            Nouveau rappel
          </button>
        }
      />

      {adding && (
        <Card aria-labelledby="nouveau-rappel">
          <CardHeader id="nouveau-rappel" title="Nouveau rappel" description="Visible de toute l'équipe, avec ton nom." />
          <div className="px-5 pt-5 pb-6 sm:px-6">
            <CallbackForm
              today={view.today}
              initial={emptyCallback(view.today)}
              onCancel={() => setAdding(false)}
              onSubmit={async (values) => {
                const result = await actions.addCallback(values);
                if (result.ok) toast(result.message ?? "Rappel enregistré.");
                return result;
              }}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="En retard" value={view.counts.late} tone={view.counts.late > 0 ? "danger" : "neutral"} />
        <Stat label="Aujourd'hui" value={view.counts.today} tone={view.counts.today > 0 ? "accent" : "neutral"} />
        <Stat label="À venir" value={view.counts.pending - view.counts.late - view.counts.today} tone="neutral" />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les rappels">
        {filters.map((entry) => (
          <button
            key={entry.value}
            type="button"
            aria-pressed={filter === entry.value}
            onClick={() => setFilter(entry.value)}
            className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              filter === entry.value ? "border-accent bg-accent-soft text-accent-ink" : "border-line-input bg-surface text-muted hover:text-fg"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {filter !== "done" &&
        (view.pending.length === 0 ? (
          <Card>
            <EmptyState icon={<CalendarCheckIcon size={24} aria-hidden />} title="Aucun rappel en attente.">
              Depuis « À contacter » ou « Prospecter », choisis « À rappeler plus tard » : le rappel apparaît ici pour tout le monde.
            </EmptyState>
          </Card>
        ) : (
          groups
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              <section key={group.key} aria-label={group.title} className="flex flex-col gap-3">
                <h2 className={`flex items-baseline gap-2 font-display text-lg font-bold tracking-tight ${group.key === "late" ? "text-danger" : "text-fg"}`}>
                  {group.title}
                  <span className="text-sm font-medium text-subtle">{pluralize(group.rows.length, "rappel")}</span>
                </h2>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {group.rows.map((row) => (
                    <li key={row.callback.id} className="min-w-0">
                      <CallbackCard row={row} today={view.today} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
        ))}

      {filter !== "pending" && view.done.length > 0 && (
        <Card aria-labelledby="deja-appeles">
          <CardHeader id="deja-appeles" title="Déjà appelés" description="Gardés 48 heures, au cas où il faudrait annuler." />
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {view.done.map((row) => (
              <DoneRow key={row.callback.id} row={row} />
            ))}
          </ul>
        </Card>
      )}
      {filter === "done" && view.done.length === 0 && (
        <Card>
          <EmptyState title="Aucun rappel fait récemment." />
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "danger" | "accent" | "neutral" }) {
  const color = tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent-ink" : "text-fg";
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs text-subtle">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function CallbackCard({ row, today }: { row: CallbackRow; today: string }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"view" | "move" | "delete">("view");
  const [dueOn, setDueOn] = useState(row.callback.dueOn < today ? today : row.callback.dueOn);
  const [dueTime, setDueTime] = useState(row.callback.dueTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const { callback } = row;

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

  const dueText = `${formatRelativeDay(callback.dueOn, today)}${callback.dueTime ? ` à ${callback.dueTime.replace(":", "h")}` : ""}`;
  const late = row.when === "late";

  return (
    <article
      aria-label={callback.name}
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-surface p-4 sm:p-5 ${late ? "border-danger/50" : "border-line"}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight font-bold tracking-tight text-fg">{callback.name}</h3>
          <p className="mt-0.5 text-sm text-subtle">{callback.city ?? "Ville non précisée"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLE[callback.priority]}`}>{PRIORITY_LABELS[callback.priority]}</span>
      </header>

      <p className={`flex items-center gap-2 text-sm font-medium ${late ? "text-danger" : "text-fg"}`}>
        <ClockIcon size={16} aria-hidden />
        {dueText}
        {late && <span className="font-normal">· en retard</span>}
      </p>

      {callback.phone && (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
            <PhoneIcon size={16} aria-hidden />
          </span>
          <a className="min-w-0 flex-1 truncate text-sm font-medium text-fg underline-offset-2 hover:underline" href={`tel:${callback.phone.replace(/[^\d+]/g, "")}`}>
            {callback.phone}
          </a>
          <CopyButton text={callback.phone} label="Copier le numéro" compact />
        </div>
      )}
      {callback.contactName && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <UserIcon size={16} aria-hidden />
          Demander {callback.contactName}
        </p>
      )}
      {callback.note && <p className="text-sm text-muted">{callback.note}</p>}

      <p className="text-xs text-subtle" suppressHydrationWarning>
        Ajouté par <strong className="font-semibold text-muted">{row.addedByName}</strong> · {formatDayLong(callback.createdAt.slice(0, 10))}
      </p>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-auto pt-1">
        {mode === "move" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nouveau jour" type="date" min={today} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              <Field label="Heure" optional type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => actions.rescheduleCallback({ id: callback.id, dueOn, dueTime }), () => setMode("view"))}
                className={buttonClasses({ size: "sm" })}
              >
                {pending ? "…" : "Reporter"}
              </button>
              <button type="button" onClick={() => setMode("view")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Annuler
              </button>
            </div>
          </div>
        ) : mode === "delete" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3">
            <p className="text-sm text-fg">Supprimer ce rappel pour toute l&apos;équipe ?</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => actions.deleteCallback(callback.id))}
                className={buttonClasses({ variant: "secondary", size: "sm", className: "border-danger text-danger" })}
              >
                {pending ? "…" : "Supprimer"}
              </button>
              <button type="button" onClick={() => setMode("view")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Garder
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => actions.completeCallback(callback.id))} className={buttonClasses({ className: "flex-1" })}>
              <CheckCircleIcon size={18} weight="bold" aria-hidden />
              {pending ? "…" : "C'est fait"}
            </button>
            <button type="button" onClick={() => setMode("move")} className={buttonClasses({ variant: "secondary" })}>
              Reporter
            </button>
            {row.canDelete && (
              <button
                type="button"
                onClick={() => setMode("delete")}
                className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
                aria-label={`Supprimer le rappel ${callback.name}`}
              >
                <TrashIcon size={18} aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function DoneRow({ row }: { row: CallbackRow }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const { callback } = row;
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <CheckCircleIcon size={20} weight="fill" className="shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {callback.name} {callback.city && <span className="font-normal text-subtle">· {callback.city}</span>}
        </p>
        <p className="text-xs text-subtle">
          Noté par {row.addedByName} · fait par {row.doneByName}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await actions.reopenCallback(callback.id);
            toast(result.message ?? (result.ok ? "Rappel rouvert." : GENERIC_ERROR), result.ok ? "success" : "error");
          })
        }
        className={buttonClasses({ variant: "ghost", size: "sm" })}
        aria-label={`Remettre ${callback.name} dans les rappels`}
      >
        <ArrowCounterClockwiseIcon size={16} aria-hidden />
        {pending ? "…" : "Annuler"}
      </button>
    </li>
  );
}
