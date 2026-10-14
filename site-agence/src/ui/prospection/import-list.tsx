"use client";

import { CheckCircleIcon, CopyIcon, DownloadSimpleIcon, FileArrowUpIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { GENERIC_ERROR, type ProspectFormValues } from "@/lib/actions-contract";
import { CHANNELS, channelLabel, isChannel } from "@/lib/channels";
import { formatDayShort } from "@/lib/dates";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  readTable,
  toFormValues,
  type Cell,
  type ImportField,
  type ImportTable,
  type RowStatus,
} from "@/lib/prospect-import";
import type { Channel, IsoDate } from "@/lib/types";
import { usePlatform } from "../platform";
import { buttonClasses } from "../primitives/button";
import { Checkbox, Field, FormMessage, SelectField } from "../primitives/field";
import { Sheet } from "../primitives/sheet";
import { Card, CardHeader } from "../primitives/surface";
import { useToast } from "../primitives/toast";

const FIELD_LABELS: Record<ImportField, string> = {
  name: "Nom",
  city: "Ville",
  channel: "Moyen de contact",
  contact: "Coordonnées",
  note: "Note",
  date: "Date",
};

const TEMPLATE = [
  "Nom;Ville;Moyen de contact;Coordonnées;Note;Date",
  "Le Bistrot du Port;Lyon;Téléphone;06 12 34 56 78;Rappeler lundi;",
  "Boulangerie Martin;Lyon;Sur place;Mme Martin;Intéressée par le pack Pro;",
].join("\r\n");

/** Texte d'un fichier CSV : UTF-8, sinon l'encodage d'Excel sous Windows. */
async function readText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

async function readFile(file: File): Promise<Cell[][]> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (extension === "xls") throw new Error("Ancien format Excel (.xls) : enregistre le fichier en .xlsx ou en CSV, puis recommence.");
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Fichier trop lourd : 2 Mo au plus.");
  if (extension === "xlsx") {
    const { readSheet } = await import("read-excel-file/universal");
    return (await readSheet(file)) as Cell[][];
  }
  if (["csv", "txt", "tsv"].includes(extension)) {
    const parsed = Papa.parse<string[]>(await readText(file), { skipEmptyLines: "greedy" });
    return parsed.data;
  }
  throw new Error("Format non pris en charge : choisis un fichier Excel (.xlsx), CSV ou texte.");
}

/** Bloc « Importer une liste » de l'écran Prospecter. */
export function ImportList({ today }: { today: IsoDate }) {
  const { download } = usePlatform();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ fileName: string; table: ImportTable } | null>(null);
  const [reading, startReading] = useTransition();

  const choose = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    startReading(async () => {
      try {
        const table = readTable(await readFile(file));
        if (table.rows.length === 0) throw new Error("Ce fichier ne contient aucune ligne.");
        if (table.rows.length > IMPORT_MAX_ROWS) throw new Error(`Ce fichier contient ${table.rows.length} lignes : ${IMPORT_MAX_ROWS} au plus par import.`);
        setOpened({ fileName: file.name, table });
      } catch (caught) {
        setError(caught instanceof Error && caught.message ? caught.message : "Fichier illisible.");
      }
    });
  };

  const downloadTemplate = () =>
    download({ filename: "modele-prospects.csv", content: `﻿${TEMPLATE}` }).catch(() => toast("Téléchargement impossible ici.", "error"));

  return (
    <Card aria-labelledby="importer-liste">
      <CardHeader
        id="importer-liste"
        title="Importer une liste"
        description="Un fichier Excel, CSV ou texte, une ligne par commerce : chaque ligne est vérifiée comme dans le formulaire, puis enregistrée."
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-5 sm:px-6">
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={reading} className={buttonClasses({ variant: "secondary" })}>
            <FileArrowUpIcon size={18} aria-hidden />
            {reading ? "Lecture du fichier…" : "Choisir un fichier"}
          </button>
          <button type="button" onClick={downloadTemplate} className={buttonClasses({ variant: "ghost" })}>
            <DownloadSimpleIcon size={18} aria-hidden />
            Modèle à remplir
          </button>
        </div>
        <p className="text-xs text-subtle">
          Colonnes reconnues : nom, ville, moyen de contact, coordonnées, note, date (titres libres, dans n&apos;importe quel ordre). Sans moyen de
          contact, un e-mail ou un numéro suffit à le deviner. {IMPORT_MAX_ROWS} lignes au plus.
        </p>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv,.txt,.tsv,.xls"
          className="hidden"
          aria-label="Fichier de prospects"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {opened && <ImportSheet key={opened.fileName} fileName={opened.fileName} table={opened.table} today={today} onClose={() => setOpened(null)} />}
    </Card>
  );
}

