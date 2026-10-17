import Papa from "papaparse";
import { IMPORT_MAX_BYTES, type Cell } from "@/lib/prospect-import";

/** Texte d'un fichier CSV : UTF-8, sinon l'encodage d'Excel sous Windows. */
async function readText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Lignes d'un fichier Excel (.xlsx), CSV ou texte, lu dans le navigateur (2 Mo au plus). */
export async function readSpreadsheet(file: File): Promise<Cell[][]> {
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
