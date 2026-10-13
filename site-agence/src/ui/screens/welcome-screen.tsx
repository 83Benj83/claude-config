"use client";

import { MagnifyingGlassIcon, PlusCircleIcon, TrophyIcon } from "@phosphor-icons/react";
import { useState, useTransition, type FormEvent } from "react";
import { site } from "@/config/site";
import { firstName } from "@/lib/format";
import type { MemberSummary } from "@/lib/views";
import { usePlatform } from "../platform";
import { Avatar } from "../primitives/avatar";
import { buttonClasses } from "../primitives/button";
import { Field, FormMessage } from "../primitives/field";

const STEPS = [
  { icon: PlusCircleIcon, title: "Prospecter", text: "Ajoute chaque restaurant contacté : nom, ville et moyen de contact." },
  { icon: MagnifyingGlassIcon, title: "Déjà contacté ?", text: "Vérifie en deux secondes qu'un établissement n'a pas déjà été démarché." },
  { icon: TrophyIcon, title: "Classement", text: "Tes ajouts comptent dans le classement du jour, de la semaine et du mois." },
];

/** Première connexion : on confirme le nom affiché et le poste, puis on présente l'outil. */
export function WelcomeScreen({ member }: { member: MemberSummary }) {
  const { actions, reload } = usePlatform();
  const [fullName, setFullName] = useState(member.fullName);
  const [jobTitle, setJobTitle] = useState(member.jobTitle);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await actions.completeWelcome({ fullName, jobTitle });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      reload("/");
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-4 py-12 sm:px-8">
      <div className="flex items-center gap-4">
        <Avatar member={{ fullName, avatarUrl: member.avatarUrl }} size="lg" highlight />
        <div>
          <p className="text-sm text-subtle">Première connexion</p>
          <h1 className="text-3xl font-semibold tracking-tighter text-fg sm:text-4xl">Bienvenue {firstName(fullName) || ""}</h1>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.title} className="rounded-2xl border border-line bg-surface p-4">
            <step.icon size={24} className="text-accent-ink" aria-hidden />
            <p className="mt-3 font-semibold text-fg">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" noValidate>
        <div>
          <h2 className="font-semibold text-fg">Comment veux-tu apparaître ?</h2>
          <p className="mt-0.5 text-sm text-subtle">Ton nom s&apos;affiche dans le classement et l&apos;organigramme de {site.name}.</p>
        </div>
        <FormMessage>{message}</FormMessage>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom et nom" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" error={errors.fullName} />
          <Field label="Poste" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} error={errors.jobTitle} />
        </div>
        <button type="submit" disabled={pending} className={buttonClasses({ size: "lg", className: "sm:w-fit" })}>
          {pending ? "Un instant…" : "C'est parti"}
        </button>
      </form>
    </main>
  );
}
