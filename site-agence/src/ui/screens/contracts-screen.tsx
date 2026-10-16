"use client";

import { ArrowRightIcon, ArrowSquareOutIcon, CheckIcon, HandshakeIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import type { ContractFormValues } from "@/lib/actions-contract";
import { formatDayShort } from "@/lib/dates";
import { normalizeText } from "@/lib/establishments";
import { formatEuros, formatInt } from "@/lib/format";
import type { Contract, ContractPack, ContractStatus } from "@/lib/types";
import { CONTRACT_STEPS, type ContractsView } from "@/lib/views";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup, Segmented } from "../primitives/choice";
import { Field, FormMessage, SelectField, TextArea, controlClasses } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Card, EmptyState, ScreenHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";
import { MockupsPanel } from "../contracts/mockups-panel";

type Tab = "en-cours" | "effectues" | "maquettes";

const STEP_LABELS: Record<ContractStatus, string> = {
  maquette: "Maquette",
  developpement: "Développement",
  validation: "Validation client",
  termine: "En ligne",
};

const PACKS: { value: ContractPack; tone: string }[] = [
  { value: "Essentiel", tone: "tone-mint" },
  { value: "Pro", tone: "tone-violet" },
  { value: "Signature", tone: "tone-gold" },
  { value: "Sur mesure", tone: "tone-coral" },
];

const packTone = (pack: ContractPack) => PACKS.find((item) => item.value === pack)?.tone ?? "tone-violet";

