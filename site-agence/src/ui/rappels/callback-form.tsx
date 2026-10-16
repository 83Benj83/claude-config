"use client";

import { PhoneCallIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult, CallbackFormValues } from "@/lib/actions-contract";
import { PRIORITY_LABELS } from "@/lib/callbacks";
import { addDays, formatDayShort } from "@/lib/dates";
import type { CallbackPriority } from "@/lib/types";
import { CALLBACK_PRIORITIES } from "@/lib/validation";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { Field, FormMessage, TextArea } from "../primitives/field";

/** Raccourcis de date : on rappelle souvent « demain » ou « dans une semaine ». */
function quickDays(today: string) {
  return [
    { value: today, label: "Aujourd'hui" },
    { value: addDays(today, 1), label: "Demain" },
    { value: addDays(today, 2), label: "Après-demain" },
    { value: addDays(today, 7), label: "Dans 1 semaine" },
  ];
}

export const emptyCallback = (today: string, seed: Partial<CallbackFormValues> = {}): CallbackFormValues => ({
  name: "",
  city: "",
  phone: "",
  contactName: "",
  dueOn: addDays(today, 1),
  dueTime: "",
  priority: "moyenne",
  note: "",
  ...seed,
});

/**
 * Formulaire d'un rappel : utilisé par la rubrique Rappels, la liste « À
 * contacter » et la prospection. Le commerce peut être déjà connu (fixe).
 */
export function CallbackForm({
  today,
  initial,
  lockedName = false,
  submitLabel = "Enregistrer le rappel",
  onSubmit,
  onCancel,
}: {
  today: string;
  initial: CallbackFormValues;
  /** Commerce déjà choisi : nom et ville ne se modifient pas. */
  lockedName?: boolean;
  submitLabel?: string;
  onSubmit: (values: CallbackFormValues) => Promise<ActionResult<unknown>>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof CallbackFormValues>(key: K, value: CallbackFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await onSubmit(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      setMessage(null);
      setErrors({});
      if (!lockedName) setForm(emptyCallback(today, { priority: form.priority }));
    });
  };

  const days = quickDays(today);
  const isQuick = days.some((day) => day.value === form.dueOn);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormMessage>{message}</FormMessage>
      {!lockedName && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Commerce" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={120} autoComplete="off" />
          <Field label="Ville" optional value={form.city} onChange={(e) => set("city", e.target.value)} error={errors.city} maxLength={80} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Téléphone"
          optional
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          error={errors.phone}
          maxLength={30}
        />
        <Field label="Personne à demander" optional value={form.contactName} onChange={(e) => set("contactName", e.target.value)} error={errors.contactName} maxLength={80} />
      </div>

      <ChipGroup
        label="Quand rappeler ?"
        name={`quand-${initial.name || "nouveau"}`}
        value={isQuick ? form.dueOn : ""}
        onChange={(value) => set("dueOn", value)}
        error={errors.dueOn}
        options={days.map((day) => ({ value: day.value, label: day.label }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Ou un autre jour"
          type="date"
          min={today}
          value={form.dueOn}
          onChange={(e) => set("dueOn", e.target.value)}
          hint={form.dueOn ? formatDayShort(form.dueOn) : undefined}
        />
        <Field label="Heure" optional type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} error={errors.dueTime} />
      </div>

      <ChipGroup<CallbackPriority>
        label="Importance"
        name={`importance-${initial.name || "nouveau"}`}
        value={form.priority as CallbackPriority}
        onChange={(value) => set("priority", value)}
        error={errors.priority}
        options={CALLBACK_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
      />
      <TextArea
        label="Infos utiles"
        optional
        value={form.note}
        onChange={(e) => set("note", e.target.value)}
        error={errors.note}
        rows={3}
        maxLength={500}
        placeholder="Ex. gérant en déplacement, intéressé par le pack Pro"
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonClasses({ size: "lg" })}>
          <PhoneCallIcon size={18} weight="bold" aria-hidden />
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClasses({ variant: "ghost", size: "lg" })}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
