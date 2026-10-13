import { TrendChart } from "@/components/charts/trend-chart";
import { Reveal } from "@/components/motion/reveal";
import { formatInt } from "@/lib/format";
import { getHomeData } from "@/lib/queries";

/** Chiffres réels de l'équipe : aucune donnée inventée sur la page d'accueil. */
export async function LiveFigures() {
  const data = await getHomeData();
  const figures = [
    { label: "Aujourd'hui", value: data.totals.today },
    { label: "Cette semaine", value: data.totals.week },
    { label: "Ce mois-ci", value: data.totals.month },
  ];

  return (
    <Reveal>
      <div className="grid gap-10 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">En direct</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tighter text-fg sm:text-4xl">
              Les prospections de toute l&apos;équipe.
            </h2>
          </div>
          <dl className="grid grid-cols-3 gap-4">
            {figures.map((figure) => (
              <div key={figure.label} className="border-l-2 border-accent pl-3">
                <dt className="text-sm text-subtle">{figure.label}</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{formatInt(figure.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <TrendChart points={data.trend} label="Prospections par jour, 14 derniers jours" />
      </div>
    </Reveal>
  );
}

export function LiveFiguresSkeleton() {
  return <div className="skeleton h-80 rounded-2xl" aria-hidden />;
}
