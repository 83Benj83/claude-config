"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { guide } from "@/content/guide";
import { GuideBlockView } from "../guide/blocks";
import { buttonClasses } from "../primitives/button";
import { controlClasses } from "../primitives/field";
import { ScreenHeader } from "../primitives/surface";

/**
 * Guide du prospecteur : une section à la fois, choisie dans le sommaire
 * (colonne fixe sur ordinateur, liste déroulante sur téléphone), avec
 * précédent / suivant en bas de page.
 */
export function GuideScreen() {
  const [index, setIndex] = useState(0);
  const selectId = useId();
  const section = guide.sections[index];
  const previous = guide.sections[index - 1];
  const next = guide.sections[index + 1];

  const open = (target: number) => {
    setIndex(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={guide.title} description={guide.lead} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {guide.facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
            <dt className="text-xs text-subtle">{fact.label}</dt>
            <dd className="mt-0.5 font-display font-bold tracking-tight text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        {/* Sommaire */}
        <nav aria-label="Sommaire du guide" className="lg:sticky lg:top-6">
          <div className="lg:hidden">
            <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-fg">
              Section
            </label>
            <select id={selectId} value={index} onChange={(event) => open(Number(event.target.value))} className={`${controlClasses} h-12 font-medium`}>
              {guide.sections.map((item, itemIndex) => (
                <option key={item.id} value={itemIndex}>
                  {itemIndex + 1}. {item.title}
                </option>
              ))}
            </select>
          </div>
          <ol className="hidden flex-col gap-0.5 rounded-2xl border border-line bg-surface p-2 lg:flex">
            {guide.sections.map((item, itemIndex) => {
              const active = itemIndex === index;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(itemIndex)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                      active ? "bg-mint-soft font-semibold text-mint-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular ${active ? "bg-mint text-[#0b0b10]" : "bg-surface-2 text-subtle"}`}>
                      {itemIndex + 1}
                    </span>
                    <span className="min-w-0">{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Section courante */}
        <article aria-labelledby={`guide-${section.id}`} className="flex min-w-0 flex-col gap-5">
          <header className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-mint-ink uppercase">
              Section {index + 1} sur {guide.sections.length}
            </p>
            <h2 id={`guide-${section.id}`} className="mt-1 font-display text-2xl font-bold tracking-tight text-fg">
              {section.title}
            </h2>
            {section.intro && <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{section.intro}</p>}
          </header>

          {section.blocks.map((block, blockIndex) => (
            <GuideBlockView key={`${section.id}-${blockIndex}`} block={block} />
          ))}

          <nav aria-label="Sections voisines" className="mt-2 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            {previous ? (
              <button type="button" onClick={() => open(index - 1)} className={buttonClasses({ variant: "secondary", className: "h-auto justify-start py-3 text-left whitespace-normal" })}>
                <ArrowLeftIcon size={18} className="shrink-0" aria-hidden />
                <span>
                  <span className="block text-xs font-normal text-subtle">Précédent</span>
                  {previous.title}
                </span>
              </button>
            ) : (
              <span />
            )}
            {next && (
              <button type="button" onClick={() => open(index + 1)} className={buttonClasses({ className: "h-auto justify-end py-3 text-right whitespace-normal sm:col-start-2" })}>
                <span>
                  <span className="block text-xs font-normal opacity-80">Suivant</span>
                  {next.title}
                </span>
                <ArrowRightIcon size={18} className="shrink-0" aria-hidden />
              </button>
            )}
          </nav>

          <p className="text-xs text-subtle">{index === guide.sections.length - 1 ? guide.footer : guide.updated}</p>
        </article>
      </div>
    </div>
  );
}
