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

test.describe("régressions corrigées après revue", () => {
  test("après une saisie sur un autre jour, le jour choisi reste affiché", async ({ page }, testInfo) => {
    await loginAs(page, testInfo.project.name === "mobile" ? "Clara Nguyen" : "Yanis Haddad");
    await page.goto("/classement");
    const day = page.getByLabel("Jour");
    await day.selectOption({ index: 1 }); // hier
    const yesterday = await day.inputValue();
    await page.getByLabel("Prospections effectuées").fill("12");
    await page.getByRole("button", { name: /Enregistrer ma journée|Mettre à jour/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "12 prospections enregistrées pour hier" })).toBeVisible();
    await expect(day).toHaveValue(yesterday);
    await expect(page.getByLabel("Prospections effectuées")).toHaveValue("12");
  });

  test("le formulaire d'un membre ne réapparaît pas pour le suivant", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "même parcours sur desktop suffit");
    await loginAs(page, "Léa Fontaine");
    await page.goto("/classement");
    await page.getByLabel("Prospections effectuées").fill("88");

    await page.getByRole("button", { name: /Compte de Léa Fontaine/ }).click();
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/connexion$/);

    await loginAs(page, "Karim Ouali");
    await page.goto("/classement");
    await expect(page.getByLabel("Prospections effectuées")).not.toHaveValue("88");
  });

  test("Échap ferme le menu du compte et rend le focus au bouton", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "menu du compte testé sur desktop");
    await loginAs(page, "Léa Fontaine");
    const trigger = page.getByRole("button", { name: /Compte de Léa Fontaine/ });
    await trigger.click();
    await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("le menu mobile couvre l'écran et ses liens fonctionnent", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "menu réservé aux petits écrans");
    await loginAs(page, "Léa Fontaine");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const panel = page.getByRole("navigation", { name: "Navigation principale" });
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.height).toBeGreaterThan((viewport?.height ?? 0) - 100);
    await panel.getByRole("link", { name: "Bilan" }).click();
    await expect(page).toHaveURL(/\/bilan$/);
    await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
  });

  test("une erreur de validation garde les modifications de l'admin", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "formulaire admin testé sur desktop");
    await loginAs(page, "Mehdi Belkacem");
    await page.goto("/admin");
    const card = page.locator("details", { has: page.locator("summary", { hasText: "Hugo Lefebvre" }) });
    await card.locator("summary").click();
    await card.getByLabel("Pôle").fill("Design");
    await card.getByLabel("Poste").fill("X");
    await card.getByRole("button", { name: "Enregistrer" }).click();
    await expect(card.getByText("Poste trop court.")).toBeVisible();
    await expect(card.getByLabel("Pôle")).toHaveValue("Design");
    await expect(card.getByLabel("Poste")).toHaveValue("X");
  });
});
