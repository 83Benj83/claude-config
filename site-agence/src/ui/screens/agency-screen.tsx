"use client";

import { ArrowRightIcon, BookOpenTextIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { site } from "@/config/site";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Segmented } from "../primitives/choice";
import { Icon } from "../primitives/icon";
import { Card } from "../primitives/surface";

type Tab = "packs" | "parcours" | "engagements";

/** Présentation d'Astrinova : l'essentiel d'un coup d'œil, le détail par onglet. */
export function AgencyScreen() {
  const { Link } = usePlatform();
  const [tab, setTab] = useState<Tab>("packs");

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="agence-titre" className="sky sky-stars relative min-w-0 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sky-muted)] uppercase">{site.name} · {site.tagline}</p>
          <h1 id="agence-titre" className="mt-3 font-display text-3xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            {site.hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--sky-muted)] sm:text-base">{site.hero.subtitle}</p>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {site.facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
              <dt className="text-xs text-[var(--sky-muted)]">{fact.label}</dt>
              <dd className="mt-0.5 font-display text-base font-semibold tracking-tight sm:text-lg">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-fg">{site.about.title}</h2>
          <p className="mt-1.5 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">{site.about.body}</p>
        </div>
        <Link href="/guide" className={buttonClasses({ variant: "secondary", className: "self-start sm:self-center" })}>
          <BookOpenTextIcon size={18} aria-hidden />
          Lire le guide
        </Link>
      </Card>

      <Segmented
        label="Rubrique de présentation"
        value={tab}
        onChange={setTab}
        options={[
          { value: "packs", label: "Les packs" },
          { value: "parcours", label: "Le parcours" },
          { value: "engagements", label: "Nos engagements" },
        ]}
      />

      {tab === "packs" && (
        <ul className="grid gap-3 md:grid-cols-3">
          {site.packs.map((pack) => (
            <li key={pack.name} className={`tone-${pack.tone}`}>
              <Card as="article" className="relative flex h-full flex-col overflow-hidden p-5 sm:p-6">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[var(--tone)]" />
                <p className="text-sm font-semibold text-[var(--tone-ink)]">{pack.name}</p>
                <p className="mt-1 font-display text-4xl font-bold tracking-tight text-fg">{pack.price}</p>
                <p className="text-xs text-subtle">payé une seule fois</p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{pack.tagline}</p>
                <dl className="mt-auto grid gap-1.5 pt-5 text-sm">
                  <div className="flex justify-between gap-3 border-t border-line pt-3">
                    <dt className="text-subtle">Délai</dt>
                    <dd className="text-right font-medium text-fg">{pack.delay}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-subtle">Abonnement</dt>
                    <dd className="text-right font-medium text-fg">{pack.subscription}</dd>
                  </div>
                </dl>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {tab === "parcours" && (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {site.method.map((step, index) => (
            <li key={step.verb}>
              <Card as="article" className="relative h-full overflow-hidden p-5">
                <span aria-hidden className="absolute -top-3 -right-1 font-display text-[5.5rem] leading-none font-bold tracking-tighter text-surface-2 tabular">
                  {index + 1}
                </span>
                <span className="relative grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                  <Icon name={step.icon} size={22} />
                </span>
                <h2 className="relative mt-4 font-display text-base font-bold tracking-tight text-fg">
                  <span className="sr-only">Étape {index + 1} : </span>
                  {step.verb}
                </h2>
                <p className="relative mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {tab === "engagements" && (
        <div className="grid gap-3 lg:grid-cols-3">
          {site.values.map((value, index) => (
            <Card key={value.title} as="article" className={`tone-${(["violet", "gold", "mint"] as const)[index % 3]} p-6`}>
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--tone-soft)] text-[var(--tone-ink)]">
                <Icon name={value.icon} size={22} />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-fg">{value.title}</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{value.text}</p>
            </Card>
          ))}
        </div>
      )}

      <section className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex gap-3">
          <CheckCircleIcon size={26} weight="fill" className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-fg">{site.closing.title}</h2>
            <p className="mt-1 max-w-xl text-[0.9375rem] text-muted">{site.closing.text}</p>
          </div>
        </div>
        <Link href="/prospection" className={buttonClasses()}>
          Prospecter
          <ArrowRightIcon size={18} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
