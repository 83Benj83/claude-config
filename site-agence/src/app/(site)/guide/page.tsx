import { BookOpenTextIcon, ClockIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { GuideToc } from "@/components/guide/guide-toc";
import { PageIntro, Section } from "@/components/page-intro";
import { formatDayLong } from "@/lib/dates";
import { getGuide, slugify } from "@/lib/guide";

export const metadata: Metadata = { title: "Guide de prospection" };

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

const components: Components = {
  h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table>{children}</table>
    </div>
  ),
};

export default async function GuidePage() {
  const guide = await getGuide();

  return (
    <>
      <PageIntro
        title="Guide de prospection"
        description="La méthode de l'agence pour trouver, contacter et relancer les prospects. À relire avant chaque session."
      />
      <Section className="mt-8 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="group rounded-2xl border border-line bg-surface p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-fg">
              Sommaire
              <span className="text-subtle transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <ol className="mt-3 flex flex-col gap-1">
              {guide.headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`} className="block py-1 text-sm text-muted hover:text-fg">
                    {heading.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>
          <div className="hidden lg:block">
            <GuideToc headings={guide.headings} />
            <dl className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-sm text-subtle">
              <div className="flex items-center gap-2">
                <ClockIcon size={16} aria-hidden />
                <dt className="sr-only">Temps de lecture</dt>
                <dd>{guide.readingMinutes} min de lecture</dd>
              </div>
              <div className="flex items-center gap-2">
                <BookOpenTextIcon size={16} aria-hidden />
                <dt className="sr-only">Dernière mise à jour</dt>
                <dd>Mis à jour le {formatDayLong(guide.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <article className="prose-guide max-w-[70ch]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {guide.markdown}
          </ReactMarkdown>
        </article>
      </Section>
    </>
  );
}
