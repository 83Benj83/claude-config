"use client";

import { FireIcon, PlusIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { formatInt, formatRank, pluralize } from "@/lib/format";
import type { Period } from "@/lib/types";
import type { RankingView } from "@/lib/views";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Segmented } from "../primitives/choice";
import { Card, EmptyState, ScreenHeader } from "../primitives/surface";
import { Delta } from "../ranking/delta";
import { Podium } from "../ranking/podium";
import { RankingList } from "../ranking/ranking-list";

const PERIODS: { value: Period; label: string; comparison: string }[] = [
  { value: "jour", label: "Aujourd'hui", comparison: "par rapport à hier" },
  { value: "semaine", label: "Semaine", comparison: "par rapport au même moment la semaine dernière" },
  { value: "mois", label: "Mois", comparison: "par rapport au même moment le mois dernier" },
];

export function RankingScreen({ view }: { view: RankingView }) {
  const { Link } = usePlatform();
  const [period, setPeriod] = useState<Period>("jour");
  const data = view.periods[period];
  const info = PERIODS.find((p) => p.value === period)!;
  const myRow = data.rows.find((row) => row.member.id === view.meId);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Classement"
        description="Chaque prospect ajouté compte. Mis à jour en direct."
        actions={
          <Link href="/prospection" className={buttonClasses({ className: "max-sm:hidden" })}>
            <PlusIcon size={18} weight="bold" aria-hidden />
            Ajouter un prospect
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Période du classement" value={period} onChange={setPeriod} options={PERIODS} />
        <p className="text-sm text-muted">
          Équipe&nbsp;: <strong className="font-semibold text-fg tabular">{formatInt(data.teamTotal)}</strong>{" "}
          <Delta value={data.teamTotal - data.previousTeamTotal} label={`${formatInt(data.previousTeamTotal)} ${info.comparison}`} />
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-8">
          {data.podium.length > 0 ? (
            <div className="dot-grid rounded-t-2xl border-b border-line px-4 pt-8 sm:px-10">
              <div className="mx-auto max-w-md">
                <Podium places={data.podium} />
              </div>
            </div>
          ) : (
            <div className="dot-grid rounded-t-2xl border-b border-line">
              <EmptyState icon={<UsersThreeIcon size={24} aria-hidden />} title={period === "jour" ? "Personne n'a encore prospecté aujourd'hui." : "Aucun prospect sur cette période."}>
                {period === "jour" ? "Le premier ajout prend la tête du classement." : "Les totaux apparaîtront dès les premiers ajouts."}
              </EmptyState>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 px-4 pt-5 pb-2 sm:px-5">
            <h2 className="text-sm font-semibold text-fg">Tous les prospecteurs</h2>
            <p className="hidden text-xs text-subtle sm:block">Variation {info.comparison}</p>
          </div>
          <RankingList rows={data.rows} meId={view.meId} comparison={info.comparison} flagMissing={period === "jour"} />
        </Card>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:col-span-4">
          {view.meIsProspector ? (
            <Card className="p-5">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fg">Ma position</h2>
              <dl className="mt-4 divide-y divide-line">
                {[
                  { icon: TrophyIcon, label: "Mon rang", value: myRow && myRow.total > 0 ? `${formatRank(myRow.rank)} sur ${data.rows.length}` : "-" },
                  { icon: PlusIcon, label: "Mes prospects", value: formatInt(myRow?.total ?? 0) },
                  { icon: FireIcon, label: "Série en cours", value: pluralize(view.myStreak, "jour") },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="flex items-center gap-2 text-sm text-muted">
                      <stat.icon size={16} className="text-subtle" aria-hidden />
                      {stat.label}
                    </dt>
                    <dd className="text-sm font-semibold text-fg">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              {myRow && data.rows[0] && myRow.rank > 1 && (
                <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-fg">
                  Encore <strong>{formatInt(data.rows[0].total - myRow.total + 1)}</strong> pour passer en tête.
                </p>
              )}
            </Card>
          ) : (
            <p className="rounded-2xl border border-line bg-surface-2 p-5 text-sm text-muted">
              Tu n&apos;apparais pas dans le classement. Un admin peut t&apos;y ajouter depuis la gestion des identifiants.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
