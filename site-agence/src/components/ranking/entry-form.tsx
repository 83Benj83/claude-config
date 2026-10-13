"use client";

import { CheckCircleIcon, MinusIcon, PlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { MotionRoot } from "@/components/motion/motion-root";
import { useActionState, useId, useState } from "react";
import { saveEntry, type EntryFormState } from "@/app/actions/entries";
import { buttonClasses } from "@/components/ui/button";
import { submitWithoutReset } from "@/components/ui/submit-without-reset";
import { MAX_DAILY_COUNT } from "@/lib/rules";

type Props = {
  /** Jours modifiables, du plus récent au plus ancien, avec leur libellé. */
  days: { value: string; label: string }[];
  /** Saisies existantes du membre sur ces jours. */
  existing: Record<string, number>;
};

const QUICK_ADD = [5, 10, 25];
const INITIAL_STATE: EntryFormState = { status: "idle", version: 0 };

const clamp = (value: number) => Math.min(MAX_DAILY_COUNT, Math.max(0, value));

export function EntryForm({ days, existing }: Props) {
  const [state, formAction, pending] = useActionState(saveEntry, INITIAL_STATE);
  const [date, setDate] = useState(days[0]?.value ?? "");
  const [count, setCount] = useState<string>(() => String(existing[days[0]?.value] ?? ""));
  const ids = { date: useId(), count: useId(), countError: useId(), dateError: useId(), help: useId() };

  const numeric = Number(count) || 0;
  const alreadySaved = existing[date];
  const step = (delta: number) => setCount(String(clamp(numeric + delta)));

  const onDateChange = (value: string) => {
    setDate(value);
    setCount(existing[value] !== undefined ? String(existing[value]) : "");
  };

  return (
    <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.date} className="text-sm font-medium text-fg">
          Jour
        </label>
        <select
          id={ids.date}
          name="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          aria-invalid={Boolean(state.errors?.date)}
          aria-describedby={state.errors?.date ? ids.dateError : undefined}
          className="h-11 rounded-xl border border-line-input bg-surface px-3 text-[0.9375rem] text-fg transition-colors focus:border-accent"
        >
          {days.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
              {existing[day.value] !== undefined ? ` (déjà ${existing[day.value]})` : ""}
            </option>
          ))}
        </select>
        {state.errors?.date && (
          <p id={ids.dateError} className="text-sm text-danger">
            {state.errors.date}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.count} className="text-sm font-medium text-fg">
          Prospections effectuées
        </label>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            className="grid size-14 shrink-0 place-items-center rounded-xl border border-line-input bg-surface text-fg transition-colors hover:bg-surface-2 active:scale-95"
            aria-label="Retirer une prospection"
          >
            <MinusIcon size={20} aria-hidden />
          </button>
          <input
            id={ids.count}
            name="count"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_DAILY_COUNT}
            step={1}
            required
            placeholder="0"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            aria-invalid={Boolean(state.errors?.count)}
            aria-describedby={`${ids.help}${state.errors?.count ? ` ${ids.countError}` : ""}`}
            className="h-14 min-w-0 flex-1 rounded-xl border border-line-input bg-surface text-center text-3xl font-semibold tracking-tight text-fg tabular transition-colors placeholder:text-subtle focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => step(1)}
            className="grid size-14 shrink-0 place-items-center rounded-xl border border-line-input bg-surface text-fg transition-colors hover:bg-surface-2 active:scale-95"
            aria-label="Ajouter une prospection"
          >
            <PlusIcon size={20} aria-hidden />
          </button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Ajout rapide">
          {QUICK_ADD.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => step(value)}
              className="h-8 flex-1 rounded-full border border-line bg-surface-2 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              +{value}
            </button>
          ))}
        </div>
        {state.errors?.count && (
          <p id={ids.countError} className="text-sm text-danger">
            {state.errors.count}
          </p>
        )}
        <p id={ids.help} className="text-sm text-subtle">
          {alreadySaved !== undefined
            ? `Déjà ${alreadySaved} enregistrées pour ce jour : la nouvelle valeur remplacera l'ancienne.`
            : "Tu peux corriger ta saisie pendant 7 jours."}
        </p>
      </div>

      <button type="submit" disabled={pending || count === ""} className={buttonClasses({ size: "lg", className: "w-full" })}>
        {pending ? "Enregistrement…" : alreadySaved !== undefined ? "Mettre à jour" : "Enregistrer ma journée"}
      </button>

      <MotionRoot>
        <div role="status" aria-live="polite" className="min-h-6">
          <AnimatePresence mode="wait">
            {state.message && (
              <m.p
                key={`${state.status}-${state.version}`}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  state.status === "success" ? "bg-surface-2 text-fg" : "bg-danger-soft text-danger"
                }`}
              >
                {state.status === "success" ? (
                  <CheckCircleIcon size={18} weight="fill" className="mt-px shrink-0 text-success" aria-hidden />
                ) : (
                  <WarningCircleIcon size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
                )}
                {state.message}
              </m.p>
            )}
          </AnimatePresence>
        </div>
      </MotionRoot>
    </form>
  );
}
