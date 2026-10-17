"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  ChartBarIcon,
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
import { formatDayLong, formatDayShort, todayIso } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { generatePassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/rules";
import type { Member } from "@/lib/types";
import type { AdminView } from "@/lib/views";
import { usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { buttonClasses } from "../primitives/button";
import { CopyButton } from "../primitives/copy-button";
import { Segmented } from "../primitives/choice";
import { Checkbox, Field, FormMessage, SelectField, controlClasses } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Badge, Card, ScreenHeader, StatTile } from "../primitives/surface";
import { useToast } from "../primitives/toast";

type Tab = "identifiants" | "statistiques";

/**
 * Panel admin : les identifiants de l'équipe (création, mots de passe, rôles)
 * et les statistiques (chiffres clés, remise à zéro). À la première connexion,
 * chacun choisit son identifiant dans la liste et entre son mot de passe.
 */
export function AdminScreen({ view }: { view: AdminView }) {
  const [tab, setTab] = useState<Tab>("identifiants");
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const active = view.members.filter((member) => member.active);
  const waiting = active.filter((member) => !member.welcomedAt).length;
  const admins = active.filter((member) => member.isAdmin).length;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Panel admin"
        description="Les identifiants de l'équipe et les statistiques. Réservé aux administrateurs."
        actions={
          tab === "identifiants" && (
            <button type="button" onClick={() => setEditing("new")} className={buttonClasses()}>
              <UserPlusIcon size={18} aria-hidden />
              Nouvel identifiant
            </button>
          )
        }
      />

      <Segmented
        label="Partie du panel admin"
        value={tab}
        onChange={setTab}
        options={[
          { value: "identifiants", label: `Identifiants (${active.length})` },
          { value: "statistiques", label: "Statistiques" },
        ]}
      />

      {tab === "statistiques" ? (
        <StatisticsPanel view={view} />
      ) : (
      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Actifs" value={formatInt(active.length)} />
            <StatTile label="Jamais connectés" value={formatInt(waiting)} />
            <StatTile label="Admins" value={formatInt(admins)} />
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
      )}

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

/** Chiffres clés et remise à zéro des compteurs (confirmation tapée, rien n'est supprimé). */
function StatisticsPanel({ view }: { view: AdminView }) {
  const { actions, Link } = usePlatform();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fieldId = useId();
  const since = view.stats.since;

  const reset = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.resetStatistics({ confirmation });
      if (!result.ok) {
        setError(result.errors?.confirmation ?? result.message ?? "Remise à zéro impossible.");
        return;
      }
      setConfirmation("");
      setError(null);
      toast(result.message ?? "Statistiques remises à zéro.");
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Prospects ce mois-ci" value={formatInt(view.stats.countedThisMonth)} />
          <StatTile label="Commerces déjà contactés" value={formatInt(view.stats.establishments)} />
        </div>
        <Card className="p-5">
          <p className="text-sm text-subtle">Les compteurs partent du</p>
          <p className="mt-0.5 font-display text-xl font-bold tracking-tight text-fg first-letter:uppercase" suppressHydrationWarning>
            {since ? formatDayLong(todayIso(new Date(since))) : "début (jamais remis à zéro)"}
          </p>
          <p className="mt-3 text-sm text-muted">
            Le bilan, le classement et les compteurs de la prospection ne comptent que les prospects ajoutés depuis cette date.
          </p>
          <Link href="/bilan" className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-4" })}>
            <ChartBarIcon size={16} aria-hidden />
            Voir le bilan et l&apos;exporter
          </Link>
        </Card>
      </div>

      <Card className="min-w-0 border-danger/40 p-5 lg:col-span-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-fg">
          <ArrowCounterClockwiseIcon size={18} className="text-danger" aria-hidden />
          Remettre les statistiques à zéro
        </h2>
        <p className="mt-2 text-sm text-muted">
          Le classement, le bilan et tous les compteurs repartent de zéro à partir de maintenant, pour toute l&apos;équipe.
          L&apos;historique «&nbsp;déjà contacté ?&nbsp;» est conservé : aucun commerce n&apos;est oublié.
        </p>
        <form onSubmit={reset} className="mt-4 flex flex-col gap-3" noValidate>
          <Field
            id={fieldId}
            label={<>Pour confirmer, tape <strong>zéro</strong></>}
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={pending || confirmation.trim() === ""}
            className={buttonClasses({ variant: "secondary", className: "border-danger text-danger hover:bg-danger-soft" })}
          >
            <ArrowCounterClockwiseIcon size={18} aria-hidden />
            {pending ? "Remise à zéro…" : "Remettre à zéro"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function MemberRow({ member, isMe, onEdit }: { member: Member; isMe: boolean; onEdit: () => void }) {
  const lastLogin = member.lastLoginAt ? formatDayShort(todayIso(new Date(member.lastLoginAt))) : null;
  const status = !member.active
    ? "désactivé"
    : member.welcomedAt
      ? lastLogin
        ? `dernière connexion le ${lastLogin}`
        : "première connexion faite"
      : "aucune connexion";
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
          <span className="max-sm:hidden">
            {" · "}
            {status}
          </span>
        </p>
        {/* Téléphone : rôles et dernière connexion sur une ligne à part, rien n'est coupé. */}
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
          <RoleBadges member={member} />
          <span className="text-xs text-subtle">{status}</span>
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <RoleBadges member={member} />
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

function RoleBadges({ member }: { member: Member }) {
  return (
    <>
      {member.isAdmin && <Badge tone="accent">Admin</Badge>}
      {member.isProspector && <Badge>Prospecteur</Badge>}
      {!member.active && <Badge tone="danger">Désactivé</Badge>}
    </>
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
        <Checkbox label="Administrateur" hint="Accède au panel admin (identifiants, statistiques) et gère les contrats." checked={form.isAdmin} onChange={(value) => set("isAdmin", value)} />
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
