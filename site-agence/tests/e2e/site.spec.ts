import { expect, test } from "@playwright/test";
import { loginAs, openSection, signIn, unique } from "./helpers";

test.describe("accès", () => {
  test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
    await page.goto("/classement");
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("un mauvais mot de passe est refusé", async ({ page }) => {
    await signIn(page, "Théo Garnier", "pas-le-bon");
    await expect(page.getByRole("alert").filter({ hasText: "Identifiant ou mot de passe incorrect" })).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("un membre non admin ne peut pas ouvrir la gestion des identifiants", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
  });
});

test.describe("prospection", () => {
  test("ajouter un restaurant, être prévenu du doublon, le retrouver dans la recherche", async ({ page }) => {
    const name = `Chez Test ${unique()}`;
    await loginAs(page, "lea", "Léa Fontaine");
    await page.goto("/prospection");

    await page.getByLabel("Nom du restaurant").fill(name);
    await page.getByLabel("Ville", { exact: true }).fill("Lyon");
    await page.getByRole("radio", { name: "Téléphone" }).check({ force: true });
    await page.getByRole("button", { name: "Ajouter le prospect" }).click();
    await expect(page.getByRole("status").filter({ hasText: `${name} ajouté` })).toBeVisible();

    // Même nom tapé une seconde fois : alerte « déjà contacté » en direct.
    await page.getByLabel("Nom du restaurant").fill(name.toUpperCase());
    await expect(page.getByText("Déjà contacté", { exact: true })).toBeVisible();

    await page.goto(`/recherche?q=${encodeURIComponent(name)}`);
    await expect(page.getByText("Déjà contacté", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();

    await page.getByRole("searchbox", { name: "Nom du restaurant" }).fill(`Introuvable ${unique()}`);
    await expect(page.getByText("Jamais contacté")).toBeVisible();
  });

  test("les champs obligatoires sont vérifiés", async ({ page }) => {
    await loginAs(page, "yanis", "Yanis Haddad");
    await page.goto("/prospection");
    await page.getByRole("button", { name: "Ajouter le prospect" }).click();
    await expect(page.getByText("Choisis le moyen de contact")).toBeVisible();
  });

  test("classement par période et export du bilan", async ({ page }) => {
    await loginAs(page, "clara", "Clara Nguyen");
    await openSection(page, "Classement");
    await expect(page.getByRole("heading", { level: 1, name: "Classement" })).toBeVisible();
    await page.getByRole("button", { name: "Mois", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mois", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/bilan");
    await expect(page.getByRole("heading", { level: 1, name: "Bilan du mois" })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Bilan CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(/^bilan-prospection-\d{4}-\d{2}\.csv$/);
  });
});

test.describe("équipe et ressources", () => {
  test("organigramme, annuaire et présentation de l'agence", async ({ page }) => {
    await loginAs(page, "karim", "Karim Ouali");
    await page.goto("/equipe");
    await expect(page.getByRole("region", { name: "Équipe de Camille Renaud" })).toBeVisible();
    await page.getByRole("button", { name: "Annuaire" }).click();
    await expect(page.locator("main").getByText("Karim Ouali")).toBeVisible();

    await page.goto("/agence");
    await page.getByRole("button", { name: "Méthode", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Repérer/ })).toBeVisible();
  });

  test("un admin ajoute une ressource, visible et copiable par l'équipe", async ({ page }) => {
    const title = `Lien test ${unique()}`;
    await loginAs(page, "camille", "Camille Renaud");
    await page.goto("/ressources");
    await page.getByRole("button", { name: "Ajouter" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.locator("label").filter({ hasText: /^Lien$/ }).click();
    await expect(sheet.getByRole("radio", { name: "Lien" })).toBeChecked();
    await sheet.getByLabel("Titre").fill(title);
    await sheet.getByRole("textbox", { name: "Lien" }).fill("https://example.com/maquette");
    await sheet.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("un membre non admin ne voit pas les boutons d'édition des ressources", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await page.goto("/ressources");
    await expect(page.getByRole("heading", { level: 1, name: "Mails et liens" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(0);
  });
});

test("un admin crée un identifiant, la personne s'y connecte pour la première fois", async ({ page }) => {
  const login = `test${unique()}`;
  const fullName = `Recrue ${login}`;
  await loginAs(page, "camille", "Camille Renaud");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Nouvel identifiant" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Identifiant", { exact: true }).fill(login);
  const password = await sheet.getByLabel("Mot de passe", { exact: true }).inputValue();
  expect(password.length).toBeGreaterThanOrEqual(6);
  await sheet.getByLabel("Prénom et nom").fill(fullName);
  await sheet.getByLabel("Poste").fill("Chargé de prospection");
  await sheet.getByRole("button", { name: "Créer l'identifiant" }).click();
  await expect(sheet.getByText("Accès à transmettre")).toBeVisible();
  await expect(sheet.getByText(`Mot de passe : ${password}`)).toBeVisible();
  await sheet.getByRole("button", { name: "Terminé" }).click();

  // Nouvel appareil : ni session, ni dernier identifiant mémorisé.
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await signIn(page, fullName, password);
  await expect(page).toHaveURL("/bienvenue");
  await page.getByRole("button", { name: "C'est parti" }).click();
  await expect(page).toHaveURL("/");
});

test("aucun débordement horizontal sur les écrans principaux", async ({ page }) => {
  await loginAs(page, "mehdi", "Mehdi Belkacem");
  for (const path of ["/", "/prospection", "/recherche", "/classement", "/bilan", "/equipe", "/ressources", "/agence", "/admin"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `débordement sur ${path}`).toBeLessThanOrEqual(0);
  }
});
