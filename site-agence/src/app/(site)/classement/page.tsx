import { CalendarBlankIcon, FireIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro, Section } from "@/components/page-intro";
import { Delta } from "@/components/ranking/delta";
import { EntryForm } from "@/components/ranking/entry-form";
import { parsePeriod, PERIODS, PeriodTabs } from "@/components/ranking/period-tabs";
import { Podium } from "@/components/ranking/podium";
import { RankingList } from "@/components/ranking/ranking-list";
import { formatDayLong, formatRelativeDay } from "@/lib/dates";
import { formatInt, formatRank, pluralize } from "@/lib/format";
import { getRankingData } from "@/lib/queries";
import type { Period } from "@/lib/types";

export const metadata: Metadata = { title: "Classement" };

export default function ClassementPage({ searchParams }: PageProps<"/classement">) {
  return (
    <>
      <PageIntro
        title="Classement"
        description="Chacun note ses prospections en fin de journée. Le classement se met à jour à chaque saisie."
      />
      <Suspense fallback={<RankingSkeleton />}>
        <RankingView searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function RankingView({ searchParams }: { searchParams: PageProps<"/classement">["searchParams"] }) {
  const period = parsePeriod((await searchParams).p);
  const data = await getRankingData(period);
  const periodInfo = PERIODS.find((p) => p.value === period)!;
  const leaders = data.ranking.filter((row) => row.total > 0).slice(0, 3);

  return (
    <Section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:gap-8">
      <aside id="ma-journee" className="order-first flex scroll-mt-24 flex-col gap-4 lg:sticky lg:top-24 lg:order-last">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Ma journée</h2>
          <p className="mt-1 mb-5 text-sm text-subtle first-letter:uppercase">{formatDayLong(data.today)}</p>
          <EntryForm
            key={data.me.id}
            days={data.editableDays.map((day) => ({
              value: day,
              label: formatRelativeDay(day, data.today),
            }))}
            existing={data.myEntries}
          />
        </div>
        <MyStats data={data} />
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PeriodTabs active={period} />
          <p className="text-sm text-muted">
            Équipe&nbsp;: <strong className="font-semibold text-fg tabular">{formatInt(data.teamTotal)}</strong>{" "}
            <Delta value={data.teamTotal - data.previousTeamTotal} label={`${formatInt(data.previousTeamTotal)} ${periodInfo.comparison}`} />
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface shadow-card">
          {leaders.length > 0 ? (
            <div className="dot-grid rounded-t-2xl border-b border-line px-4 pt-8 sm:px-10">
              <div className="mx-auto max-w-md">
                <Podium
                  places={leaders.map((row) => ({
                    id: row.member.id,
                    fullName: row.member.fullName,
                    avatarUrl: row.member.avatarUrl,
                    total: row.total,
                    rank: row.rank,
                    isMe: row.member.id === data.me.id,
                  }))}
                />
              </div>
            </div>
          ) : (
            <EmptyPodium period={period} />
          )}

          <div className="flex items-center justify-between px-4 pt-5 pb-2 sm:px-5">
            <h2 className="text-sm font-semibold text-fg">Tous les prospecteurs</h2>
            <p className="text-xs text-subtle">Variation {periodInfo.comparison}</p>
          </div>
          {data.ranking.length > 0 ? (
            <RankingList rows={data.ranking} meId={data.me.id} comparison={periodInfo.comparison} flagMissing={period === "jour"} />
          ) : (
            <p className="px-5 pb-8 text-sm text-muted">
              Aucun prospecteur pour l&apos;instant. Un admin peut en ajouter depuis la gestion de l&apos;équipe.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

function MyStats({ data }: { data: Awaited<ReturnType<typeof getRankingData>> }) {
  if (!data.me.isProspector) {
    return (
      <p className="rounded-2xl border border-line bg-surface-2 p-5 text-sm text-muted">
        Tu n&apos;apparais pas dans le classement. Un admin peut t&apos;y ajouter depuis la gestion de l&apos;équipe.
      </p>
    );
  }
  const stats = [
    {
      icon: TrophyIcon,
      label: "Mon rang",
      value: data.myRow ? `${formatRank(data.myRow.rank)} sur ${data.ranking.length}` : "-",
    },
    {
      icon: FireIcon,
      label: "Série en cours",
      value: pluralize(data.myStreak, "jour"),
    },
    { icon: CalendarBlankIcon, label: "Ma semaine", value: pluralize(data.myWeekTotal, "prospection") },
  ];
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line bg-surface px-5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center justify-between gap-4 py-3.5">
          <dt className="flex items-center gap-2 text-sm text-muted">
            <stat.icon size={16} className="text-subtle" aria-hidden />
            {stat.label}
          </dt>
          <dd className="text-sm font-semibold text-fg">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyPodium({ period }: { period: Period }) {
  return (
    <div className="dot-grid flex flex-col items-center gap-3 rounded-t-2xl border-b border-line px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <UsersThreeIcon size={24} aria-hidden />
      </span>
      <p className="text-lg font-semibold tracking-tight text-fg">
        {period === "jour" ? "Personne n'a encore saisi sa journée." : "Aucune prospection sur cette période."}
      </p>
      <p className="max-w-sm text-sm text-muted">
        {period === "jour"
          ? "La première saisie prend la tête du classement. À toi de jouer."
          : "Les totaux apparaîtront ici dès les premières saisies."}
      </p>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="mx-auto mt-10 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8" aria-hidden>
      <div className="skeleton h-[26rem] rounded-2xl lg:order-last" />
      <div className="flex flex-col gap-6">
        <div className="skeleton h-11 w-72 rounded-full" />
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="skeleton mx-auto h-56 max-w-md" />
          <div className="mt-6 flex flex-col gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

