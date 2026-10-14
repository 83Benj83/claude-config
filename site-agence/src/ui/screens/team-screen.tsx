"use client";

import { MagnifyingGlassIcon, TreeStructureIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { normalizeText } from "@/lib/establishments";
import { pluralize } from "@/lib/format";
import { buildOrgTree } from "@/lib/stats";
import type { Member } from "@/lib/types";
import type { TeamView } from "@/lib/views";
import { Avatar } from "../primitives/avatar";
import { Segmented } from "../primitives/choice";
import { controlClasses } from "../primitives/field";
import { Card, EmptyState, ScreenHeader } from "../primitives/surface";
import { OrgChart } from "../team/org-chart";

type Tab = "organigramme" | "annuaire";

const NO_DEPARTMENT = "Sans pôle";

export function TeamScreen({ view }: { view: TeamView }) {
  const [tab, setTab] = useState<Tab>("organigramme");
  const roots = useMemo(() => buildOrgTree(view.members), [view.members]);
  const prospectors = view.members.filter((member) => member.isProspector).length;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="L'équipe"
        description={`${pluralize(view.members.length, "membre")}, dont ${pluralize(prospectors, "prospecteur")} : qui fait quoi, et qui contacter.`}
      />

      <Segmented
        label="Affichage de l'équipe"
        value={tab}
        onChange={setTab}
        options={[
          { value: "organigramme", label: "Organigramme" },
          { value: "annuaire", label: "Annuaire" },
        ]}
      />

      {view.members.length === 0 ? (
        <Card>
          <EmptyState icon={<UsersThreeIcon size={24} aria-hidden />} title="Aucun membre pour l'instant.">
            Un admin crée les identifiants depuis la gestion.
          </EmptyState>
        </Card>
      ) : tab === "organigramme" ? (
        <div className="dot-grid -mx-4 rounded-none px-4 py-8 sm:mx-0 sm:rounded-3xl sm:border sm:border-line sm:px-8 sm:py-10">
          <OrgChart roots={roots} meId={view.meId} />
        </div>
      ) : (
        <Directory view={view} />
      )}
    </div>
  );
}

/** Annuaire : tout le monde par pôle, filtrable par nom ou poste. */
function Directory({ view }: { view: TeamView }) {
  const [query, setQuery] = useState("");
  const needle = normalizeText(query);
  const members = needle
    ? view.members.filter((member) => normalizeText(`${member.fullName} ${member.jobTitle} ${member.department ?? ""}`).includes(needle))
    : view.members;

  const groups = new Map<string, Member[]>();
  for (const member of members) {
    const key = member.department ?? NO_DEPARTMENT;
    groups.set(key, [...(groups.get(key) ?? []), member]);
  }
  const managers = new Map(view.members.map((member) => [member.id, member.fullName]));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, poste ou pôle"
          aria-label="Filtrer l'équipe"
          className={`${controlClasses} h-11 pl-10`}
        />
      </div>

      {members.length === 0 ? (
        <Card>
          <EmptyState title="Personne ne correspond.">Essaie avec un prénom ou un poste.</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...groups.entries()].map(([department, list]) => (
            <Card key={department} aria-labelledby={`pole-${department}`}>
              <h2 id={`pole-${department}`} className="flex items-center gap-2 px-5 pt-4 text-sm font-semibold text-fg sm:px-6">
                <TreeStructureIcon size={16} className="text-subtle" aria-hidden />
                {department}
                <span className="font-normal text-subtle">· {list.length}</span>
              </h2>
              <ul className="divide-y divide-line px-2 pt-2 pb-2 sm:px-3">
                {list.map((member) => {
                  const isMe = member.id === view.meId;
                  const manager = member.managerId ? managers.get(member.managerId) : null;
                  return (
                    <li key={member.id} className="flex items-center gap-3 px-3 py-3">
                      <Avatar member={member} size="sm" highlight={isMe} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                          <span className="truncate">{member.fullName}</span>
                          {isMe && <span className="shrink-0 rounded-full bg-inverse px-1.5 py-px text-[0.625rem] font-semibold text-on-inverse">Toi</span>}
                        </p>
                        <p className="truncate text-sm text-subtle">
                          {member.jobTitle}
                          {manager ? ` · avec ${manager}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
