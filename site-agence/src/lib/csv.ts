import type { MonthReport } from "./stats";

/** Neutralise les cellules qui pourraient être interprétées comme des formules (injection CSV). */
function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Export CSV du bilan mensuel, au format Excel français (séparateur `;`, BOM UTF-8). */
export function monthReportToCsv(report: MonthReport): string {
  const header = ["Rang", "Membre", "Poste", "Total", "Jours actifs", "Moyenne par jour actif", "Meilleur jour", "Meilleur jour (nombre)", ...report.days];
  const lines = report.rows.map((row) => [
    row.rank,
    row.member.fullName,
    row.member.jobTitle,
    row.total,
    row.activeDays,
    row.averagePerActiveDay.toFixed(1).replace(".", ","),
    row.bestDay?.date ?? "",
    row.bestDay?.count ?? "",
    ...row.daily,
  ]);
  const team = ["", "Équipe", "", report.teamTotal, "", "", report.bestTeamDay?.date ?? "", report.bestTeamDay?.count ?? "", ...report.teamDaily];
  return "﻿" + [header, ...lines, team].map((line) => line.map(cell).join(";")).join("\r\n");
}
