import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/config/site";

/** Frise de la méthode : chaque étape est nommée par son verbe. */
export function Method() {
  return (
    <section aria-labelledby="method-title" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 id="method-title" className="max-w-xl text-3xl font-semibold tracking-tighter text-fg sm:text-5xl">
            De la première piste au site en ligne.
          </h2>
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            Le détail dans le guide
            <ArrowRightIcon size={16} aria-hidden />
          </Link>
        </Reveal>

        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
          <span aria-hidden className="absolute top-6 right-[calc(25%-2.625rem)] left-6 hidden h-px bg-line-strong md:block" />
          {site.method.map((step, index) => (
            <li key={step.verb} className="relative">
              <Reveal delay={index * 0.08} className="flex gap-5 md:flex-col md:gap-6">
                <span className="relative grid size-12 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-fg">
                  <Icon name={step.icon} size={22} />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-fg">{step.verb}</h3>
                  <p className="mt-2 max-w-[32ch] leading-relaxed text-muted">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
