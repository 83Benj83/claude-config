"use client";

import { ArrowSquareOutIcon, CaretDownIcon, CheckCircleIcon, InfoIcon, MagnifyingGlassIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { Fragment, useId, useState, type ReactNode } from "react";
import type { GuideBlock } from "@/content/guide";
import { normalizeText } from "@/lib/establishments";
import { CopyButton } from "../primitives/copy-button";
import { controlClasses } from "../primitives/field";

/** Passages à personnaliser ([entre crochets]) mis en évidence en violet. */
export function Placeholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <mark key={index} className="rounded-md bg-accent-soft px-1 py-px font-medium text-accent-ink">
            {part.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const external = (href: string) => (/^https?:\/\//.test(href) ? href : `https://${href}`);

export function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "text":
      return <p className="max-w-[72ch] text-[0.9375rem] leading-relaxed text-muted">{block.text}</p>;
    case "heading":
      return <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-fg">{block.text}</h3>;
    case "list":
      return (
        <ul className="flex max-w-[72ch] flex-col gap-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted">
              <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-3">
          {block.items.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-soft font-display text-sm font-bold text-mint-ink tabular">{index + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold text-fg">{step.title}</p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
                  <Placeholders text={step.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return <Callout tone={block.tone} title={block.title} text={block.text} />;
    case "links":
      return (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {block.items.map((link) => (
            <li key={`${link.label}-${link.value}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{link.label}</p>
                {link.href ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[0.8125rem] text-accent-ink hover:underline">
                    <span className="truncate">{link.value}</span>
                    <ArrowSquareOutIcon size={13} className="shrink-0" aria-hidden />
                  </a>
                ) : (
                  <p className="truncate font-mono text-[0.8125rem] text-muted">{link.value}</p>
                )}
              </div>
              <CopyButton text={link.href ?? link.value} label="Copier" />
            </li>
          ))}
        </ul>
      );
    case "packs":
      return (
        <ul className="grid gap-3 md:grid-cols-3">
          {block.items.map((pack) => (
            <li key={pack.name} className={`tone-${pack.tone} relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5`}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[var(--tone)]" />
              <p className="text-sm font-semibold text-[var(--tone-ink)]">{pack.name}</p>
              <p className="font-display text-3xl font-bold tracking-tight text-fg">{pack.price}</p>
              <p className="mt-2 text-sm text-muted">{pack.tagline}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {pack.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-fg">
                    <CheckCircleIcon size={18} weight="fill" className="mt-px shrink-0 text-[var(--tone)]" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <dl className="mt-auto grid gap-1 border-t border-line pt-3 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-3">
                <div>
                  <dt className="text-subtle">Délai</dt>
                  <dd className="text-right font-medium text-fg">{pack.delay}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Abonnement</dt>
                  <dd className="text-right font-medium text-fg">{pack.subscription}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      );
    case "table":
      return <GuideTable block={block} />;
    case "quotes":
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {block.items.map((quote) => (
            <li key={quote.title} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <p className="font-display font-bold tracking-tight text-fg">{quote.title}</p>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                {quote.lines.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right text-fg tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex justify-between gap-3 border-t border-line pt-3">
                <span className="text-sm font-semibold text-fg">À payer une fois</span>
                <span className="font-display text-lg font-bold text-accent-ink tabular">{quote.total}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-subtle">Abonnement</span>
                <span className="text-muted tabular">{quote.subscription}</span>
              </div>
            </li>
          ))}
        </ul>
      );
    case "works":
      return (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((work) => {
            const tone = work.pack.includes("Signature") ? "gold" : work.pack.includes("Pro") ? "violet" : "mint";
            return (
              <li key={work.name} className={`tone-${tone} flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4`}>
                <span className="w-fit rounded-full bg-[var(--tone-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--tone-ink)]">{work.pack}</span>
                <p className="font-display font-bold tracking-tight text-fg">{work.name}</p>
                <p className="text-sm text-muted">{work.text}</p>
                <a href={external(work.url)} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 truncate font-mono text-[0.8125rem] text-accent-ink hover:underline">
                  <span className="truncate">{work.url}</span>
                  <ArrowSquareOutIcon size={13} className="shrink-0" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      );
    case "templates":
      return (
        <div className="flex flex-col gap-3">
          {block.items.map((template) => (
            <Template key={template.title} title={template.title} body={template.body} />
          ))}
        </div>
      );
    case "faq":
      return <Faq items={block.items} />;
    case "dodont":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <RuleColumn title="À faire" items={block.dos} tone="mint" icon={<CheckCircleIcon size={20} weight="fill" className="mt-px shrink-0 text-mint" aria-hidden />} />
          <RuleColumn title="À ne jamais faire" items={block.donts} tone="coral" icon={<XCircleIcon size={20} weight="fill" className="mt-px shrink-0 text-coral" aria-hidden />} />
        </div>
      );
    case "glossary":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          {block.items.map((item) => (
            <div key={item.term} className="rounded-2xl border border-line bg-surface p-4">
              <dt className="font-display font-bold tracking-tight text-fg">{item.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{item.definition}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

function Callout({ tone, title, text }: { tone: "info" | "warn"; title: string; text: string }) {
  const Icon = tone === "info" ? InfoIcon : WarningIcon;
  return (
    <aside className={`flex gap-3 rounded-2xl px-4 py-3.5 ${tone === "info" ? "bg-accent-soft" : "bg-coral-soft"}`}>
      <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${tone === "info" ? "text-accent-ink" : "text-coral-ink"}`} aria-hidden />
      <div>
        <p className={`font-semibold ${tone === "info" ? "text-accent-ink" : "text-coral-ink"}`}>{title}</p>
        <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-fg">{text}</p>
      </div>
    </aside>
  );
}

/** Tableau sur ordinateur, fiches empilées sur téléphone (aucun défilement horizontal). */
function GuideTable({ block }: { block: Extract<GuideBlock, { type: "table" }> }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-2">
              {block.columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 font-semibold text-fg">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, index) =>
              "group" in row ? (
                <tr key={`g-${row.group}`}>
                  <th colSpan={block.columns.length} scope="colgroup" className="border-t border-line bg-accent-soft/60 px-4 py-2 text-xs font-semibold tracking-wide text-accent-ink uppercase">
                    {row.group}
                  </th>
                </tr>
              ) : (
                <tr key={index} className="border-t border-line align-top">
                  {row.cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`px-4 py-3 ${cellIndex === block.emphasis ? "font-semibold whitespace-nowrap text-accent-ink" : cellIndex === 0 ? "font-medium text-fg" : "text-muted"}`}>
                      {cell}
                      {cellIndex === 0 && row.badges && <Badges badges={row.badges} />}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {block.rows.map((row, index) =>
          "group" in row ? (
            <p key={`g-${row.group}`} className="mt-2 text-xs font-semibold tracking-wide text-accent-ink uppercase">
              {row.group}
            </p>
          ) : (
            <dl key={index} className="rounded-2xl border border-line bg-surface p-4 text-sm">
              {row.cells.map((cell, cellIndex) => (
                <div key={cellIndex} className={cellIndex > 0 ? "mt-2" : ""}>
                  <dt className="text-xs text-subtle">{block.columns[cellIndex]}</dt>
                  <dd className={cellIndex === block.emphasis ? "font-semibold text-accent-ink" : cellIndex === 0 ? "font-semibold text-fg" : "text-muted"}>
                    {cell}
                    {cellIndex === 0 && row.badges && <Badges badges={row.badges} />}
                  </dd>
                </div>
              ))}
            </dl>
          ),
        )}
      </div>
    </>
  );
}

function Badges({ badges }: { badges: string[] }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span key={badge} className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${badge.includes("Signature") ? "bg-gold-soft text-gold-ink" : "bg-mint-soft text-mint-ink"}`}>
          {badge}
        </span>
      ))}
    </span>
  );
}

function Template({ title, body }: { title: string; body: string }) {
  const id = useId();
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
        <h4 className="font-semibold text-fg">{title}</h4>
        <CopyButton text={body} label="Copier" targetId={id} />
      </header>
      <p id={id} className="px-4 py-4 text-[0.9375rem] leading-relaxed whitespace-pre-line text-fg">
        <Placeholders text={body} />
      </p>
    </article>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [query, setQuery] = useState("");
  const needle = normalizeText(query);
  const shown = needle ? items.filter((item) => normalizeText(`${item.q} ${item.a}`).includes(needle)) : items;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une question"
          aria-label="Rechercher une question"
          className={`${controlClasses} h-11 pl-10`}
        />
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {shown.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-semibold text-fg hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              {item.q}
              <CaretDownIcon size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
        {shown.length === 0 && <p className="px-4 py-4 text-sm text-muted">Aucune question ne correspond. Essayez un autre mot, ou renvoyez la question vers l’équipe.</p>}
      </div>
    </div>
  );
}

function RuleColumn({ title, items, tone, icon }: { title: string; items: string[]; tone: "mint" | "coral"; icon: ReactNode }) {
  return (
    <section className={`tone-${tone} rounded-2xl border border-line bg-surface p-5`}>
      <h3 className="font-display text-lg font-bold tracking-tight text-[var(--tone-ink)]">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-fg">
            {icon}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
