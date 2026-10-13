import { channelLabel } from "./channels";
import type { MonthReport } from "./stats";
import type { Member, Prospect } from "./types";

/** Neutralise les cellules qui pourraient être interprétées comme des formules (injection CSV). */
function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Fichier CSV au format Excel français (séparateur `;`, BOM UTF-8). */
function toCsv(rows: (string | number)[][]): string {
  return "﻿" + rows.map((line) => line.map(cell).join(";")).join("\r\n");
}

/** Bilan mensuel : une ligne par personne, une colonne par jour. */
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
  return toCsv([header, ...lines, team]);
}

/** Liste détaillée des établissements contactés sur la période. */
export function prospectsToCsv(prospects: readonly Prospect[], members: readonly Member[]): string {
  const names = new Map(members.map((member) => [member.id, member.fullName]));
  const sorted = [...prospects].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return toCsv([
    ["Date", "Établissement", "Ville", "Moyen de contact", "Coordonnées", "Note", "Prospecté par"],
    ...sorted.map((p) => [p.date, p.name, p.city, channelLabel(p.channel), p.contact ?? "", p.note ?? "", names.get(p.memberId) ?? "Ancien membre"]),
  ]);
}
