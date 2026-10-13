import { expect, test } from "@playwright/test";
import { loginAs, navigate } from "./helpers";

test.describe("accès", () => {
  test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
    await page.goto("/classement");
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByRole("heading", { name: "Choisis un profil" })).toBeVisible();
  });

  test("l'export CSV refuse les visiteurs non connectés", async ({ request }) => {
    const response = await request.get("/bilan/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(response.status());
  });

  test("un membre non admin ne peut pas ouvrir la gestion de l'équipe", async ({ page }) => {
    await loginAs(page, "Théo Garnier");
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
  });
});

test.describe("parcours d'un prospecteur", () => {
  test("présentation, organigramme, guide et bilan s'affichent", async ({ page }) => {
    await loginAs(page, "Léa Fontaine");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("sites");
    await expect(page.getByRole("heading", { name: "Podium du jour" })).toBeVisible();

    await navigate(page, "Équipe");
    await expect(page.getByRole("heading", { level: 1, name: "L'équipe" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Camille Renaud/ })).toBeVisible();

    await navigate(page, "Guide");
    await expect(page.getByRole("heading", { level: 1, name: "Guide de prospection" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Le premier message" })).toBeVisible();

    await navigate(page, "Bilan");
    await expect(page.getByRole("heading", { level: 1, name: "Bilan du mois" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Bilan mensuel par personne" })).toBeVisible();
  });

  test("saisir sa journée met à jour le classement", async ({ page }, testInfo) => {
    // Un membre différent par projet : les données démo sont partagées par le serveur.
    const name = testInfo.project.name === "mobile" ? "Amandine Roux" : "Théo Garnier";
    const count = String(40 + Math.floor(Math.random() * 50));
    await loginAs(page, name);
    await page.goto("/classement");

    await page.getByLabel("Prospections effectuées").fill(count);
    await page.getByRole("button", { name: /Enregistrer ma journée|Mettre à jour/ }).click();

    await expect(page.getByRole("status").filter({ hasText: `${count} prospections enregistrées pour aujourd'hui` })).toBeVisible();
    const myRow = page.getByRole("list", { name: "Classement complet" }).getByRole("listitem").filter({ hasText: name });
    await expect(myRow).toContainText(count);
    await expect(page.getByText("ta journée n'est pas encore saisie")).toBeHidden();
    await expect(page.getByRole("button", { name: "Mettre à jour" })).toBeVisible();
  });

  test("une valeur invalide est refusée avec un message clair", async ({ page }) => {
    await loginAs(page, "Karim Ouali");
    await page.goto("/classement");
    await page.getByLabel("Prospections effectuées").fill("9999");
    await page.getByRole("button", { name: /Enregistrer ma journée|Mettre à jour/ }).click();
    await expect(page.getByText("Maximum 500 par jour.")).toBeVisible();
  });

  test("les onglets de période changent le classement", async ({ page }) => {
    await loginAs(page, "Léa Fontaine");
    await page.goto("/classement");
    await page.getByRole("link", { name: "Mois" }).click();
    await expect(page).toHaveURL(/p=mois/);
    await expect(page.getByRole("link", { name: "Mois" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("par rapport au même moment le mois dernier").first()).toBeVisible();
  });

  test("le bilan peut être exporté en CSV", async ({ page }) => {
    await loginAs(page, "Léa Fontaine");
    await page.goto("/bilan");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Exporter en CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^bilan-prospection-\d{4}-\d{2}\.csv$/);
  });
});

test.describe("administration", () => {
  test("un admin modifie le poste d'un membre", async ({ page }) => {
    await loginAs(page, "Mehdi Belkacem");
    await page.goto("/admin");
    const card = page.locator("details", { has: page.locator("summary", { hasText: "Nathan Perrin" }) });
    await card.locator("summary").click();
    await card.getByLabel("Poste").fill("Développeur full-stack");
    await card.getByRole("button", { name: "Enregistrer" }).click();
    await expect(card.getByText("Modifications enregistrées.")).toBeVisible();

    await page.goto("/equipe");
    await expect(page.getByText("Développeur full-stack")).toBeVisible();
  });
});
