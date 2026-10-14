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

/** Ouvre le menu (bouton « Menu » en haut à gauche, sur tous les écrans). */
export async function openMenu(page: Page) {
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  // Juste après un chargement, le bouton peut être affiché avant d'être actif : on réessaie.
  await expect(async () => {
    if (!(await menu.isVisible())) await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return menu;
}

/** Rubrique choisie dans le menu, comme le ferait un membre de l'équipe. */
export async function openSection(page: Page, label: string) {
  await (await openMenu(page)).getByRole("link", { name: label, exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Menu principal" })).toBeHidden();
}

/** Déconnexion depuis le pied du menu. */
export async function signOut(page: Page) {
  await openMenu(page);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
}
