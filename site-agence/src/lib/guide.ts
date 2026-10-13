import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const GUIDE_PATH = path.join(process.cwd(), "content", "guide-prospection.md");

export type GuideHeading = { id: string; title: string };

/** Identifiant d'ancre stable à partir d'un titre (« Les relances » → « les-relances »). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Titres de niveau 2 (`## …`) hors blocs de code, pour le sommaire. */
export function extractHeadings(markdown: string): GuideHeading[] {
  const headings: GuideHeading[] = [];
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (line.trim().startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push({ id: slugify(match[1]), title: match[1] });
  }
  return headings;
}

/** Contenu du guide, lu depuis `content/guide-prospection.md`. */
export async function getGuide() {
  "use cache";
  const [markdown, info] = await Promise.all([readFile(GUIDE_PATH, "utf8"), stat(GUIDE_PATH)]);
  return {
    markdown,
    headings: extractHeadings(markdown),
    updatedAt: info.mtime.toISOString().slice(0, 10),
    readingMinutes: Math.max(1, Math.round(markdown.split(/\s+/).length / 220)),
  };
}
