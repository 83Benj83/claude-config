"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { site } from "@/config/site";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Segmented } from "../primitives/choice";
import { Icon } from "../primitives/icon";
import { Card } from "../primitives/surface";

type Tab = "services" | "methode" | "valeurs";

/** Présentation de l'agence : l'essentiel d'un coup d'œil, le détail par onglet. */
export function AgencyScreen() {
  const { Link } = usePlatform();
  const [tab, setTab] = useState<Tab>("services");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-12">
        <section
          aria-labelledby="agence-titre"
          className="relative min-w-0 overflow-hidden rounded-3xl bg-inverse p-6 text-on-inverse sm:p-10 lg:col-span-8"
        >
          {/* Formes décoratives tenues hors de la zone de texte (contraste du texte préservé). */}
          <span aria-hidden className="absolute -top-14 -right-14 hidden size-44 rounded-full bg-accent sm:block" />
          <span aria-hidden className="absolute -right-10 -bottom-24 size-44 rounded-full border-[22px] border-accent/35" />
          <div className="relative max-w-xl sm:pr-28">
            <p className="text-sm font-medium tracking-wide uppercase opacity-70">{site.tagline}</p>
            <h1 id="agence-titre" className="mt-3 text-3xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
              {site.hero.title}
            </h1>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed opacity-80">{site.hero.subtitle}</p>
          </div>
        </section>

        <Card className="flex flex-col justify-between gap-6 p-6 lg:col-span-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-subtle uppercase">Qui on est</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-fg">{site.about.title}</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{site.about.body}</p>
          </div>
          <Link href="/prospection" className={buttonClasses({ className: "self-start" })}>
            Prospecter maintenant
            <ArrowRightIcon size={18} aria-hidden />
          </Link>
        </Card>
      </div>

      <Segmented
        label="Rubrique de présentation"
        value={tab}
        onChange={setTab}
        options={[
          { value: "services", label: "Services" },
          { value: "methode", label: "Méthode" },
          { value: "valeurs", label: "Valeurs" },
        ]}
      />

      {tab === "services" && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {site.services.map((service) => (
            <li key={service.title}>
              <Card as="article" className="group h-full p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong">
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink transition-colors group-hover:bg-accent group-hover:text-on-accent">
                  <Icon name={service.icon} size={22} />
                </span>
                <h2 className="mt-4 text-base font-semibold tracking-tight text-fg">{service.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{service.description}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {tab === "methode" && (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {site.method.map((step, index) => (
            <li key={step.verb}>
              <Card as="article" className="relative h-full overflow-hidden p-5">
                <span aria-hidden className="absolute -top-3 -right-1 text-[5.5rem] leading-none font-semibold tracking-tighter text-surface-2 tabular">
                  {index + 1}
                </span>
                <span className="relative grid size-11 place-items-center rounded-full bg-inverse text-on-inverse">
                  <Icon name={step.icon} size={20} />
                </span>
                <h2 className="relative mt-4 text-base font-semibold tracking-tight text-fg">
                  <span className="sr-only">Étape {index + 1} : </span>
                  {step.verb}
                </h2>
                <p className="relative mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {tab === "valeurs" && (
        <div className="grid gap-3 lg:grid-cols-3">
          {site.values.map((value) => (
            <Card key={value.title} as="article" className="border-l-4 border-l-accent p-6">
              <h2 className="text-lg font-semibold tracking-tight text-fg">{value.title}</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{value.text}</p>
            </Card>
          ))}
        </div>
      )}

      <section className="dot-grid flex flex-col items-start gap-4 rounded-3xl border border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-fg">{site.closing.title}</h2>
          <p className="mt-1 max-w-xl text-[0.9375rem] text-muted">{site.closing.text}</p>
        </div>
        <Link href="/classement" className={buttonClasses({ variant: "secondary" })}>
          Voir le classement
        </Link>
      </section>
    </div>
  );
}
