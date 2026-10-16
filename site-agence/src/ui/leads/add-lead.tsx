"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Field, FormMessage } from "../primitives/field";
import { Card, CardHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const EMPTY = { name: "", city: "", phone: "", category: "", note: "" };

/** Tout membre peut ajouter un numéro à la liste : l'équipe en profite. */
export function AddLead({ cities, onDone }: { cities: string[]; onDone: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (key: keyof typeof EMPTY, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.addLead(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      toast(result.message ?? "Ajouté.");
      setMessage(null);
      // La ville est gardée : on enchaîne souvent plusieurs commerces d'une même ville.
      setForm({ ...EMPTY, city: form.city });
    });
  };

  return (
    <Card aria-labelledby="ajouter-numero">
      <CardHeader id="ajouter-numero" title="Ajouter un numéro à contacter" description="Il rejoint la liste de toute l'équipe, avec ton nom." />
      <form onSubmit={submit} className="flex flex-col gap-4 px-5 pt-5 pb-6 sm:px-6" noValidate>
        <FormMessage>{message}</FormMessage>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du commerce" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={120} autoComplete="off" autoFocus />
          <Field label="Ville" value={form.city} onChange={(e) => set("city", e.target.value)} error={errors.city} maxLength={80} list="villes-liste" />
          <datalist id="villes-liste">
            {cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <Field label="Téléphone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} maxLength={30} />
          <Field label="Type de commerce" optional value={form.category} onChange={(e) => set("category", e.target.value)} maxLength={60} placeholder="Ex. coiffeur" />
        </div>
        <Field label="Note" optional value={form.note} onChange={(e) => set("note", e.target.value)} maxLength={300} placeholder="Ex. pas de site, bonne note Google" />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={buttonClasses({ size: "lg" })}>
            <PlusIcon size={18} weight="bold" aria-hidden />
            {pending ? "Ajout…" : "Ajouter à la liste"}
          </button>
          <button type="button" onClick={onDone} className={buttonClasses({ variant: "ghost", size: "lg" })}>
            Fermer
          </button>
        </div>
      </form>
    </Card>
  );
}
