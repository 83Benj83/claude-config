"use client";

import type { CSSProperties } from "react";
import { Avatar } from "@/ui/primitives/avatar";
import { formatInt } from "@/lib/format";
import type { OrgNode } from "@/lib/stats";
import type { Member } from "@/lib/types";

type Context = { meId: string; monthTotals: Record<string, number> };

/**
 * Organigramme : la tête de chaque arbre en haut, puis une colonne par
 * responsable avec son équipe en dessous. Les niveaux plus profonds
 * s'indentent dans la colonne, ce qui reste lisible quand l'équipe grandit.
 */
export function OrgChart({ roots, meId, monthTotals }: { roots: OrgNode[]; meId: string; monthTotals: Record<string, number> }) {
  const context = { meId, monthTotals };
  return (
    <div className="flex flex-col gap-16">
      {roots.map((root) => (
        <OrgTree key={root.member.id} node={root} context={context} />
      ))}
    </div>
  );
}

function OrgTree({ node, context }: { node: OrgNode; context: Context }) {
  const columns = node.reports;
  const columnCount = Math.min(columns.length, 4);
  const inset = columnCount > 1 ? `calc(100% / ${columnCount * 2})` : "50%";

  return (
    <section aria-label={`Équipe de ${node.member.fullName}`} className="flex flex-col items-center">
      <div className="w-full max-w-xs">
        <MemberCard member={node.member} context={context} emphasis />
      </div>

      {columns.length > 0 && (
        <>
          <span aria-hidden className="h-10 w-px bg-line-strong" />
          <div
            className="relative grid w-full gap-x-4 gap-y-10 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": columnCount } as CSSProperties}
          >
            {columnCount > 1 && (
              <span
                aria-hidden
                className="absolute top-0 hidden h-px bg-line-strong md:block"
                style={{ left: inset, right: inset }}
              />
            )}
            {columns.map((column) => (
              <div key={column.member.id} className="flex flex-col items-center">
                <span aria-hidden className="hidden h-6 w-px bg-line-strong md:block" />
                <div className="w-full">
                  <MemberCard member={column.member} context={context} emphasis />
                  {column.reports.length > 0 && <ReportList nodes={column.reports} context={context} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ReportList({ nodes, context }: { nodes: OrgNode[]; context: Context }) {
  return (
    <ul className="mt-2 ml-5 flex flex-col gap-2 border-l border-line-strong pt-2 pl-4">
      {nodes.map((node) => (
        <li key={node.member.id} className="relative">
          <span aria-hidden className="absolute top-8 -left-4 h-px w-4 bg-line-strong" />
          <MemberCard member={node.member} context={context} />
          {node.reports.length > 0 && <ReportList nodes={node.reports} context={context} />}
        </li>
      ))}
    </ul>
  );
}

function MemberCard({ member, context, emphasis = false }: { member: Member; context: Context; emphasis?: boolean }) {
  const isMe = member.id === context.meId;
  const monthTotal = context.monthTotals[member.id] ?? 0;
  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 transition-[border-color,box-shadow] duration-200 hover:shadow-card ${
        isMe ? "border-accent" : "border-line hover:border-line-strong"
      } ${emphasis ? "shadow-card sm:p-4" : ""}`}
    >
      <Avatar member={member} size={emphasis ? "md" : "sm"} highlight={isMe} />
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-fg">
          <span className="truncate">{member.fullName}</span>
          {isMe && <span className="shrink-0 rounded-full bg-inverse px-1.5 py-px text-[0.625rem] font-semibold text-on-inverse">Toi</span>}
        </h3>
        <p className="truncate text-sm text-muted">{member.jobTitle}</p>
        {member.isProspector && (
          <p className="mt-0.5 text-xs text-subtle">
            Ce mois&nbsp;: <span className="font-medium text-fg tabular">{formatInt(monthTotal)}</span> prospects
          </p>
        )}
      </div>
    </article>
  );
}
