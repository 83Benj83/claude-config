"use client";

import { ArrowSquareOutIcon, CheckIcon, PaletteIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import type { MockupFormValues } from "@/lib/actions-contract";
import { formatDayShort } from "@/lib/dates";
import type { Mockup, MockupStatus } from "@/lib/types";
import type { ContractsView } from "@/lib/views";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { Field, FormMessage, SelectField, TextArea } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Card, EmptyState } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const toForm = (mockup: Mockup | null, today: string): MockupFormValues => ({
  id: mockup?.id ?? "",
  client: mockup?.client ?? "",
  city: mockup?.city ?? "",
  contact: mockup?.contact ?? "",
  status: mockup?.status ?? "en_cours",
  startedOn: mockup?.startedOn ?? today,
  doneOn: mockup?.doneOn ?? "",
  previewUrl: mockup?.previewUrl ?? "",
  madeBy: mockup?.madeBy ?? "",
  note: mockup?.note ?? "",
});

/** Maquettes : celles en cours de réalisation, puis celles déjà terminées. */
export function MockupsPanel({ view }: { view: ContractsView }) {
  const [editing, setEditing] = useState<Mockup | "new" | null>(null);
  const { inProgress, done } = view.mockups;

  return (
    <div className="flex flex-col gap-6">
      {view.canEdit && (
        <div>
          <button type="button" onClick={() => setEditing("new")} className={buttonClasses()}>
            <PlusIcon size={18} weight="bold" aria-hidden />
            Nouvelle maquette
          </button>
        </div>
      )}

      {inProgress.length + done.length === 0 ? (
        <Card>
          <EmptyState icon={<PaletteIcon size={24} aria-hidden />} title="Aucune maquette pour l'instant.">
            {view.canEdit ? "Ajoute celles que tu prépares : l'équipe voit ce qui est en cours et ce qui est prêt à présenter." : "Les maquettes en cours et terminées apparaîtront ici."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <Section title="En cours" mockups={inProgress} view={view} onEdit={setEditing} empty="Aucune maquette en cours." />
          <Section title="Déjà effectuées" mockups={done} view={view} onEdit={setEditing} empty="Aucune maquette terminée pour l'instant." />
        </>
      )}

      {view.canEdit && (
        <Sheet
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Nouvelle maquette" : editing ? `Modifier « ${editing.client} »` : ""}
          description="Visible par toute l'équipe."
        >
          {editing !== null && (
            <MockupForm key={editing === "new" ? "new" : editing.id} mockup={editing === "new" ? null : editing} view={view} onDone={() => setEditing(null)} />
          )}
        </Sheet>
      )}
    </div>
  );
}

function Section({ title, mockups, view, onEdit, empty }: { title: string; mockups: Mockup[]; view: ContractsView; onEdit: (mockup: Mockup) => void; empty: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 font-display text-lg font-bold tracking-tight text-fg">
        {title}
        <span className="text-sm font-medium text-subtle">{mockups.length}</span>
      </h2>
      {mockups.length === 0 ? (
        <p className="text-sm text-subtle">{empty}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {mockups.map((mockup) => (
            <li key={mockup.id} className="min-w-0">
              <MockupCard mockup={mockup} view={view} onEdit={() => onEdit(mockup)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MockupCard({ mockup, view, onEdit }: { mockup: Mockup; view: ContractsView; onEdit: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const finished = mockup.status === "terminee";
  const madeBy = mockup.madeBy ? (view.names[mockup.madeBy] ?? "Ancien membre") : null;

  const finish = () =>
    start(async () => {
      const result = await actions.saveMockup({ ...toForm(mockup, view.today), status: "terminee", doneOn: view.today });
      toast(result.ok ? `${mockup.client} : maquette terminée.` : (result.message ?? "Mise à jour impossible."), result.ok ? "success" : "error");
    });

  return (
    <Card as="article" className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold tracking-tight text-fg">{mockup.client}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-subtle">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${finished ? "bg-success-soft text-success" : "bg-accent-soft text-accent-ink"}`}>
              {finished ? "Terminée" : "En cours"}
            </span>
            {mockup.city}
          </p>
        </div>
        {view.canEdit && (
          <button type="button" onClick={onEdit} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Modifier la maquette « ${mockup.client} »`}>
            <PencilSimpleIcon size={18} aria-hidden />
          </button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-subtle">Commencée le</dt>
          <dd className="font-medium text-fg">{formatDayShort(mockup.startedOn)}</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">{finished ? "Terminée le" : "Réalisée par"}</dt>
          <dd className="truncate font-medium text-fg">{finished && mockup.doneOn ? formatDayShort(mockup.doneOn) : (madeBy ?? "-")}</dd>
        </div>
        {finished && (
          <div>
            <dt className="text-xs text-subtle">Réalisée par</dt>
            <dd className="truncate font-medium text-fg">{madeBy ?? "-"}</dd>
          </div>
        )}
        {mockup.contact && (
          <div className="min-w-0">
            <dt className="text-xs text-subtle">Contact</dt>
            <dd className="truncate font-medium text-fg">{mockup.contact}</dd>
          </div>
        )}
      </dl>
      {mockup.note && <p className="text-sm text-muted italic">{mockup.note}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!finished && view.canEdit && (
          <button type="button" onClick={finish} disabled={pending} className={buttonClasses({ size: "sm" })}>
            <CheckIcon size={16} weight="bold" aria-hidden />
            Marquer terminée
          </button>
        )}
        {mockup.previewUrl && (
          <a href={mockup.previewUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowSquareOutIcon size={16} aria-hidden />
            Voir la maquette
          </a>
        )}
      </div>
    </Card>
  );
}

function MockupForm({ mockup, view, onDone }: { mockup: Mockup | null; view: ContractsView; onDone: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(mockup, view.today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const set = (key: keyof MockupFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.saveMockup(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? (result.errors ? "Vérifie les champs en rouge." : null));
        return;
      }
      toast(result.message ?? "Maquette enregistrée.");
      onDone();
    });
  };

  const remove = () =>
    start(async () => {
      if (!mockup) return;
      const result = await actions.deleteMockup(mockup.id);
      if (!result.ok) {
        setMessage(result.message ?? null);
        return;
      }
      toast(result.message ?? "Maquette supprimée.");
      onDone();
    });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormMessage>{message}</FormMessage>
      <Field label="Commerce" value={form.client} onChange={(e) => set("client", e.target.value)} error={errors.client} maxLength={120} autoFocus autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" optional value={form.city} onChange={(e) => set("city", e.target.value)} error={errors.city} maxLength={80} />
        <Field label="Contact" optional value={form.contact} onChange={(e) => set("contact", e.target.value)} error={errors.contact} maxLength={160} hint="Nom, téléphone, e-mail" />
      </div>
      <ChipGroup<MockupStatus>
        label="État"
        name="etat-maquette"
        value={form.status as MockupStatus}
        onChange={(value) => set("status", value)}
        error={errors.status}
        options={[
          { value: "en_cours", label: "En cours" },
          { value: "terminee", label: "Terminée" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Commencée le" type="date" max={view.today} value={form.startedOn} onChange={(e) => set("startedOn", e.target.value)} error={errors.startedOn} />
        {form.status === "terminee" && (
          <Field label="Terminée le" type="date" max={view.today} value={form.doneOn} onChange={(e) => set("doneOn", e.target.value)} error={errors.doneOn} hint="Aujourd'hui si vide." />
        )}
      </div>
      <Field label="Lien de la maquette" optional type="url" value={form.previewUrl} onChange={(e) => set("previewUrl", e.target.value)} error={errors.previewUrl} placeholder="https://" />
      <SelectField label="Réalisée par" optional value={form.madeBy} onChange={(e) => set("madeBy", e.target.value)} error={errors.madeBy}>
        <option value="">Personne en particulier</option>
        {view.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.fullName}
          </option>
        ))}
      </SelectField>
      <TextArea label="Note" optional value={form.note} onChange={(e) => set("note", e.target.value)} error={errors.note} rows={2} maxLength={500} />

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6">
        {mockup ? (
          confirmDelete ? (
            <span className="flex items-center gap-2">
              <button type="button" onClick={remove} disabled={pending} className={buttonClasses({ variant: "secondary", size: "sm", className: "border-danger text-danger" })}>
                <TrashIcon size={16} aria-hidden />
                Confirmer
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClasses({ variant: "ghost", size: "sm", className: "text-danger" })}>
              <TrashIcon size={16} aria-hidden />
              Supprimer
            </button>
          )
        ) : (
          <span />
        )}
        <button type="submit" disabled={pending} className={buttonClasses()}>
          {pending ? "Enregistrement…" : mockup ? "Enregistrer" : "Ajouter la maquette"}
        </button>
      </div>
    </form>
  );
}
