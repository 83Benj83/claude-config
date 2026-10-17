"use client";

import type { CSSProperties } from "react";
import { Avatar } from "@/ui/primitives/avatar";
import type { OrgNode } from "@/lib/stats";
import type { Member } from "@/lib/types";

type Context = { meId: string };

/**
 * Organigramme : la direction en haut (plusieurs personnes côte à côte en cas
 * de co-direction), puis une colonne par responsable avec son équipe en
 * dessous. Les niveaux plus profonds s'indentent dans la colonne, ce qui
 * reste lisible quand l'équipe grandit.
 */
export function OrgChart({ roots, meId }: { roots: OrgNode[]; meId: string }) {
  if (roots.length === 0) return null;
  const context = { meId };
  // Direction : ceux qui ont une équipe, plus leurs collègues du même pôle (co-direction).
  const leaderDepartments = new Set(roots.filter((root) => root.reports.length > 0).map((root) => root.member.department).filter(Boolean));
  const leading = roots.filter((root) => root.reports.length > 0 || (root.member.department && leaderDepartments.has(root.member.department)));
  const heads = leading.length > 0 ? leading : roots;
  const unassigned = roots.filter((root) => !heads.includes(root));

  return (
    <div className="flex flex-col gap-14">
      <OrgTree heads={heads} context={context} />
      {unassigned.length > 0 && (
        <section aria-labelledby="sans-responsable">
          <h3 id="sans-responsable" className="mb-3 text-xs font-medium tracking-wide text-subtle uppercase">
            Sans responsable
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((root) => (
              <li key={root.member.id}>
                <MemberCard member={root.member} context={context} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OrgTree({ heads, context }: { heads: OrgNode[]; context: Context }) {
  // Équipe commune à toute la direction : les personnes rattachées à l'un ou l'autre des responsables du haut.
  const columns = heads.flatMap((head) => head.reports);
  const columnCount = Math.min(columns.length, 4);
  const inset = columnCount > 1 ? `calc(100% / ${columnCount * 2})` : "50%";
  const names = heads.map((head) => head.member.fullName);
  const label = names.length > 1 ? `${names.slice(0, -1).join(", ")} et ${names.at(-1)}` : names[0];

  return (
    <section aria-label={`Équipe de ${label}`} className="flex flex-col items-center">
      {heads.length > 1 && <p className="mb-3 text-xs font-medium tracking-wide text-subtle uppercase">Co-direction</p>}
      <div className={`grid w-full gap-3 ${heads.length > 1 ? "max-w-2xl sm:grid-cols-2" : "md:max-w-xs"}`}>
        {heads.map((head) => (
          <MemberCard key={head.member.id} member={head.member} context={context} emphasis />
        ))}
      </div>

      {columns.length > 0 && (
        <>
          <span aria-hidden className="h-10 w-px bg-line-strong max-md:ml-5 max-md:h-4 max-md:self-start" />
          <div
            className="relative grid w-full gap-x-4 gap-y-4 max-md:ml-5 max-md:w-auto max-md:self-stretch max-md:border-l max-md:border-line-strong max-md:pt-2 max-md:pl-4 md:gap-y-10 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
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
              <div key={column.member.id} className="relative flex flex-col items-center">
                {/* Téléphone : petit trait vers le rail de gauche ; ordinateur : trait vertical depuis la barre du haut. */}
                <span aria-hidden className="absolute top-8 -left-4 h-px w-4 bg-line-strong md:hidden" />
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
        <p className="text-sm text-muted">{member.jobTitle}</p>
      </div>
    </article>
  );
}
