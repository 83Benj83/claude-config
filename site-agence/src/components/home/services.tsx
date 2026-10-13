import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/config/site";

/**
 * Bento asymétrique (4 services → 4 cellules) avec des fonds variés :
 * accent plein, trame de points, surface claire, surface teintée.
 */
const CELLS = [
  { className: "md:col-span-4 bg-accent text-on-accent", iconClass: "bg-on-accent/10", textClass: "text-on-accent", big: true },
  { className: "md:col-span-2 dot-grid bg-surface border border-line", iconClass: "bg-accent-soft text-accent-ink", textClass: "text-muted", big: false },
  { className: "md:col-span-3 bg-surface border border-line", iconClass: "bg-surface-2 text-fg", textClass: "text-muted", big: false },
  { className: "md:col-span-3 bg-surface-2 border border-line", iconClass: "bg-surface text-accent-ink", textClass: "text-muted", big: false },
];

export function Services() {
  return (
    <section aria-labelledby="services-title" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="max-w-2xl">
        <h2 id="services-title" className="text-3xl font-semibold tracking-tighter text-fg sm:text-5xl">
          {site.about.title}
        </h2>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">{site.about.body}</p>
      </Reveal>

      <ul className="mt-12 grid gap-3 md:grid-cols-6">
        {site.services.map((service, index) => {
          const cell = CELLS[index % CELLS.length];
          return (
            <li key={service.title} className={`${cell.className} rounded-2xl`}>
              <Reveal delay={index * 0.06} className="flex h-full flex-col justify-between gap-10 p-6 sm:p-8">
                <span className={`grid size-12 place-items-center rounded-full ${cell.iconClass}`}>
                  <Icon name={service.icon} size={24} />
                </span>
                <div>
                  <h3 className={`font-semibold tracking-tight ${cell.big ? "text-3xl sm:text-4xl" : "text-xl"}`}>{service.title}</h3>
                  <p className={`mt-2 max-w-[42ch] leading-relaxed ${cell.textClass}`}>{service.description}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
