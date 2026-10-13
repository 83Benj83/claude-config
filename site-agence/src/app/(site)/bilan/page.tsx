import { CaretLeftIcon, CaretRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrendChart } from "@/components/charts/trend-chart";
import { PageIntro, Section } from "@/components/page-intro";
import { Heatmap } from "@/components/report/heatmap";
import { ReportTable } from "@/components/report/report-table";
import { buttonClasses } from "@/components/ui/button";
import { addMonths, formatDayShort, formatMonth, isMonthKey, monthKeyOf } from "@/lib/dates";
import { formatDecimal, formatInt } from "@/lib/format";
import { getMonthData, getToday } from "@/lib/queries";

export const metadata: Metadata = { title: "Bilan mensuel" };

export default function BilanPage({ searchParams }: PageProps<"/bilan">) {
  return (
    <>
      <PageIntro
        title="Bilan du mois"
        description="Combien de prospections chacun a réalisé sur le mois, jour par jour. Exportable pour vos réunions."
      />
      <Suspense fallback={<ReportSkeleton />}>
        <ReportView searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReportView({ searchParams }: { searchParams: PageProps<"/bilan">["searchParams"] }) {
  const requested = (await searchParams).mois;
  const currentMonth = monthKeyOf(await getToday());
  // Mois demandé, borné au mois en cours (pas de bilan dans le futur).
  const month = isMonthKey(requested) && requested <= currentMonth ? requested : currentMonth;
  const { me, today, report } = await getMonthData(month);

  const isCurrent = month === currentMonth;
  const lastDay = isCurrent ? today : report.days[report.days.length - 1];
  const elapsedDays = report.days.filter((day) => day <= lastDay);
  const leader = report.rows[0]?.total > 0 ? report.rows[0] : null;
  const average = report.activeMembers > 0 ? report.teamTotal / report.activeMembers : 0;

  const figures = [
    { label: "Prospecteurs actifs", value: `${report.activeMembers} / ${report.rows.length}` },
    { label: "Moyenne par prospecteur actif", value: formatDecimal(average) },
    {
      label: "Meilleur jour de l'équipe",
      value: report.bestTeamDay ? formatInt(report.bestTeamDay.count) : "-",
      detail: report.bestTeamDay ? formatDayShort(report.bestTeamDay.date) : undefined,
    },
    { label: "En tête du mois", value: leader ? leader.member.fullName : "-", detail: leader ? `${formatInt(leader.total)} prospections` : undefined },
  ];

  return (
    <Section className="mt-8 flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Choisir le mois" className="flex items-center gap-2">
          <Link
            href={`/bilan?mois=${addMonths(month, -1)}`}
            scroll={false}
            className="grid size-10 place-items-center rounded-full border border-line-strong bg-surface text-fg hover:bg-surface-2"
            aria-label="Mois précédent"
          >
            <CaretLeftIcon size={18} aria-hidden />
          </Link>
          <p className="min-w-40 text-center text-lg font-semibold tracking-tight text-fg first-letter:uppercase" aria-live="polite">
            {formatMonth(month)}
          </p>
          {isCurrent ? (
            <span className="grid size-10 place-items-center rounded-full border border-line text-subtle opacity-50" aria-hidden>
              <CaretRightIcon size={18} />
            </span>
          ) : (
            <Link
              href={addMonths(month, 1) === currentMonth ? "/bilan" : `/bilan?mois=${addMonths(month, 1)}`}
              scroll={false}
              className="grid size-10 place-items-center rounded-full border border-line-strong bg-surface text-fg hover:bg-surface-2"
              aria-label="Mois suivant"
            >
              <CaretRightIcon size={18} aria-hidden />
            </Link>
          )}
        </nav>
        <a href={`/bilan/export?mois=${month}`} className={buttonClasses({ variant: "secondary", size: "sm" })} download>
          <DownloadSimpleIcon size={16} aria-hidden />
          Exporter en CSV
        </a>
      </div>

      <div className="grid gap-6 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="text-sm text-subtle">Total de l&apos;équipe{isCurrent ? " à ce jour" : ""}</p>
            <p className="mt-1 text-6xl font-semibold tracking-tighter text-fg">{formatInt(report.teamTotal)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dt className="text-xs text-subtle">{figure.label}</dt>
                <dd className="mt-1 truncate text-lg font-semibold tracking-tight text-fg">
                  {figure.value}
                  {figure.detail && <span className="block truncate text-xs font-normal text-subtle">{figure.detail}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <TrendChart
          points={elapsedDays.map((day, index) => ({ date: day, total: report.teamDaily[index] }))}
          label="Prospections de l'équipe par jour"
        />
      </div>

      {report.teamTotal === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center text-muted">
          Aucune prospection enregistrée sur ce mois.
        </p>
      ) : (
        <>
          <section aria-labelledby="table-title" className="min-w-0 rounded-2xl border border-line bg-surface shadow-card">
            <h2 id="table-title" className="px-5 pt-5 text-base font-semibold tracking-tight text-fg">
              Par personne
            </h2>
            <ReportTable report={report} meId={me.id} />
          </section>
          <section aria-labelledby="heatmap-title" className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 id="heatmap-title" className="mb-5 text-base font-semibold tracking-tight text-fg">
              Activité jour par jour
            </h2>
            <Heatmap report={report} lastDay={lastDay} />
          </section>
        </>
      )}
    </Section>
  );
}

function ReportSkeleton() {
  return (
    <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8" aria-hidden>
      <div className="skeleton h-10 w-72 rounded-full" />
      <div className="skeleton h-80 rounded-2xl" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
}
