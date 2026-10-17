"use client";

import { Avatar } from "@/ui/primitives/avatar";
import { formatDayShort } from "@/lib/dates";
import { formatDecimal, formatInt, formatPercent } from "@/lib/format";
import type { MonthReport } from "@/lib/stats";

/** Bilan détaillé par personne : la vue tableau de toutes les données du mois. */
export function ReportTable({ report, meId }: { report: MonthReport; meId: string }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm sm:min-w-[44rem]">
        <caption className="sr-only">Bilan mensuel par personne</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-subtle">
            <th scope="col" className="w-12 py-3 pl-4 font-medium sm:w-16 sm:pl-5">Rang</th>
            <th scope="col" className="py-3 font-medium">Membre</th>
            <th scope="col" className="py-3 text-right font-medium">Total</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium sm:pr-0">Jours actifs</th>
            <th scope="col" className="hidden py-3 text-right font-medium sm:table-cell">Moyenne / jour actif</th>
            <th scope="col" className="hidden py-3 text-right font-medium sm:table-cell">Meilleur jour</th>
            <th scope="col" className="hidden py-3 pr-5 text-right font-medium sm:table-cell">Part de l&apos;équipe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {report.rows.map((row) => {
            const isMe = row.member.id === meId;
            return (
              <tr key={row.member.id} className={isMe ? "bg-accent-soft" : ""}>
                <td className="py-3 pl-4 font-semibold text-fg tabular sm:pl-5">{row.rank}</td>
                <th scope="row" className="py-3 text-left font-medium text-fg">
                  <span className="flex items-center gap-2.5">
                    <Avatar member={row.member} size="xs" />
                    {row.member.fullName}
                    {isMe && <span className="text-xs font-normal text-subtle">(toi)</span>}
                  </span>
                </th>
                <td className="py-3 text-right text-base font-semibold text-fg tabular">{formatInt(row.total)}</td>
                <td className="py-3 pr-4 text-right text-muted tabular sm:pr-0">{row.activeDays}</td>
                <td className="hidden py-3 text-right text-muted tabular sm:table-cell">{formatDecimal(row.averagePerActiveDay)}</td>
                <td className="hidden py-3 text-right text-muted tabular sm:table-cell">
                  {row.bestDay ? `${formatInt(row.bestDay.count)} (${formatDayShort(row.bestDay.date)})` : "—"}
                </td>
                <td className="hidden py-3 pr-5 text-right text-muted tabular sm:table-cell">{formatPercent(row.share)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong">
            <td className="py-3 pl-4 sm:pl-5" />
            <th scope="row" className="py-3 text-left font-semibold text-fg">Équipe</th>
            <td className="py-3 text-right text-base font-semibold text-fg tabular">{formatInt(report.teamTotal)}</td>
            <td className="py-3 pr-4 sm:pr-0" />
            <td colSpan={3} className="hidden py-3 pr-5 sm:table-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
