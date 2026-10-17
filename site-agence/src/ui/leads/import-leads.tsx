"use client";

import { DownloadSimpleIcon, FileArrowUpIcon, FileXlsIcon } from "@phosphor-icons/react";
import { useRef, useState, useTransition } from "react";
import { GENERIC_ERROR } from "@/lib/actions-contract";
import { pluralize } from "@/lib/format";
import { leadRowsFromTable } from "@/lib/leads";
import { LEAD_IMPORT_MAX_ROWS } from "@/lib/rules";
import { readSpreadsheet } from "../import/read-file";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { FormMessage } from "../primitives/field";
import { useToast } from "../primitives/toast";

const TEMPLATE = [
  "Nom;Ville;Téléphone;Catégorie;E-mail;Instagram;Facebook;Adresse;Note",
  "Boulangerie Soleil;Hyères;04 94 00 00 01;Boulangerie;;;;12 rue de la Paix;Pas de site, 4,7 sur Google",
  "Salon Mèche;Toulon;;Coiffure;;@salonmeche;;;Seulement Instagram",
].join("\r\n");

type Opened = { fileName: string; rows: Record<string, string>[] };
type Outcome = { added: number; skipped: { line: number; message: string }[] };

/**
 * « Importer une liste » : comme dans Prospecter, un fichier Excel ou CSV
 * (une ligne par commerce) rejoint la liste « À contacter » de toute l'équipe.
 * Replié en une ligne, comme l'extraction d'un fichier.
 */
export function ImportLeads() {
  const { actions, download } = usePlatform();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const choose = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setOutcome(null);
    start(async () => {
      try {
        const rows = leadRowsFromTable(await readSpreadsheet(file));
        if (rows.length === 0) throw new Error("Ce fichier ne contient aucune ligne de commerce.");
        if (rows.length > LEAD_IMPORT_MAX_ROWS) throw new Error(`Ce fichier contient ${rows.length} lignes : ${LEAD_IMPORT_MAX_ROWS} au plus par import.`);
        setOpened({ fileName: file.name, rows });
      } catch (caught) {
        setOpened(null);
        setError(caught instanceof Error && caught.message ? caught.message : "Fichier illisible.");
      }
    });
  };

  const save = () =>
    start(async () => {
      if (!opened) return;
      const result = await actions.importLeads(opened.rows);
      if (!result.ok) {
        setError(result.message ?? GENERIC_ERROR);
        return;
      }
      setOpened(null);
      setOutcome(result.data);
      toast(result.message ?? "Liste importée.", result.data.added > 0 ? "success" : "error");
    });

  const downloadTemplate = () =>
    download({ filename: "modele-a-contacter.csv", content: `﻿${TEMPLATE}` }).catch(() => toast("Téléchargement impossible ici.", "error"));

  return (
    <section aria-labelledby="importer-a-contacter" className="rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-mint-ink">
          <FileXlsIcon size={20} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="importer-a-contacter" className="text-[0.9375rem] font-semibold text-fg">
            Importer une liste
          </h2>
          <p className="text-sm text-muted">Un fichier Excel ou CSV de commerces à appeler, pour toute l&apos;équipe.</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="importer-a-contacter-detail"
          aria-label={open ? "Fermer l'import d'une liste" : "Importer une liste"}
          onClick={() => setOpen((value) => !value)}
          className={buttonClasses({ variant: open ? "ghost" : "secondary", size: "sm" })}
        >
          {open ? "Fermer" : "Importer"}
        </button>
      </div>

      {open && (
        <div id="importer-a-contacter-detail" className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-5">
          <FormMessage>{error}</FormMessage>
          <p className="text-xs text-subtle">
            Une ligne par commerce, avec une ligne de titres : nom, ville et au moins un téléphone, e-mail, Instagram ou Facebook. Catégorie,
            adresse et note en plus si tu les as. {LEAD_IMPORT_MAX_ROWS} lignes au plus ; les commerces déjà dans la liste sont ignorés.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={pending} className={buttonClasses({ variant: "secondary" })}>
              <FileArrowUpIcon size={18} aria-hidden />
              {pending && !opened ? "Lecture du fichier…" : "Choisir un fichier"}
            </button>
            <button type="button" onClick={downloadTemplate} className={buttonClasses({ variant: "ghost" })}>
              <DownloadSimpleIcon size={18} aria-hidden />
              Modèle à remplir
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.csv,.txt,.tsv,.xls"
            className="hidden"
            aria-label="Fichier de commerces à contacter"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {opened && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-sm text-fg">
                <strong className="font-semibold">{opened.fileName}</strong> : {pluralize(opened.rows.length, "ligne")} trouvée{opened.rows.length > 1 ? "s" : ""}.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={save} className={buttonClasses({})}>
                  {pending ? "Ajout…" : `Ajouter à la liste`}
                </button>
                <button type="button" disabled={pending} onClick={() => setOpened(null)} className={buttonClasses({ variant: "ghost" })}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {outcome && (
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
              <p className="font-medium text-fg">
                {pluralize(outcome.added, "commerce")} ajouté{outcome.added > 1 ? "s" : ""}
                {outcome.skipped.length > 0 && `, ${pluralize(outcome.skipped.length, "ligne")} écartée${outcome.skipped.length > 1 ? "s" : ""}`}.
              </p>
              {outcome.skipped.length > 0 && (
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs text-muted" aria-label="Lignes écartées">
                  {outcome.skipped.map((row) => (
                    <li key={row.line}>
                      Ligne {row.line + 1} : {row.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
