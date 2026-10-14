"use client";

import {
  ArrowSquareOutIcon,
  BookmarkSimpleIcon,
  EnvelopeSimpleIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useId, useState, useTransition, type FormEvent } from "react";
import type { ResourceFormValues } from "@/lib/actions-contract";
import { normalizeText } from "@/lib/establishments";
import type { Resource, ResourceKind } from "@/lib/types";
import type { ResourcesView } from "@/lib/views";
import { Placeholders } from "../primitives/placeholders";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup, Segmented } from "../primitives/choice";
import { CopyButton } from "../primitives/copy-button";
import { Field, FormMessage, TextArea, controlClasses } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Card, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

type Filter = "tout" | "contacts" | "template" | "link";

const KINDS: { value: ResourceKind; label: string; short: string; icon: typeof EnvelopeSimpleIcon; tone: string }[] = [
  { value: "email", label: "Adresse e-mail", short: "E-mail", icon: EnvelopeSimpleIcon, tone: "tone-violet" },
  { value: "phone", label: "Téléphone", short: "Téléphone", icon: PhoneIcon, tone: "tone-violet" },
  { value: "template", label: "Modèle de message", short: "Modèle", icon: NotePencilIcon, tone: "tone-mint" },
  { value: "link", label: "Lien", short: "Lien", icon: LinkSimpleIcon, tone: "tone-gold" },
];

const matchesFilter = (kind: ResourceKind, filter: Filter) =>
  filter === "tout" || (filter === "contacts" ? kind === "email" || kind === "phone" : kind === filter);

const kindInfo = (kind: ResourceKind) => KINDS.find((item) => item.value === kind)!;

/**
 * Mails et liens : les adresses d'envoi, les modèles de message et les liens
 * utiles, copiables en un geste. Toute l'équipe peut les tenir à jour.
 */