type Analysis = { values: ProspectFormValues[]; statuses: RowStatus[] };

function ImportSheet({ fileName, table, today, onClose }: { fileName: string; table: ImportTable; today: IsoDate; onClose: () => void }) {
  const { actions } = usePlatform();
  const toast = useToast();
  const [defaultCity, setDefaultCity] = useState("");
  const [defaultChannel, setDefaultChannel] = useState<Channel | "">("");
  const [useToday, setUseToday] = useState(false);
  const [includeKnown, setIncludeKnown] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, startImport] = useTransition();

  const values = useMemo(() => toFormValues(table, { defaultCity, defaultChannel, useToday, today }), [table, defaultCity, defaultChannel, useToday, today]);
  // Ce qui manque dans le fichier lui-même (les réglages restent affichés une fois remplis).
  const raw = useMemo(() => toFormValues(table, { defaultCity: "", defaultChannel: "", useToday: false, today }), [table, today]);
  const missingCity = raw.some((row) => !row.city);
  const missingChannel = raw.some((row) => !isChannel(row.channel));
  const hasDates = table.columns.date !== undefined;

  // Vérification par le serveur (doublons avec l'historique de l'équipe), relancée à chaque réglage.
  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      actions.analyzeImport(values).then(
        (result) => {
          if (!current) return;
          if (result.ok) setAnalysis({ values, statuses: result.data });
          else setMessage(result.message ?? GENERIC_ERROR);
        },
        () => current && setMessage(GENERIC_ERROR),
      );
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [actions, values]);

  const statuses = analysis?.values === values ? analysis.statuses : null;
  const count = (status: RowStatus["status"]) => statuses?.filter((row) => row.status === status).length ?? 0;
  const toAdd = count("ready") + (includeKnown ? count("known") : 0);

  const submit = () =>
    startImport(async () => {
      setMessage(null);
      const result = await actions.importProspects({ rows: values, includeKnown });
      if (!result.ok) {
        setMessage(result.message ?? GENERIC_ERROR);
        return;
      }
      toast(result.message ?? "Prospects ajoutés.");
      onClose();
    });

  const recognized = (Object.entries(table.columns) as [ImportField, number][]).sort((a, b) => a[1] - b[1]).map(([field]) => FIELD_LABELS[field]);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Importer une liste"
      description={`${fileName} · ${table.rows.length} ligne${table.rows.length > 1 ? "s" : ""}`}
      footer={
        <div className="flex flex-col gap-2 px-2 py-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {statuses ? `${toAdd} prospect${toAdd > 1 ? "s" : ""} à ajouter` : "Vérification…"}
          </p>
          <button type="button" onClick={submit} disabled={!statuses || toAdd === 0 || importing} className={buttonClasses({ size: "lg" })}>
            {importing ? "Ajout…" : `Ajouter ${toAdd} prospect${toAdd > 1 ? "s" : ""}`}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <FormMessage>{message}</FormMessage>
        <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-muted">
          {table.hasHeader
            ? `Colonnes reconnues : ${recognized.join(", ")}.`
            : `Pas de ligne de titres : colonnes lues dans l'ordre ${recognized.join(", ").toLowerCase()}.`}
        </p>

        {(missingCity || missingChannel || hasDates) && (
          <div className="flex flex-col gap-4">
            {missingCity && (
              <Field
                label="Ville des lignes sans ville"
                value={defaultCity}
                onChange={(event) => setDefaultCity(event.target.value)}
                maxLength={80}
                optional
              />
            )}
            {missingChannel && (
              <SelectField
                label="Moyen de contact des lignes où il manque"
                value={defaultChannel}
                onChange={(event) => setDefaultChannel(event.target.value as Channel | "")}
                optional
              >
                <option value="">Aucun : ces lignes restent à corriger</option>
                {CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </SelectField>
            )}
            {hasDates && (
              <Checkbox
                label="Mettre tous les prospects à la date du jour"
                hint="Sinon, la date du fichier est gardée (aujourd'hui ou les 7 derniers jours)."
                checked={useToday}
                onChange={setUseToday}
              />
            )}
          </div>
        )}

        {statuses && (
          <ul className="flex flex-wrap gap-2 text-xs font-medium" aria-label="Résumé">
            <Summary tone="ok" label={`${count("ready")} prêt${count("ready") > 1 ? "s" : ""}`} />
            {count("known") > 0 && <Summary tone="warn" label={`${count("known")} déjà contacté${count("known") > 1 ? "s" : ""}`} />}
            {count("duplicate") > 0 && <Summary tone="warn" label={`${count("duplicate")} en double dans le fichier`} />}
            {count("invalid") > 0 && <Summary tone="error" label={`${count("invalid")} à corriger`} />}
          </ul>
        )}
        {count("known") > 0 && (
          <Checkbox
            label="Ajouter aussi les commerces déjà contactés"
            hint="Ils ont déjà été démarchés par quelqu'un de l'équipe."
            checked={includeKnown}
            onChange={setIncludeKnown}
          />
        )}

        <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line" aria-label="Lignes du fichier">
          {values.map((row, index) => (
            <li key={index} className="flex items-start gap-3 px-3.5 py-2.5 text-sm">
              <span className="w-8 shrink-0 pt-0.5 text-xs text-subtle tabular">{table.rows[index].line}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-fg">{row.name || "(sans nom)"}</span>
                <span className="block truncate text-xs text-subtle">
                  {[row.city || "ville ?", isChannel(row.channel) ? channelLabel(row.channel) : "moyen ?", row.contact, formatDayShort(row.date)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <RowBadge status={statuses?.[index] ?? null} included={includeKnown} />
            </li>
          ))}
        </ol>
      </div>
    </Sheet>
  );
}

function Summary({ tone, label }: { tone: "ok" | "warn" | "error"; label: string }) {
  const colors = { ok: "bg-success-soft text-success", warn: "tone-gold bg-[var(--tone-soft)] text-[var(--tone-ink)]", error: "bg-danger-soft text-danger" };
  return <li className={`rounded-full px-2.5 py-1 ${colors[tone]}`}>{label}</li>;
}

function RowBadge({ status, included }: { status: RowStatus | null; included: boolean }) {
  if (!status) return null;
  switch (status.status) {
    case "ready":
      return <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-success" aria-label="Prête" />;
    case "known":
      return (
        <span className={`tone-gold shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${included ? "bg-[var(--tone-soft)] text-[var(--tone-ink)]" : "text-subtle line-through"}`}>
          Déjà contacté
        </span>
      );
    case "duplicate":
      return (
        <span className="flex shrink-0 items-center gap-1 text-xs text-subtle">
          <CopyIcon size={14} aria-hidden />
          En double
        </span>
      );
    case "invalid":
      return (
        <span className="flex max-w-[45%] shrink-0 items-start gap-1 text-right text-xs text-danger">
          {status.message.includes("moyen") ? <WarningCircleIcon size={14} className="mt-px shrink-0" aria-hidden /> : <XCircleIcon size={14} className="mt-px shrink-0" aria-hidden />}
          {status.message}
        </span>
      );
  }
}
