"use client";

import { FileArrowDownIcon, FlagCheckeredIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { formatDayShort } from "@/lib/dates";
import { pluralize } from "@/lib/format";
import type { LeadsView } from "@/lib/leads";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { ChipGroup } from "../primitives/choice";
import { Card, CardHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";
import { LeadCard } from "./lead-card";

/** Extraire un fichier de 10 à 50 commerces : ils disparaissent de la liste des autres. */
export function ExtractBatch({ view }: { view: LeadsView }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [size, setSize] = useState<string>(String(view.batchSizes[0]));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const available = view.open.length;

  return (
    <Card aria-labelledby="extraire-fichier">
      <CardHeader
        id="extraire-fichier"
        title="Extraire un fichier"
        description="Prends 10 à 50 commerces d'un coup : ils sont à toi et disparaissent de la liste des autres, le temps de les appeler."
      />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-6 sm:px-6">
        <ChipGroup
          label="Combien de commerces ?"
          name="taille-fichier"
          value={size}
          onChange={setSize}
          options={view.batchSizes.map((value) => ({ value: String(value), label: String(value) }))}
        />
        <p className="text-sm text-muted">
          {pluralize(available, "commerce")} disponible{available > 1 ? "s" : ""}, dont {view.withPhone} avec numéro (pris en premier).
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <button
            type="button"
            disabled={pending || available === 0}
            onClick={() =>
              start(async () => {
                const result = await actions.extractBatch({ size: Number(size) });
                if (!result.ok) {
                  setError(result.message ?? GENERIC_ERROR);
                  return;
                }
                setError(null);
                toast(result.message ?? "Fichier extrait.");
              })
            }
            className={buttonClasses({ size: "lg" })}
          >
            <FileArrowDownIcon size={18} weight="bold" aria-hidden />
            {pending ? "Extraction…" : `Extraire ${size} commerces`}
          </button>
        </div>
      </div>
    </Card>
  );
}

/** Mon fichier en cours : chaque commerce est appelé ou mis en rappel, puis on clôt le fichier. */
export function MyBatch({ view }: { view: LeadsView }) {
  const mine = view.myBatch;
  const { actions } = usePlatform();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [pending, start] = useTransition();
  if (!mine) return null;
  const total = mine.rows.length;
  const percent = total ? Math.round((mine.handled / total) * 100) : 0;

  const finish = () =>
    start(async () => {
      const result = await actions.finishBatch();
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      setError(null);
      toast(result.message ?? "Fichier terminé.");
    });

  const release = () =>
    start(async () => {
      const result = await actions.releaseBatch(mine.batch.id);
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        setConfirmRelease(false);
        return;
      }
      toast(result.message ?? "Fichier rendu.");
    });

  return (
    <section aria-labelledby="mon-fichier" className="flex flex-col gap-4 rounded-3xl border border-accent/40 bg-accent-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mon-fichier" className="font-display text-xl font-bold tracking-tight text-fg">
            Mon fichier
          </h2>
          <p className="text-sm text-muted">
            Extrait le {formatDayShort(mine.batch.createdAt.slice(0, 10))} · {mine.handled} sur {total} traités
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {confirmRelease ? (
            <>
              <button type="button" disabled={pending} onClick={release} className={buttonClasses({ variant: "secondary", size: "sm", className: "border-danger text-danger" })}>
                Rendre à la liste
              </button>
              <button type="button" onClick={() => setConfirmRelease(false)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Garder
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmRelease(true)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Rendre le fichier
            </button>
          )}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du fichier">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>

      <ul className="grid gap-3 lg:grid-cols-2">
        {mine.rows.map((row) => (
          <li key={row.lead.id} className="min-w-0">
            <LeadCard row={row} today={view.today} canManage={false} addedBy={view.addedByNames[row.lead.id]} batch />
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <button type="button" disabled={pending || !mine.canFinish} onClick={finish} className={buttonClasses({ size: "lg", className: "w-full sm:w-fit" })}>
          <FlagCheckeredIcon size={18} weight="bold" aria-hidden />
          {pending ? "Clôture…" : "Fichier terminé"}
        </button>
        {!mine.canFinish && <p className="text-xs text-subtle">Disponible quand les {total} commerces sont traités (effectué ou à rappeler).</p>}
      </div>
    </section>
  );
}