/** Contrats : les sites en cours de création (par étape) et les sites déjà livrés. */
export function ContractsScreen({ view }: { view: ContractsView }) {
  const [tab, setTab] = useState<Tab>("en-cours");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contract | "new" | null>(null);

  const needle = normalizeText(query);
  const list = (tab === "effectues" ? view.done : view.inProgress).filter(
    (contract) => !needle || normalizeText(`${contract.client} ${contract.city ?? ""} ${contract.pack} ${contract.options ?? ""}`).includes(needle),
  );
  const empty = view.inProgress.length + view.done.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Contrats"
        description={
          view.canEdit
            ? "Les sites en cours de création et ceux déjà en ligne. Tu es le seul à pouvoir les gérer ; l'équipe les consulte."
            : "Les sites en cours de création et ceux déjà en ligne. La gestion des contrats est réservée à l'administrateur."
        }
        actions={
          view.canEdit && (
            <button type="button" onClick={() => setEditing("new")} className={buttonClasses()}>
              <PlusIcon size={18} weight="bold" aria-hidden />
              Nouveau contrat
            </button>
          )
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="En cours" value={formatInt(view.totals.inProgress)} />
        <Figure label="Effectués" value={formatInt(view.totals.done)} />
        <Figure label="Signé au total" value={formatEuros(view.totals.signed)} />
        <Figure label="Abonnements en ligne" value={`${formatEuros(view.totals.monthly)} / mois`} />
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Rubrique affichée"
          value={tab}
          onChange={setTab}
          options={[
            { value: "en-cours", label: `En cours (${view.totals.inProgress})` },
            { value: "effectues", label: `Effectués (${view.totals.done})` },
            { value: "maquettes", label: `Maquettes (${view.mockups.inProgress.length + view.mockups.done.length})` },
          ]}
        />
        {tab !== "maquettes" && !empty && (
          <div className="relative sm:w-72">
            <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Commerce, ville, pack"
              aria-label="Rechercher un contrat"
              className={`${controlClasses} h-10 pl-10`}
            />
          </div>
        )}
      </div>

      {tab === "maquettes" ? (
        <MockupsPanel view={view} />
      ) : empty ? (
        <Card>
          <EmptyState
            icon={<HandshakeIcon size={24} aria-hidden />}
            title="Aucun contrat pour l'instant."
            action={
              view.canEdit && (
                <button type="button" onClick={() => setEditing("new")} className={buttonClasses({ className: "mt-2" })}>
                  <PlusIcon size={18} weight="bold" aria-hidden />
                  Ajouter le premier contrat
                </button>
              )
            }
          >
            {view.canEdit
              ? "Dès qu'un commerce signe, ajoute-le ici : il passe ensuite de la maquette à la mise en ligne."
              : "Les contrats signés apparaîtront ici, de la maquette à la mise en ligne."}
          </EmptyState>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState title={needle ? "Aucun contrat ne correspond." : tab === "en-cours" ? "Aucun contrat en cours." : "Aucun contrat effectué pour l'instant."}>
            {needle ? "Essaie un autre mot." : null}
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((contract) => (
            <li key={contract.id} className="min-w-0">
              <ContractCard contract={contract} view={view} onEdit={() => setEditing(contract)} />
            </li>
          ))}
        </ul>
      )}

      {view.canEdit && (
        <Sheet
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Nouveau contrat" : editing ? `Modifier « ${editing.client} »` : ""}
          description="Visible par toute l'équipe."
        >
          {editing !== null && (
            <ContractForm key={editing === "new" ? "new" : editing.id} contract={editing === "new" ? null : editing} view={view} onDone={() => setEditing(null)} />
          )}
        </Sheet>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="tone-gold min-w-0 rounded-2xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-fg tabular">{value}</dd>
    </div>
  );
}

const toForm = (contract: Contract | null, today: string): ContractFormValues => ({
  id: contract?.id ?? "",
  client: contract?.client ?? "",
  city: contract?.city ?? "",
  contact: contract?.contact ?? "",
  pack: contract?.pack ?? "",
  options: contract?.options ?? "",
  amount: contract?.amount != null ? String(contract.amount) : "",
  monthly: contract?.monthly != null ? String(contract.monthly) : "",
  status: contract?.status ?? "maquette",
  signedOn: contract?.signedOn ?? today,
  deliveredOn: contract?.deliveredOn ?? "",
  siteUrl: contract?.siteUrl ?? "",
  broughtBy: contract?.broughtBy ?? "",
  note: contract?.note ?? "",
});

function ContractCard({ contract, view, onEdit }: { contract: Contract; view: ContractsView; onEdit: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const stepIndex = CONTRACT_STEPS.indexOf(contract.status);
  const next = contract.status === "termine" ? null : CONTRACT_STEPS[stepIndex + 1];
  const broughtBy = contract.broughtBy ? (view.names[contract.broughtBy] ?? "Ancien membre") : null;

  const advance = () =>
    start(async () => {
      if (!next) return;
      const result = await actions.saveContract({ ...toForm(contract, view.today), status: next, deliveredOn: next === "termine" ? view.today : "" });
      toast(result.ok ? `${contract.client} : ${STEP_LABELS[next].toLowerCase()}.` : (result.message ?? "Mise à jour impossible."), result.ok ? "success" : "error");
    });

  return (
    <Card as="article" className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold tracking-tight text-fg">{contract.client}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-subtle">
            <span className={`${packTone(contract.pack)} rounded-full bg-[var(--tone-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--tone-ink)]`}>{contract.pack}</span>
            {contract.city}
          </p>
        </div>
        {view.canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={`Modifier « ${contract.client} »`}
          >
            <PencilSimpleIcon size={18} aria-hidden />
          </button>
        )}
      </div>

      {/* Avancement : de la maquette à la mise en ligne */}
      <ol className="grid grid-cols-4 gap-1.5" aria-label={`Étape : ${STEP_LABELS[contract.status]}`}>
        {CONTRACT_STEPS.map((step, index) => {
          const reached = index <= stepIndex;
          const current = index === stepIndex;
          return (
            <li key={step} className="flex min-w-0 flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${reached ? (contract.status === "termine" ? "bg-mint" : "bg-accent") : "bg-surface-2"}`} />
              <span className={`truncate text-[0.6875rem] ${current ? "font-semibold text-fg" : "text-subtle"}`}>{STEP_LABELS[step]}</span>
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Detail label="Signé le" value={formatDayShort(contract.signedOn)} />
        {contract.deliveredOn ? <Detail label="En ligne depuis" value={formatDayShort(contract.deliveredOn)} /> : <Detail label="Apporté par" value={broughtBy ?? "-"} />}
        <Detail label="Montant" value={contract.amount != null ? formatEuros(contract.amount) : "-"} />
        <Detail label="Abonnement" value={contract.monthly != null ? `${formatEuros(contract.monthly)} / mois` : "Sans"} />
        {contract.deliveredOn && <Detail label="Apporté par" value={broughtBy ?? "-"} />}
      </dl>

      {contract.options && <p className="text-sm text-muted">Options : {contract.options}</p>}
      {contract.note && <p className="text-sm text-muted italic">{contract.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {next && view.canEdit && (
          <button type="button" onClick={advance} disabled={pending} className={buttonClasses({ size: "sm" })}>
            {next === "termine" ? <CheckIcon size={16} weight="bold" aria-hidden /> : <ArrowRightIcon size={16} aria-hidden />}
            {next === "termine" ? "Marquer en ligne" : `Passer à : ${STEP_LABELS[next]}`}
          </button>
        )}
        {contract.siteUrl && (
          <a href={contract.siteUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowSquareOutIcon size={16} aria-hidden />
            Voir le site
          </a>
        )}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="truncate font-medium text-fg tabular">{value}</dd>
    </div>
  );
}

function ContractForm({ contract, view, onDone }: { contract: Contract | null; view: ContractsView; onDone: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(contract, view.today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const set = (key: keyof ContractFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.saveContract(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? (result.errors ? "Vérifie les champs en rouge." : null));
        return;
      }
      toast(result.message ?? "Contrat enregistré.");
      onDone();
    });
  };

  const remove = () =>
    start(async () => {
      if (!contract) return;
      const result = await actions.deleteContract(contract.id);
      if (!result.ok) {
        setMessage(result.message ?? null);
        return;
      }
      toast(result.message ?? "Contrat supprimé.");
      onDone();
    });

  const done = form.status === "termine";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormMessage>{message}</FormMessage>
      <Field label="Commerce" value={form.client} onChange={(event) => set("client", event.target.value)} error={errors.client} maxLength={120} autoFocus autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" optional value={form.city} onChange={(event) => set("city", event.target.value)} error={errors.city} maxLength={80} />
        <Field label="Contact" optional value={form.contact} onChange={(event) => set("contact", event.target.value)} error={errors.contact} maxLength={160} hint="Nom, téléphone, e-mail" />
      </div>
      <ChipGroup
        label="Pack"
        name="pack"
        value={form.pack as ContractPack | ""}
        onChange={(value) => set("pack", value)}
        error={errors.pack}
        options={PACKS.map((pack) => ({ value: pack.value, label: pack.value }))}
      />
      <TextArea label="Options" optional value={form.options} onChange={(event) => set("options", event.target.value)} error={errors.options} rows={2} maxLength={300} hint="Commande en ligne, fiche Google…" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Montant (€, payé une fois)" optional inputMode="decimal" value={form.amount} onChange={(event) => set("amount", event.target.value)} error={errors.amount} placeholder="490" />
        <Field label="Abonnement (€ / mois)" optional inputMode="decimal" value={form.monthly} onChange={(event) => set("monthly", event.target.value)} error={errors.monthly} placeholder="25" />
      </div>
      <ChipGroup
        label="Étape"
        name="status"
        value={form.status as ContractStatus}
        onChange={(value) => set("status", value)}
        error={errors.status}
        options={CONTRACT_STEPS.map((step) => ({ value: step, label: STEP_LABELS[step] }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Signé le" type="date" max={view.today} value={form.signedOn} onChange={(event) => set("signedOn", event.target.value)} error={errors.signedOn} />
        {done && (
          <Field label="En ligne depuis le" type="date" value={form.deliveredOn} onChange={(event) => set("deliveredOn", event.target.value)} error={errors.deliveredOn} hint="Aujourd'hui si vide." />
        )}
      </div>
      {done && (
        <Field label="Lien du site" optional type="url" value={form.siteUrl} onChange={(event) => set("siteUrl", event.target.value)} error={errors.siteUrl} placeholder="https://" />
      )}
      <SelectField label="Apporté par" optional value={form.broughtBy} onChange={(event) => set("broughtBy", event.target.value)} error={errors.broughtBy}>
        <option value="">Personne en particulier</option>
        {view.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.fullName}
          </option>
        ))}
      </SelectField>
      <TextArea label="Note" optional value={form.note} onChange={(event) => set("note", event.target.value)} error={errors.note} rows={2} maxLength={500} />

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6">
        {contract ? (
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
          {pending ? "Enregistrement…" : contract ? "Enregistrer" : "Ajouter le contrat"}
        </button>
      </div>
    </form>
  );
}
