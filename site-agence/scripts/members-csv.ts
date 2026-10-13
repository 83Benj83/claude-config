/**
 * Lecture du fichier des identifiants (séparateur `;`, première ligne = en-têtes) :
 *   identifiant;nom;poste;mot de passe;admin;responsable
 * `admin` vaut oui/non ; `responsable` est l'identifiant du responsable (facultatif).
 */
export type MemberCsvRow = {
  line: number;
  login: string;
  fullName: string;
  jobTitle: string;
  password: string;
  isAdmin: boolean;
  managerLogin: string;
};

const YES = new Set(["oui", "o", "yes", "y", "1", "x", "admin"]);

export function parseMembersCsv(text: string): MemberCsvRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(1).map((line, index) => {
    const [login = "", fullName = "", jobTitle = "", password = "", admin = "", managerLogin = ""] = line.split(";").map((cell) => cell.trim());
    return { line: index + 2, login, fullName, jobTitle, password, isAdmin: YES.has(admin.toLowerCase()), managerLogin };
  });
}
