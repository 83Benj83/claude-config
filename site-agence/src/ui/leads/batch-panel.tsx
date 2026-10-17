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
import { useToast } from "../primitives/toast";
import { LEAD_LIST_CLASSES, LeadCard } from "./lead-card";

/**
 * Extraire un fichier de 10 à 50 commerces : ils disparaissent de la liste des
 * autres. Replié en une ligne pour garder la liste légère ; on choisit la taille
 * en le dépliant.
 */
export function ExtractBatch({ view }: { view: LeadsView }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string>(String(view.batchSizes[0]));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const available = view.open.length;

  return (
    <section aria-labelledby="extraire-fichier" className="rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          <FileArrowDownIcon size={20} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="extraire-fichier" className="text-[0.9375rem] font-semibold text-fg">
            Extraire un fichier
          </h2>
          <p className="text-sm text-muted">10 à 50 commerces rien que pour toi, le temps de les appeler.</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="extraire-fichier-choix"
          aria-label={open ? "Fermer le choix du fichier" : "Choisir la taille du fichier"}
          onClick={() => setOpen((value) => !value)}
          className={buttonClasses({ variant: open ? "ghost" : "secondary", size: "sm" })}
        >
          {open ? "Fermer" : "Choisir"}
        </button>
      </div>
      {open && (
        <div id="extraire-fichier-choix" className="reveal-in flex flex-col gap-4 border-t border-line px-4 pt-4 pb-5 sm:px-5">
          <ChipGroup
            label="Combien de commerces ?"
            name="taille-fichier"
            value={size}
            onChange={setSize}
            options={view.batchSizes.map((value) => ({ value: String(value), label: String(value) }))}
          />
          <p className="text-sm text-muted">
            {pluralize(available, "commerce")} disponible{available > 1 ? "s" : ""}, dont {view.withPhone} avec numéro (pris en premier).
            {" "}Ils comptent tout de suite dans ton classement.
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
              className={buttonClasses({})}
            >
              <FileArrowDownIcon size={18} weight="bold" aria-hidden />
              {pending ? "Extraction…" : `Extraire ${size} commerces`}
            </button>
          </div>
        </div>
      )}
    </section>
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
              <span className="basis-full text-xs text-muted">Les commerces rendus ne comptent plus dans ton classement.</span>
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

      <ul className={LEAD_LIST_CLASSES}>
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
