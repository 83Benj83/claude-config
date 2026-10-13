"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.errors?.form} />
      <Field
        label="Prénom et nom"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.values?.fullName}
        error={state.errors?.fullName}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        hint="10 caractères minimum."
        error={state.errors?.password}
      />
      <Field
        label="Code d'invitation"
        name="inviteCode"
        autoComplete="off"
        required
        error={state.errors?.inviteCode}
      />
      <button type="submit" disabled={pending} className={buttonClasses({ size: "lg", className: "mt-2 w-full" })}>
        {pending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
