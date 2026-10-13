import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { site } from "@/config/site";

export function Values() {
  return (
    <section aria-labelledby="values-title" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <h2 id="values-title" className="text-3xl font-semibold tracking-tighter text-fg sm:text-4xl lg:sticky lg:top-28">
            Ce qui nous fait avancer.
          </h2>
        </Reveal>
        <ul className="flex flex-col gap-12 lg:col-span-8">
          {site.values.map((value, index) => (
            <li key={value.title}>
              <Reveal delay={index * 0.05}>
                <p className="text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">{value.title}</p>
                <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-muted">{value.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Reveal className="relative overflow-hidden rounded-2xl bg-accent px-6 py-14 text-on-accent sm:px-12 sm:py-16">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-40 mix-blend-multiply" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 id="closing-title" className="text-4xl font-semibold tracking-tighter sm:text-5xl">
              {site.closing.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-on-accent/80">{site.closing.text}</p>
          </div>
          <Link href="/classement#ma-journee" className={buttonClasses({ variant: "inverse", size: "lg" })}>
            Saisir ma journée
            <ArrowRightIcon size={18} weight="bold" aria-hidden />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
