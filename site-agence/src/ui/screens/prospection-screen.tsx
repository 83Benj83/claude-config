"use client";

import { CaretDownIcon, CheckCircleIcon, PlusIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { CHANNELS, channelLabel } from "@/lib/channels";
import { formatDayShort, formatRelativeDay } from "@/lib/dates";
import type { DuplicateCheck } from "@/lib/establishments";
import { firstName, formatInt, pluralize } from "@/lib/format";
import type { Channel } from "@/lib/types";
import type { ProspectionView, ProspectRow } from "@/lib/views";
import { ProspectLine } from "../feed-item";
import { ImportList } from "../prospection/import-list";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { Field, FormMessage, TextArea } from "../primitives/field";
import { ChannelIcon } from "../primitives/icon";
import { Card, CardHeader, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

/** Délai avant de vérifier un nom pendant la frappe. */
const LOOKUP_DELAY_MS = 350;

type Form = { name: string; city: string; channel: Channel | ""; contact: string; note: string; date: string };

export function ProspectionScreen({ view }: { view: ProspectionView }) {
  const { actions, searchParams } = usePlatform();
  const toast = useToast();
  const [form, setForm] = useState<Form>(() => ({
    name: searchParams.get("nom") ?? "",
    city: searchParams.get("ville") ?? "",
    channel: "",
    contact: "",
    note: "",
    date: view.days[0]?.value ?? view.today,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateCheck | null>(null);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const citiesId = useId();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  // Vérification « déjà contacté ? » pendant la saisie du nom et de la ville.
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await actions.checkEstablishment({ name, city: form.city.trim() });
      if (!cancelled) setDuplicate(result);
    }, LOOKUP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [actions, form.name, form.city]);

  const shownDuplicate = form.name.trim().length >= 3 ? duplicate : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.addProspect({ ...form, channel: form.channel });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      toast(`${result.data.prospect.name} ajouté. ${pluralize(result.data.todayCount, "prospect")} aujourd'hui.`);
      setMessage(null);
      setDuplicate(null);
      // Ville, moyen de contact et jour sont gardés : on enchaîne souvent dans la même ville.
      setForm((current) => ({ ...current, name: "", contact: "", note: "" }));
      nameRef.current?.focus();
    });
  };

  const channelHint = CHANNELS.find((channel) => channel.value === form.channel)?.contactHint;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Prospecter" description="Note chaque commerce contacté : toute l'équipe saura qu'il a déjà été démarché." />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <Card aria-labelledby="nouveau-prospect">
            <CardHeader id="nouveau-prospect" title="Nouveau prospect" description="Nom, ville et moyen de contact sont obligatoires." />
            <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-5 pb-6 sm:px-6" noValidate>
              <FormMessage>{message}</FormMessage>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Field
                  ref={nameRef}
                  label="Nom du restaurant"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  error={errors.name}
                  autoComplete="off"
                  autoFocus
                  maxLength={120}
                />
                <Field
                  label="Ville"
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  error={errors.city}
                  list={citiesId}
                  autoComplete="address-level2"
                  maxLength={80}
                />
                <datalist id={citiesId}>
                  {view.cities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              {shownDuplicate && <DuplicateNotice check={shownDuplicate} today={view.today} />}

              <ChipGroup
                label="Moyen de contact"
                name="channel"
                value={form.channel}
                onChange={(value) => set("channel", value)}
                error={errors.channel}
                columns="grid"
                options={CHANNELS.map((channel) => ({
                  value: channel.value,
                  label: channel.label,
                  icon: <ChannelIcon channel={channel.value} size={17} />,
                }))}
              />

              <ChipGroup
                label="Jour du contact"
                name="date"
                value={form.date}
                onChange={(value) => set("date", value)}
                error={errors.date}
                options={view.days.slice(0, 4).map((day) => ({ value: day.value, label: day.label }))}
              />

              <div className="rounded-2xl border border-line">
                <button
                  type="button"
                  onClick={() => setShowDetails((value) => !value)}
                  aria-expanded={showDetails}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-fg"
                >
                  Coordonnées et note
                  <span className="flex items-center gap-2 text-xs font-normal text-subtle">
                    facultatif
                    <CaretDownIcon size={16} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden />
                  </span>
                </button>
                {showDetails && (
                  <div className="grid gap-4 border-t border-line px-4 pt-4 pb-4">
                    <Field
                      label="Coordonnées utilisées"
                      value={form.contact}
                      onChange={(event) => set("contact", event.target.value)}
                      placeholder={channelHint ? `Ex. ${channelHint}` : "Numéro, e-mail ou compte"}
                      error={errors.contact}
                      maxLength={160}
                    />
                    <TextArea
                      label="Note"
                      value={form.note}
                      onChange={(event) => set("note", event.target.value)}
                      placeholder="Ex. rappeler jeudi, gérant absent"
                      error={errors.note}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <button type="submit" disabled={pending} className={buttonClasses({ size: "lg", className: "w-full sm:w-fit" })}>
                <PlusIcon size={18} weight="bold" aria-hidden />
                {pending ? "Ajout…" : "Ajouter le prospect"}
              </button>
            </form>
          </Card>
          <ImportList today={view.today} />
        </div>

        <MyProspects view={view} />
      </div>
    </div>
  );
}

/** Alerte en direct si l'établissement a déjà été contacté par l'équipe. */
function DuplicateNotice({ check, today }: { check: DuplicateCheck; today: string }) {
  if (check.sameCity) {
    const last = check.sameCity.contacts[0];
    return (
      <div role="status" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
        <WarningIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 text-fg">
          <p className="font-semibold">
            Déjà contacté{check.sameCity.contacts.length > 1 ? ` ${check.sameCity.contacts.length} fois` : ""}
          </p>
          <p className="text-muted">
            {check.sameCity.name} ({check.sameCity.city}) : par {firstName(last.memberName)}, {formatRelativeDay(last.date, today).toLowerCase()},
            par {channelLabel(last.channel).toLowerCase()}. Tu peux l&apos;ajouter quand même s&apos;il s&apos;agit d&apos;une relance.
          </p>
        </div>
      </div>
    );
  }
  if (check.otherCities.length > 0) {
    return (
      <div role="status" className="flex gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        <WarningIcon size={20} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
        <p>
          Un établissement du même nom a été contacté à {check.otherCities.slice(0, 3).map((e) => e.city).join(", ")}. Vérifie la ville.
        </p>
      </div>
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-success">
      <CheckCircleIcon size={18} weight="fill" aria-hidden />
      Jamais contacté par l&apos;équipe.
    </p>
  );
}

function MyProspects({ view }: { view: ProspectionView }) {
  const byDay = new Map<string, ProspectRow[]>();
  for (const prospect of view.mine) byDay.set(prospect.date, [...(byDay.get(prospect.date) ?? []), prospect]);

  return (
    <Card className="flex flex-col lg:sticky lg:top-6 lg:col-span-5 lg:max-h-[calc(100dvh-3rem)]" aria-labelledby="mes-prospects">
      <div className="grid grid-cols-3 border-b border-line">
        {[
          { label: "Aujourd'hui", value: view.todayCount },
          { label: "Cette semaine", value: view.weekCount },
          { label: "Série", value: view.streak, suffix: view.streak > 1 ? " jours" : " jour" },
        ].map((stat, index) => (
          <div key={stat.label} className={`px-4 py-4 ${index > 0 ? "border-l border-line" : ""}`}>
            <p className="text-xs text-subtle">{stat.label}</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">
              {formatInt(stat.value)}
              {stat.suffix && <span className="text-sm font-normal text-subtle">{stat.suffix}</span>}
            </p>
          </div>
        ))}
      </div>
      <CardHeader id="mes-prospects" title="Mes prospects" description="7 derniers jours, modifiables" />
      {view.mine.length === 0 ? (
        <EmptyState title="Aucun prospect pour l'instant.">Ton premier ajout apparaîtra ici.</EmptyState>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
          {[...byDay].map(([date, items]) => (
            <section key={date} className="mt-3">
              <h3 className="sticky top-0 z-10 bg-surface py-1 text-xs font-medium text-subtle">
                {formatRelativeDay(date, view.today)} ({items.length})
              </h3>
              <ul className="divide-y divide-line">
                {items.map((prospect) => (
                  <li key={prospect.id}>
                    <ProspectLine
                      name={prospect.name}
                      city={prospect.city}
                      channel={prospect.channel}
                      date={prospect.date}
                      today={view.today}
                      trailing={<DeleteButton prospect={prospect} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Suppression en deux temps (pas de boîte de dialogue du navigateur). */
function DeleteButton({ prospect }: { prospect: ProspectRow }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!prospect.editable) return null;
  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await actions.deleteProspect(prospect.id);
              toast(result.ok ? `${prospect.name} supprimé.` : (result.message ?? "Suppression impossible."), result.ok ? "success" : "error");
              setConfirming(false);
            })
          }
          className="h-8 rounded-full bg-danger px-3 text-xs font-semibold text-on-inverse"
        >
          {pending ? "…" : "Supprimer"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-full px-2.5 text-xs font-medium text-muted hover:text-fg">
          Annuler
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="grid size-8 shrink-0 place-items-center rounded-full text-subtle hover:bg-surface-2 hover:text-danger"
      aria-label={`Supprimer ${prospect.name} (${formatDayShort(prospect.date)})`}
    >
      <TrashIcon size={16} aria-hidden />
    </button>
  );
}