export function ResourcesScreen({ view }: { view: ResourcesView }) {
  const [filter, setFilter] = useState<Filter>("tout");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Resource | "new" | null>(null);

  const needle = normalizeText(query);
  const shown = view.resources.filter(
    (resource) =>
      matchesFilter(resource.kind, filter) &&
      (!needle || normalizeText(`${resource.title} ${resource.value} ${resource.note ?? ""}`).includes(needle)),
  );

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Mails et liens"
        description="Les contacts de l'équipe, les liens à envoyer et les modèles de message. Un clic pour copier."
        actions={
          view.canEdit && (
            <button type="button" onClick={() => setEditing("new")} className={buttonClasses()}>
              <PlusIcon size={18} weight="bold" aria-hidden />
              Ajouter
            </button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Type de ressource"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "tout", label: "Tout" },
            { value: "contacts", label: "Contacts" },
            { value: "link", label: "Liens" },
            { value: "template", label: "Modèles" },
          ]}
        />
        <div className="relative sm:w-72">
          <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une ressource"
            className={`${controlClasses} h-10 pl-10`}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState icon={<BookmarkSimpleIcon size={24} aria-hidden />} title={view.resources.length === 0 ? "Rien pour l'instant." : "Aucun résultat."}>
            {view.resources.length === 0
              ? view.canEdit
                ? "Ajoute les adresses e-mail, modèles et liens que l'équipe utilise."
                : "Les admins ajouteront ici les adresses, modèles et liens de l'équipe."
              : "Essaie un autre mot ou un autre type."}
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((resource) => (
            <li key={resource.id} className={`min-w-0 ${resource.kind === "template" ? "md:col-span-2 xl:col-span-3" : ""}`}>
              <ResourceCard resource={resource} canEdit={view.canEdit} onEdit={() => setEditing(resource)} />
            </li>
          ))}
        </ul>
      )}

      {view.canEdit && (
        <Sheet
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Nouvelle ressource" : "Modifier la ressource"}
          description="Visible par toute l'équipe."
        >
          {editing !== null && (
            <ResourceForm
              key={editing === "new" ? "new" : editing.id}
              resource={editing === "new" ? null : editing}
              nextSortOrder={Math.max(0, ...view.resources.map((resource) => resource.sortOrder + 1))}
              onDone={() => setEditing(null)}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}

function ResourceCard({ resource, canEdit, onEdit }: { resource: Resource; canEdit: boolean; onEdit: () => void }) {
  const info = kindInfo(resource.kind);
  const valueId = useId();
  const [expanded, setExpanded] = useState(false);
  const long = resource.kind === "template" && resource.value.length > 260;

  return (
    <Card as="article" className={`${info.tone} flex h-full flex-col gap-3 p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--tone-soft)] text-[var(--tone-ink)]">
          <info.icon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[0.9375rem] font-bold tracking-tight text-fg">{resource.title}</h2>
          <p className="text-xs text-subtle">{info.label}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={`Modifier « ${resource.title} »`}
          >
            <PencilSimpleIcon size={18} aria-hidden />
          </button>
        )}
      </div>

      {resource.kind === "template" ? (
        <div className="relative">
          <p
            id={valueId}
            className={`rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-fg ${long && !expanded ? "line-clamp-5" : ""}`}
          >
            <Placeholders text={resource.value} />
          </p>
          {long && (
            <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1.5 text-sm font-medium text-accent-ink hover:underline">
              {expanded ? "Réduire" : "Lire tout le modèle"}
            </button>
          )}
        </div>
      ) : (
        <p id={valueId} className="truncate rounded-xl bg-surface-2 px-3.5 py-2.5 font-mono text-[0.8125rem] text-fg" title={resource.value}>
          {resource.kind === "link" ? resource.value.replace(/^https?:\/\//, "") : resource.value}
        </p>
      )}

      {resource.note && <p className="text-sm text-muted">{resource.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <CopyButton text={resource.value} label={resource.kind === "template" ? "Copier le message" : "Copier"} targetId={valueId} />
        {resource.kind === "link" && /^https?:\/\//.test(resource.value) && (
          <a href={resource.value} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <ArrowSquareOutIcon size={16} aria-hidden />
            Ouvrir
          </a>
        )}
        {resource.kind === "phone" && (
          <a href={`tel:${resource.value.replace(/[^\d+]/g, "")}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <PhoneIcon size={16} aria-hidden />
            Appeler
          </a>
        )}
        {resource.kind === "email" && (
          <a href={`mailto:${resource.value}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <EnvelopeSimpleIcon size={16} aria-hidden />
            Écrire
          </a>
        )}
      </div>
    </Card>
  );
}

const toForm = (resource: Resource | null, nextSortOrder: number): ResourceFormValues => ({
  id: resource?.id ?? "",
  kind: resource?.kind ?? "email",
  title: resource?.title ?? "",
  value: resource?.value ?? "",
  note: resource?.note ?? "",
  // Une nouvelle ressource s'ajoute en fin de liste.
  sortOrder: String(resource?.sortOrder ?? nextSortOrder),
});

function ResourceForm({ resource, nextSortOrder, onDone }: { resource: Resource | null; nextSortOrder: number; onDone: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(resource, nextSortOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const set = (key: keyof ResourceFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.saveResource(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      toast(resource ? "Ressource modifiée." : "Ressource ajoutée.");
      onDone();
    });
  };

  const remove = () =>
    start(async () => {
      if (!resource) return;
      const result = await actions.deleteResource(resource.id);
      if (!result.ok) {
        setMessage(result.message ?? null);
        return;
      }
      toast("Ressource supprimée.");
      onDone();
    });

  const valueLabel = { email: "Adresse e-mail", phone: "Numéro de téléphone", link: "Lien", template: "Texte du message" }[form.kind as ResourceKind] ?? "Valeur";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormMessage>{message}</FormMessage>
      <ChipGroup
        label="Type"
        name="kind"
        value={form.kind as ResourceKind}
        onChange={(value) => set("kind", value)}
        error={errors.kind}
        options={KINDS.map((kind) => ({ value: kind.value, label: kind.short, icon: <kind.icon size={16} aria-hidden /> }))}
      />
      <Field label="Titre" value={form.title} onChange={(event) => set("title", event.target.value)} error={errors.title} maxLength={100} autoFocus />
      {form.kind === "template" ? (
        <TextArea
          label={valueLabel}
          value={form.value}
          onChange={(event) => set("value", event.target.value)}
          error={errors.value}
          rows={8}
          maxLength={5000}
          hint="Astuce : mets [Nom du restaurant] ou [Prénom] là où il faut personnaliser."
        />
      ) : (
        <Field
          label={valueLabel}
          type={form.kind === "email" ? "email" : form.kind === "phone" ? "tel" : "url"}
          inputMode={form.kind === "email" ? "email" : form.kind === "phone" ? "tel" : "url"}
          value={form.value}
          onChange={(event) => set("value", event.target.value)}
          error={errors.value}
          placeholder={form.kind === "email" ? "contact@astrinova.fr" : form.kind === "phone" ? "06 12 34 56 78" : "https://"}
          autoComplete="off"
        />
      )}
      <TextArea label="Note" optional value={form.note} onChange={(event) => set("note", event.target.value)} error={errors.note} rows={2} maxLength={300} hint="Quand l'utiliser, à qui l'envoyer…" />
      <Field
        label="Position dans la liste"
        type="number"
        inputMode="numeric"
        min={0}
        value={form.sortOrder}
        onChange={(event) => set("sortOrder", event.target.value)}
        error={errors.sortOrder}
        hint="Les plus petits nombres s'affichent en premier."
        containerClassName="max-w-48"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {resource ? (
          confirmDelete ? (
            <span className="flex items-center gap-2">
              <button type="button" onClick={remove} disabled={pending} className={buttonClasses({ variant: "secondary", size: "sm", className: "border-danger text-danger" })}>
                <TrashIcon size={16} aria-hidden />
                Confirmer la suppression
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
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
