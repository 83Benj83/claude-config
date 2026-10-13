"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useActionState, useId } from "react";
import { updateMember, type MemberFormState } from "@/app/actions/members";
import { buttonClasses } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import type { Member } from "@/lib/types";

type Props = {
  member: Member;
  managers: Pick<Member, "id" | "fullName">[];
  departments: string[];
};

const INITIAL: MemberFormState = { status: "idle" };

export function MemberForm({ member, managers, departments }: Props) {
  const [state, action, pending] = useActionState(updateMember, INITIAL);
  const ids = { manager: useId(), departments: useId(), adminError: useId(), managerError: useId() };

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <input type="hidden" name="id" value={member.id} />
      <div className="sm:col-span-2">
        <FormError message={state.status === "error" ? state.message : undefined} />
      </div>

      <Field label="Prénom et nom" name="fullName" defaultValue={member.fullName} required error={state.errors?.fullName} />
      <Field label="Poste" name="jobTitle" defaultValue={member.jobTitle} required error={state.errors?.jobTitle} />
      <Field
        label="Pôle"
        name="department"
        defaultValue={member.department ?? ""}
        list={ids.departments}
        hint="Ex. Commercial, Production, Direction."
        error={state.errors?.department}
      />
      <datalist id={ids.departments}>
        {departments.map((department) => (
          <option key={department} value={department} />
        ))}
      </datalist>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.manager} className="text-sm font-medium text-fg">
          Responsable
        </label>
        <select
          id={ids.manager}
          name="managerId"
          defaultValue={member.managerId ?? ""}
          aria-invalid={Boolean(state.errors?.managerId)}
          aria-describedby={state.errors?.managerId ? ids.managerError : undefined}
          className="h-11 rounded-xl border border-line-strong bg-surface px-3 text-[0.9375rem] text-fg outline-none focus:border-accent"
        >
          <option value="">Aucun (haut de l&apos;organigramme)</option>
          {managers
            .filter((manager) => manager.id !== member.id)
            .map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
        </select>
        {state.errors?.managerId && (
          <p id={ids.managerError} className="text-sm text-danger">
            {state.errors.managerId}
          </p>
        )}
      </div>

      <Field
        className="sm:col-span-2"
        label="Photo (URL, facultatif)"
        name="avatarUrl"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={member.avatarUrl ?? ""}
        error={state.errors?.avatarUrl}
      />

      <fieldset className="flex flex-col gap-3 sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-fg">Rôle</legend>
        <Checkbox name="isProspector" defaultChecked={member.isProspector} label="Apparaît dans le classement" hint="Pour les personnes qui prospectent." />
        <Checkbox name="isAdmin" defaultChecked={member.isAdmin} label="Administrateur" hint="Peut modifier l'équipe et l'organigramme." describedBy={state.errors?.isAdmin ? ids.adminError : undefined} />
        {state.errors?.isAdmin && (
          <p id={ids.adminError} className="text-sm text-danger">
            {state.errors.isAdmin}
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses()}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <p role="status" className="flex items-center gap-1.5 text-sm text-muted">
          {state.status === "success" && (
            <>
              <CheckCircleIcon size={18} weight="fill" className="text-success" aria-hidden />
              {state.message}
            </>
          )}
        </p>
      </div>
    </form>
  );
}

function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
  describedBy,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
  describedBy?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        aria-describedby={describedBy ?? `${id}-hint`}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <label htmlFor={id} className="text-sm">
        <span className="block font-medium text-fg">{label}</span>
        <span id={`${id}-hint`} className="block text-subtle">
          {hint}
        </span>
      </label>
    </div>
  );
}
