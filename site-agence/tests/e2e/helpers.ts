import { expect, type Page } from "@playwright/test";

/** Mot de passe des comptes de démonstration : identifiant + « 2026 ». */
export const demoPassword = (login: string) => `${login}2026`;

/** Suffixe unique : le serveur de démo garde ses données entre les tests. */
export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/** Connexion : choix de l'identifiant dans la liste, puis mot de passe. */
export async function signIn(page: Page, fullName: string, password: string) {
  await page.goto("/connexion");
  const filter = page.getByRole("searchbox", { name: "Filtrer les identifiants" });
  if (await filter.isVisible()) await filter.fill(fullName);
  await page.getByRole("list", { name: "Identifiants" }).getByRole("button", { name: new RegExp(fullName) }).click();
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function loginAs(page: Page, login: string, fullName: string) {
  await signIn(page, fullName, demoPassword(login));
  await expect(page).toHaveURL("/");
}

/** Rubrique par la navigation visible (menu latéral, ou onglets + « Plus » sur téléphone). */
export async function openSection(page: Page, label: string) {
  // L'écran arrive en streaming : on attend que la navigation soit rendue.
  await page.getByRole("navigation", { name: "Navigation principale" }).waitFor();
  const link = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: label, exact: true });
  if (await link.isVisible()) {
    await link.click();
    return;
  }
  await page.getByRole("button", { name: "Plus", exact: true }).click();
  await page.getByRole("navigation", { name: "Autres rubriques" }).getByRole("link", { name: label, exact: true }).click();
}
