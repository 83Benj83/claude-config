import { expect, test, type Browser, type BrowserContextOptions, type Locator, type Page } from "@playwright/test";

/** Mot de passe des comptes de démonstration : identifiant + « 2026 ». */
export const demoPassword = (login: string) => `${login}2026`;

/** Suffixe unique : le serveur de démo garde ses données entre les tests. */
export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/** Adresse IP simulée, propre à chaque connexion de test : le frein par adresse (30 essais) ne bloque pas la suite entière. */
const fakeClientIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;

/** Requêtes vers le site testé seulement (les polices Google refusent un en-tête inconnu). */
const SITE_REQUESTS = /^http:\/\/localhost:\d+\//;

/** Connexion : choix de l'identifiant dans la liste, puis mot de passe. */
export async function signIn(page: Page, fullName: string, password: string) {
  const ip = fakeClientIp();
  await page.unroute(SITE_REQUESTS);
  await page.route(SITE_REQUESTS, (route, request) => route.continue({ headers: { ...request.headers(), "x-forwarded-for": ip } }));
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

/** Seconde personne connectée en même temps : nouveau navigateur, mêmes réglages que le projet (écran, langue, adresse). */
export async function newContextLike(browser: Browser) {
  const { baseURL, locale, timezoneId, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = test.info().project.use;
  const options: BrowserContextOptions = { baseURL, locale, timezoneId, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };
  return browser.newContext(options);
}

/** Déplie une ligne de la liste « À contacter » (nom + numéro) pour voir le détail et les boutons. */
export async function openLead(card: Locator) {
  const toggle = card.locator("h3 button[aria-expanded]");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}
