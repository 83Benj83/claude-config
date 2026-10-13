import { expect, type Page } from "@playwright/test";

/** Connexion en mode démo en choisissant un profil fictif. */
export async function loginAs(page: Page, fullName: string) {
  await page.goto("/connexion");
  await page.getByRole("button", { name: new RegExp(fullName) }).click();
  await expect(page).toHaveURL("/");
}

/** Navigation principale (menu mobile ou barre desktop selon la largeur). */
export async function navigate(page: Page, label: string) {
  const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: label, exact: true }).click();
}
