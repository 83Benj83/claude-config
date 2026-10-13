"use client";

import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationCardIcon,
  KeyIcon,
  PencilSimpleIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { useId, useState, useTransition, type FormEvent } from "react";
import type { MemberFormValues } from "@/lib/actions-contract";
import { formatDayShort, todayIso } from "@/lib/dates";
import { generatePassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/rules";
import type { Member } from "@/lib/types";
import type { AdminView } from "@/lib/views";
import { usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { buttonClasses } from "../primitives/button";
import { CopyButton } from "../primitives/copy-button";
import { Checkbox, Field, FormMessage, SelectField, controlClasses } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Badge, Card, ScreenHeader } from "../primitives/surface";

/**
 * Gestion des identifiants : l'admin crée chaque identifiant avec son mot de
 * passe, puis les transmet. À la première connexion, la personne choisit son
 * identifiant dans la liste et entre ce mot de passe.
 */
export function AdminScreen({ view }: { view: AdminView }) {
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const active = view.members.filter((member) => member.active);
  const waiting = active.filter((member) => !member.welcomedAt).length;
  const admins = active.filter((member) => member.isAdmin).length;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Identifiants"
        description="Crée les identifiants de l'équipe et définis le mot de passe de chacun."
        actions={
          <button type="button" onClick={() => setEditing("new")} className={buttonClasses()}>
            <UserPlusIcon size={18} aria-hidden />
            Nouvel identifiant
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-3 gap-3">
            <Figure label="Actifs" value={active.length} />
            <Figure label="Jamais connectés" value={waiting} />
            <Figure label="Admins" value={admins} />
          </div>
          <Card aria-label="Liste des identifiants">
            <ul className="divide-y divide-line">
              {view.members.map((member) => (
                <li key={member.id}>
                  <MemberRow member={member} isMe={member.id === view.meId} onEdit={() => setEditing(member)} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight text-fg">
              <KeyIcon size={18} className="text-accent-ink" aria-hidden />
              Comment ça marche
            </h2>
            <ol className="mt-4 flex flex-col gap-4 text-sm text-muted">
              {[
                "Crée un identifiant par personne et choisis son mot de passe (ou génère-le).",
                "Transmets-lui ses accès : le bouton « Copier les accès » prépare le message.",
                "À sa première connexion, elle choisit son identifiant dans la liste, entre le mot de passe et confirme son nom.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-inverse text-xs font-semibold text-on-inverse tabular">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-surface-2 px-3.5 py-3 text-xs text-subtle">
              Un mot de passe oublié ? Modifie l&apos;identifiant et définis-en un nouveau : les sessions ouvertes sont fermées.
            </p>
          </Card>
        </aside>
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nouvel identifiant" : editing ? `Modifier ${editing.fullName}` : ""}
        description={editing === "new" ? "La personne le choisira à sa première connexion." : undefined}
      >
        {editing !== null && (
          <MemberForm
            key={editing === "new" ? "new" : editing.id}
            member={editing === "new" ? null : editing}
            view={view}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-fg tabular">{value}</p>
    </div>
  );
}

function MemberRow({ member, isMe, onEdit }: { member: Member; isMe: boolean; onEdit: () => void }) {
  const lastLogin = member.lastLoginAt ? formatDayShort(todayIso(new Date(member.lastLoginAt))) : null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${member.active ? "" : "opacity-60"}`}>
      <Avatar member={member} size="sm" highlight={isMe} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-fg">{member.fullName}</span>
          <span className="rounded-md bg-surface-2 px-1.5 py-px font-mono text-xs text-muted">{member.login}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-subtle">
          {member.jobTitle}
          {" · "}
          {!member.active ? "désactivé" : member.welcomedAt ? (lastLogin ? `dernière connexion le ${lastLogin}` : "déjà connecté") : "jamais connecté"}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {member.isAdmin && <Badge tone="accent">Admin</Badge>}
        {member.isProspector && <Badge>Prospecteur</Badge>}
        {!member.active && <Badge tone="danger">Désactivé</Badge>}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        aria-label={`Modifier ${member.fullName}`}
      >
        <PencilSimpleIcon size={18} aria-hidden />
      </button>
    </div>
  );
}

const toForm = (member: Member | null): MemberFormValues => ({
  id: member?.id ?? "",
  login: member?.login ?? "",
  fullName: member?.fullName ?? "",
  jobTitle: member?.jobTitle ?? "",
  department: member?.department ?? "",
  managerId: member?.managerId ?? "",
  avatarUrl: member?.avatarUrl ?? "",
  password: member ? "" : generatePassword(),
  isProspector: member?.isProspector ?? true,
  isAdmin: member?.isAdmin ?? false,
  active: member?.active ?? true,
});

function MemberForm({ member, view, onDone }: { member: Member | null; view: AdminView; onDone: () => void }) {
  const { actions } = usePlatform();
  const [form, setForm] = useState(() => toForm(member));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ login: string; password: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const departmentsId = useId();

  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  // Un membre ne peut pas dépendre de lui-même ni d'un de ses subordonnés (vérifié côté serveur).
  const managers = view.members.filter((candidate) => candidate.active && candidate.id !== member?.id);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.saveMember(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? (result.errors ? "Vérifie les champs en rouge." : null));
        return;
      }
      setSaved({ login: form.login.trim(), password: form.password, message: result.message ?? "Enregistré." });
    });
  };

  if (saved) return <SavedPanel saved={saved} onDone={onDone} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormMessage>{message}</FormMessage>

      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-fg">Accès</legend>
        <Field
          label="Identifiant"
          value={form.login}
          onChange={(event) => set("login", event.target.value)}
          error={errors.login}
          hint="Affiché dans la liste de connexion. Ex. : prénom ou prénom.nom"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          autoFocus
        />
        <PasswordField value={form.password} onChange={(value) => set("password", value)} error={errors.password} isNew={!member} />
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-fg">Profil</legend>
        <Field label="Prénom et nom" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} error={errors.fullName} maxLength={80} autoComplete="off" />
        <Field label="Poste" value={form.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} error={errors.jobTitle} maxLength={80} placeholder="Prospecteur, Commercial…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pôle" optional value={form.department} onChange={(event) => set("department", event.target.value)} error={errors.department} list={departmentsId} maxLength={60} />
          <datalist id={departmentsId}>
            {view.departments.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
          <SelectField label="Responsable" optional value={form.managerId} onChange={(event) => set("managerId", event.target.value)} error={errors.managerId}>
            <option value="">Aucun (en haut de l&apos;organigramme)</option>
            {managers.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName}
              </option>
            ))}
          </SelectField>
        </div>
        <Field
          label="Photo (URL)"
          optional
          type="url"
          value={form.avatarUrl}
          onChange={(event) => set("avatarUrl", event.target.value)}
          error={errors.avatarUrl}
          placeholder="https://"
        />
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-fg">Rôles</legend>
        <Checkbox label="Prospecteur" hint="Apparaît dans le classement et le bilan." checked={form.isProspector} onChange={(value) => set("isProspector", value)} />
        <Checkbox label="Administrateur" hint="Gère les identifiants et les mails et liens." checked={form.isAdmin} onChange={(value) => set("isAdmin", value)} />
        {errors.isAdmin && <p className="text-sm text-danger">{errors.isAdmin}</p>}
        {member && (
          <Checkbox
            label="Identifiant actif"
            hint="Désactivé : il disparaît de la connexion, son historique reste."
            checked={form.active}
            onChange={(value) => set("active", value)}
          />
        )}
      </fieldset>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6">
        <button type="button" onClick={onDone} className={buttonClasses({ variant: "ghost" })}>
          Annuler
        </button>
        <button type="submit" disabled={pending} className={buttonClasses()}>
          {pending ? "Enregistrement…" : member ? "Enregistrer" : "Créer l'identifiant"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({ value, onChange, error, isNew }: { value: string; onChange: (value: string) => void; error?: string; isNew: boolean }) {
  const id = useId();
  const [visible, setVisible] = useState(isNew);
  const hint = isNew
    ? `Généré automatiquement, modifiable (${MIN_PASSWORD_LENGTH} caractères minimum).`
    : "Laisse vide pour garder le mot de passe actuel.";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {isNew ? "Mot de passe" : "Nouveau mot de passe"}
        {!isNew && <span className="font-normal text-subtle"> (facultatif)</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={200}
            className={`${controlClasses} h-11 pr-11 font-mono`}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {visible ? <EyeSlashIcon size={18} aria-hidden /> : <EyeIcon size={18} aria-hidden />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
          className={buttonClasses({ variant: "secondary", className: "h-11 px-3.5" })}
          aria-label="Générer un mot de passe"
          title="Générer un mot de passe"
        >
          <ArrowsClockwiseIcon size={18} aria-hidden />
          <span className="hidden sm:inline">Générer</span>
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-subtle">
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Après l'enregistrement : les accès à transmettre, prêts à copier. */
function SavedPanel({ saved, onDone }: { saved: { login: string; password: string; message: string }; onDone: () => void }) {
  const credentialsId = useId();
  const credentials = saved.password ? `Identifiant : ${saved.login}\nMot de passe : ${saved.password}` : null;
  return (
    <div className="flex flex-col items-start gap-5">
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-fg">
        <CheckCircleIcon size={22} weight="fill" className="text-success" aria-hidden />
        {saved.message}
      </p>
      {credentials ? (
        <>
          <div className="w-full rounded-2xl border border-line bg-surface-2 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <IdentificationCardIcon size={18} aria-hidden />
              Accès à transmettre
            </p>
            <p id={credentialsId} className="font-mono text-sm leading-relaxed whitespace-pre-line text-fg">
              {credentials}
            </p>
          </div>
          <p className="text-sm text-muted">
            Ce mot de passe ne sera plus affiché : copie-le maintenant. À sa première connexion, la personne choisit «&nbsp;{saved.login}&nbsp;» dans la liste.
          </p>
          <CopyButton text={credentials} label="Copier les accès" targetId={credentialsId} />
        </>
      ) : null}
      <button type="button" onClick={onDone} className={buttonClasses({ className: "self-stretch sm:self-start" })}>
        Terminé
      </button>
    </div>
  );
}
