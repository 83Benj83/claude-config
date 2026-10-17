import { expect, test } from "@playwright/test";
import { loginAs, newContextLike, openLead, openSection, unique } from "./helpers";

test.describe("rappels et numéros ajoutés par l'équipe", () => {
  test("un membre ajoute un numéro ; un collègue le voit, le met en rappel ; un troisième le coche fait", async ({ page, browser }) => {
    const name = `Café Test ${unique()}`;
    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "À contacter");
    await page.getByRole("button", { name: "Ajouter un numéro" }).click();
    await page.getByLabel("Nom du commerce").fill(name);
    await page.getByLabel("Ville", { exact: true }).fill("Toulon");
    await page.getByRole("textbox", { name: "Téléphone" }).fill("04 94 12 34 56");
    await page.getByRole("button", { name: "Ajouter à la liste" }).click();
    await expect(page.getByText(`${name} ajouté à la liste « À contacter ».`)).toBeVisible();
    await openLead(page.getByRole("article", { name }));
    await expect(page.getByRole("article", { name })).toContainText("Ajouté par Léa Fontaine");

    // Un collègue le voit et le met en rappel pour demain.
    const otherContext = await newContextLike(browser);
    const theo = await otherContext.newPage();
    await loginAs(theo, "theo", "Théo Garnier");
    await theo.goto("/a-contacter");
    const card = theo.getByRole("article", { name });
    await expect(card).toBeVisible();
    await openLead(card);
    await card.getByRole("button", { name: "À rappeler plus tard" }).click();
    await card.getByText("Demain", { exact: true }).click();
    await card.getByRole("button", { name: /^Plus de détails/ }).click();
    await card.getByText("Haute", { exact: true }).click();
    await card.getByLabel(/Info complémentaire/).fill("Rappeler le gérant");
    await card.getByRole("button", { name: "Envoyer dans les rappels" }).click();
    await expect(card).toBeHidden();

    // La rubrique Rappels le montre à tous, avec le nom de celui qui l'a noté.
    await page.goto("/rappels");
    await expect(page.getByRole("heading", { level: 1, name: "Rappels" })).toBeVisible();
    const reminder = page.getByRole("article", { name });
    await expect(reminder).toBeVisible();
    await expect(reminder).toContainText("Ajouté par Théo Garnier");
    await expect(reminder).toContainText("Haute");
    await expect(reminder).toContainText("Rappeler le gérant");

    // Une coche et il disparaît.
    await reminder.getByRole("button", { name: "C'est fait" }).click();
    await expect(reminder).toBeHidden();
    await page.getByRole("button", { name: /^Déjà appelés/ }).click();
    await expect(page.getByRole("list").filter({ hasText: name })).toBeVisible();
    await otherContext.close();
  });

  test("un rappel créé depuis « Prospecter » apparaît pour toute l'équipe", async ({ page, browser }) => {
    const name = `Boutique Rappel ${unique()}`;
    await loginAs(page, "lea", "Léa Fontaine");
    await page.goto("/prospection");
    await page.getByRole("button", { name: "À rappeler plus tard" }).click();
    await page.getByRole("textbox", { name: "Commerce" }).fill(name);
    await page.getByText("Après-demain", { exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer le rappel" }).click();
    await expect(page.getByText(`${name} : rappel enregistré pour toute l'équipe.`)).toBeVisible();

    const otherContext = await newContextLike(browser);
    const theo = await otherContext.newPage();
    await loginAs(theo, "theo", "Théo Garnier");
    await theo.goto("/rappels");
    await expect(theo.getByRole("article", { name })).toContainText("Ajouté par Léa Fontaine");
    await otherContext.close();
  });

  test("un rappel sans nom est refusé", async ({ page }) => {
    await loginAs(page, "lea", "Léa Fontaine");
    await page.goto("/rappels");
    await page.getByRole("button", { name: "Nouveau rappel" }).click();
    await page.getByRole("button", { name: "Enregistrer le rappel" }).click();
    await expect(page.getByText("Indique le nom du commerce.")).toBeVisible();
  });
});

test.describe("fichiers de 10 à 50 commerces", () => {
  test("extraire un fichier le retire de la liste des autres ; le rendre le remet", async ({ page, browser }) => {
    test.skip(test.info().project.name === "mobile", "Un seul passage : les deux projets partagent les mêmes données.");
    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "À contacter");
    await page.getByRole("button", { name: "Choisir la taille du fichier" }).click();
    await page.getByText("10", { exact: true }).click();
    await page.getByRole("button", { name: /^Extraire 10 commerces/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Mon fichier" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fichier terminé" })).toBeDisabled();

    const otherContext = await newContextLike(browser);
    const theo = await otherContext.newPage();
    await loginAs(theo, "theo", "Théo Garnier");
    await theo.goto("/a-contacter");
    await expect(theo.getByText(/Fichiers en cours : Léa Fontaine/)).toBeVisible();
    await expect(theo.getByRole("heading", { level: 2, name: "Mon fichier" })).toHaveCount(0);

    await page.getByRole("button", { name: "Rendre le fichier" }).click();
    await page.getByRole("button", { name: "Rendre à la liste" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Extraire un fichier" })).toBeVisible();
    await theo.reload();
    await expect(theo.getByText(/Fichiers en cours/)).toHaveCount(0);
    await otherContext.close();
  });

  test("traiter tout le fichier (appelé ou rappel) permet de le terminer et de compter les appels", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Un seul passage : les deux projets partagent les mêmes données.");
    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "À contacter");
    await page.getByRole("button", { name: "Choisir la taille du fichier" }).click();
    await page.getByText("10", { exact: true }).click();
    await page.getByRole("button", { name: /^Extraire 10 commerces/ }).click();
    const file = page.getByRole("region", { name: "Mon fichier" });
    await expect(file).toBeVisible();

    const cards = file.getByRole("article");
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);
    // Le premier part en rappel, les autres sont marqués appelés.
    await openLead(cards.first());
    await cards.first().getByRole("button", { name: "À rappeler plus tard" }).click();
    await cards.first().getByRole("button", { name: "Envoyer dans les rappels" }).click();
    for (let i = 1; i < total; i += 1) {
      const card = cards.nth(i);
      await openLead(card);
      await card.getByRole("button", { name: "Effectué" }).click();
      await expect(card.getByRole("button", { name: "Annuler" })).toBeVisible();
    }
    await expect(file.getByText(`${total} sur ${total} traités`)).toBeVisible();
    await page.getByRole("button", { name: "Fichier terminé" }).click();
    await expect(page.getByText(/Fichier terminé : \d+ commerces? ajoutés? à tes prospects\./)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Mon fichier" })).toHaveCount(0);
  });
});

