"use client";

import { CaretLeftIcon, CaretRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { channelLabel } from "@/lib/channels";
import { addMonths, formatDayShort, formatMonth } from "@/lib/dates";
import { formatDecimal, formatInt, formatPercent } from "@/lib/format";
import type { ReportView } from "@/lib/views";
import { Heatmap } from "../charts/heatmap";
import { ReportTable } from "../charts/report-table";
import { TrendChart } from "../charts/trend-chart";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Segmented } from "../primitives/choice";
import { ChannelIcon } from "../primitives/icon";
import { Card, EmptyState, ScreenHeader, StatTile } from "../primitives/surface";
import { useToast } from "../primitives/toast";

type Tab = "personnes" | "calendrier" | "canaux";

export function ReportScreen({ view }: { view: ReportView }) {
  const { Link } = usePlatform();
  const [tab, setTab] = useState<Tab>("personnes");
  const { report } = view;
  const isCurrent = view.month === view.currentMonth;
  const elapsed = report.days.filter((day) => day <= view.lastDay);
  const average = report.activeMembers > 0 ? report.teamTotal / report.activeMembers : 0;
  const monthHref = (month: string) => (month === view.currentMonth ? "/bilan" : `/bilan?mois=${month}`);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Bilan du mois"
        description="Combien de commerces chacun a contactés, jour par jour."
        actions={<ExportButtons month={view.month} />}
      />

      <nav aria-label="Choisir le mois" className="flex items-center gap-2">
        <Link
          href={monthHref(addMonths(view.month, -1))}
          className="grid size-10 place-items-center rounded-full border border-line-input bg-surface text-fg hover:bg-surface-2"
          aria-label="Mois précédent"
        >
          <CaretLeftIcon size={18} aria-hidden />
        </Link>
        <p className="min-w-40 text-center text-lg font-semibold tracking-tight text-fg first-letter:uppercase">{formatMonth(view.month)}</p>
        {isCurrent ? (
          <span className="grid size-10 place-items-center rounded-full border border-line text-subtle opacity-50" aria-hidden>
            <CaretRightIcon size={18} />
          </span>
        ) : (
          <Link
            href={monthHref(addMonths(view.month, 1))}
            className="grid size-10 place-items-center rounded-full border border-line-input bg-surface text-fg hover:bg-surface-2"
            aria-label="Mois suivant"
          >
            <CaretRightIcon size={18} aria-hidden />
          </Link>
        )}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={`Prospects de l'équipe${isCurrent ? " à ce jour" : ""}`} value={formatInt(report.teamTotal)} />
        <StatTile label="Prospecteurs actifs" value={`${report.activeMembers} / ${report.rows.length}`} />
        <StatTile label="Moyenne par prospecteur" value={formatDecimal(average)} />
        <StatTile
          label="Meilleur jour"
          value={report.bestTeamDay ? formatInt(report.bestTeamDay.count) : "-"}
          detail={report.bestTeamDay ? formatDayShort(report.bestTeamDay.date) : undefined}
        />
      </div>

      <Card className="p-5 sm:p-6">
        <TrendChart points={elapsed.map((date, index) => ({ date, total: report.teamDaily[index] }))} label="Prospects de l'équipe par jour" />
      </Card>

      {report.teamTotal === 0 ? (
        <Card>
          <EmptyState title="Aucun prospect ce mois-ci.">Les chiffres apparaîtront dès les premiers ajouts.</EmptyState>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
            <Segmented
              label="Vue du bilan"
              value={tab}
              onChange={setTab}
              size="sm"
              options={[
                { value: "personnes", label: "Par personne" },
                { value: "calendrier", label: "Par jour" },
                { value: "canaux", label: "Par canal" },
              ]}
            />
          </div>
          <div className="pt-3">
            {tab === "personnes" && <ReportTable report={report} meId={view.meId} />}
            {tab === "calendrier" && (
              <div className="px-4 pb-5 sm:px-5">
                <Heatmap report={report} lastDay={view.lastDay} />
              </div>
            )}
            {tab === "canaux" && <Channels view={view} />}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Répartition par moyen de contact : barres horizontales, une seule teinte, valeurs affichées. */
function Channels({ view }: { view: ReportView }) {
  const total = view.channels.reduce((sum, share) => sum + share.count, 0);
  const max = Math.max(1, ...view.channels.map((share) => share.count));
  return (
    <div className="grid gap-6 px-4 pb-5 sm:px-5 lg:grid-cols-2">
      <section aria-labelledby="canaux-equipe">
        <h3 id="canaux-equipe" className="mb-3 text-sm font-semibold text-fg">
          Toute l&apos;équipe
        </h3>
        <ul className="flex flex-col gap-3">
          {view.channels.map((share) => (
            <li key={share.channel} className="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted">
                <ChannelIcon channel={share.channel} />
                {channelLabel(share.channel)}
              </span>
              <span className="h-2.5" aria-hidden>
                <span className="block h-full rounded-r-[4px] bg-accent" style={{ width: `${(share.count / max) * 100}%` }} />
              </span>
              <span className="text-right font-medium text-fg tabular">
                {formatInt(share.count)} <span className="font-normal text-subtle">({formatPercent(share.count / total)})</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="canaux-personnes">
        <h3 id="canaux-personnes" className="mb-3 text-sm font-semibold text-fg">
          Moyen préféré de chacun
        </h3>
        <ul className="divide-y divide-line">
          {view.report.rows
            .filter((row) => row.total > 0)
            .map((row) => {
              const top = view.channelsByMember[row.member.id]?.[0];
              return (
                <li key={row.member.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-fg">{row.member.fullName}</span>
                  {top && (
                    <span className="flex shrink-0 items-center gap-1.5 text-muted">
                      <ChannelIcon channel={top.channel} />
                      {channelLabel(top.channel)} ({formatPercent(top.count / row.total)})
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

function ExportButtons({ month }: { month: string }) {
  const { actions, download } = usePlatform();
  const toast = useToast();
  const [pending, start] = useTransition();
  const exportKind = (kind: "bilan" | "prospects") =>
    start(async () => {
      const result = await actions.exportCsv({ month, kind });
      if (!result.ok) {
        toast(result.message ?? "Export impossible.", "error");
        return;
      }
      try {
        await download(result.data);
      } catch {
        toast("Le téléchargement a été annulé.", "error");
      }
    });
  return (
    <>
      <button type="button" disabled={pending} onClick={() => exportKind("bilan")} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <DownloadSimpleIcon size={16} aria-hidden />
        Bilan CSV
      </button>
      <button type="button" disabled={pending} onClick={() => exportKind("prospects")} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <DownloadSimpleIcon size={16} aria-hidden />
        Liste des prospects
      </button>
    </>
  );
}
