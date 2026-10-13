"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.errors?.form} />
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
        autoComplete="current-password"
        required
        error={state.errors?.password}
      />
      <button type="submit" disabled={pending} className={buttonClasses({ size: "lg", className: "mt-2 w-full" })}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