test.describe("maquettes", () => {
  test("l'admin ajoute une maquette, la termine ; un membre la consulte sans pouvoir la modifier", async ({ page, browser }) => {
    const client = `Maquette ${unique()}`;
    await loginAs(page, "camille", "Camille Renaud");
    await page.goto("/contrats");
    await page.getByRole("button", { name: /^Maquettes/ }).click();
    await page.getByRole("button", { name: "Nouvelle maquette" }).click();
    await page.getByLabel("Commerce").fill(client);
    await page.getByLabel("Ville").fill("Hyères");
    await page.getByRole("button", { name: "Ajouter la maquette" }).click();
    const card = page.getByRole("article").filter({ hasText: client });
    await expect(card).toContainText("En cours");
    await card.getByRole("button", { name: "Marquer terminée" }).click();
    await expect(card).toContainText("Terminée");

    const otherContext = await newContextLike(browser);
    const theo = await otherContext.newPage();
    await loginAs(theo, "theo", "Théo Garnier");
    await theo.goto("/contrats");
    await theo.getByRole("button", { name: /^Maquettes/ }).click();
    await expect(theo.getByRole("article").filter({ hasText: client })).toBeVisible();
    await expect(theo.getByRole("button", { name: "Nouvelle maquette" })).toHaveCount(0);
    await otherContext.close();
  });
});

test.describe("échange par salons", () => {
  test("un message reste dans son salon, avec réponse et réaction ; seuls les admins écrivent dans Annonces", async ({ page }) => {
    const text = `Astuce ${unique()}`;
    await loginAs(page, "lea", "Léa Fontaine");
    await page.goto("/echange");
    await page.getByRole("tab", { name: "# Astuces" }).click();
    await page.getByRole("textbox", { name: "Message" }).fill(text);
    await page.getByRole("button", { name: "Envoyer" }).click();
    const log = page.getByRole("log", { name: "Messages" });
    const message = log.getByRole("listitem").filter({ hasText: text });
    await expect(message).toBeVisible();

    await message.getByRole("button", { name: "Ajouter une réaction" }).click();
    await message.getByRole("button", { name: "Réagir 🔥" }).click();
    await expect(message.getByRole("button", { name: /🔥 1/ })).toBeVisible();

    await message.getByRole("button", { name: "Répondre" }).click();
    await page.getByRole("textbox", { name: "Message" }).fill(`Merci ${text} !`);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(log.getByRole("listitem").filter({ hasText: `Merci ${text} !` })).toContainText(text, { timeout: 15000 });

    // Un autre salon ne montre pas ce message.
    await page.getByRole("tab", { name: "# Général" }).click();
    await expect(log.getByText(text)).toHaveCount(0);
    // Recherche dans un salon.
    await page.getByRole("tab", { name: "# Astuces" }).click();
    await page.getByRole("searchbox", { name: "Rechercher dans le salon" }).fill("introuvable-xyz");
    await expect(page.getByText("Aucun message ne correspond.")).toBeVisible();

    await page.getByRole("tab", { name: "# Annonces" }).click();
    await expect(page.getByText(/Salon en lecture seule/)).toBeVisible();
  });
});
