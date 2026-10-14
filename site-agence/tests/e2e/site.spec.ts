import { expect, test } from "@playwright/test";
import { loginAs, newContextLike, openMenu, openSection, signIn, unique } from "./helpers";

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

  test("un membre non admin ne peut pas ouvrir la gestion des identifiants ni l'activité", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
    await page.goto("/activite");
    await expect(page).toHaveURL("/");
  });
});

test.describe("navigation", () => {
  test("accueil simple, sans classement mis en avant, et menu en haut à gauche", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await expect(page.getByRole("heading", { level: 1, name: /Théo/ })).toBeVisible();
    const sections = page.getByRole("region", { name: "Les rubriques" });
    await expect(sections.getByRole("link")).toHaveCount(11);
    await expect(sections.getByRole("link", { name: "Panel admin" })).toHaveCount(0);
    await expect(sections.getByRole("link", { name: "Activité" })).toHaveCount(0);
    await expect(page.getByText(/Podium|Rang du jour/)).toHaveCount(0);

    // Le menu donne toutes les rubriques et se referme une fois la rubrique choisie.
    const menu = await openMenu(page);
    await expect(menu.getByRole("link", { name: "Panel admin" })).toHaveCount(0);
    await menu.getByRole("link", { name: "Guide du prospecteur", exact: true }).click();
    await expect(page).toHaveURL("/guide");
    await expect(menu).toBeHidden();

    // Échap le referme aussi ; « Accueil » ramène au début.
    await openMenu(page);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await openSection(page, "Accueil");
    await expect(page).toHaveURL("/");
  });

  test("le panel admin n'apparaît que dans le menu des admins", async ({ page }) => {
    await loginAs(page, "camille", "Camille Renaud");
    await expect(page.getByRole("region", { name: "Les rubriques" }).getByRole("link", { name: "Panel admin" })).toBeVisible();
    await openSection(page, "Panel admin");
    await expect(page.getByRole("heading", { level: 1, name: "Panel admin" })).toBeVisible();
  });
});

test.describe("à contacter", () => {
  test("cocher un commerce : il quitte la liste pour tous et entre dans mes prospects ; annuler le remet", async ({ page, browser }) => {
    // Un commerce différent par projet : les deux projets partagent le même serveur de démo.
    const name = test.info().project.name === "mobile" ? "Boulangerie du Port" : "Pizzeria Il Forno";
    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "À contacter");
    await expect(page.getByRole("heading", { level: 1, name: "À contacter" })).toBeVisible();

    const card = page.getByRole("article", { name });
    await expect(card.getByRole("list", { name: `Coordonnées de ${name}` }).getByRole("link")).not.toHaveCount(0);
    await card.getByRole("button", { name: "Je l'ai contacté" }).click();
    await card.getByRole("radio", { name: "Téléphone" }).check();
    await card.getByRole("button", { name: "Ajouter à mes prospects" }).click();
    await expect(page.getByText(`${name} ajouté à tes prospects du jour.`)).toBeVisible();
    await expect(card).toBeHidden();
    await expect(page.getByRole("list", { name: "Commerces cochés aujourd'hui" }).getByRole("listitem").filter({ hasText: name })).toContainText("par Léa Fontaine");

    // Les autres ne le voient plus dans la liste.
    const other = await newContextLike(browser);
    const theo = await other.newPage();
    await loginAs(theo, "theo", "Théo Garnier");
    await theo.goto("/a-contacter");
    await expect(theo.getByRole("heading", { level: 1, name: "À contacter" })).toBeVisible();
    await expect(theo.getByRole("article", { name })).toHaveCount(0);
    await expect(theo.getByRole("button", { name: `Annuler la coche de ${name}` })).toHaveCount(0);
    await other.close();

    // Il est dans mes prospects du jour.
    await page.goto("/prospection");
    await expect(page.getByRole("button", { name: new RegExp(`^Supprimer ${name} `) })).toBeVisible();

    // Annuler : de retour dans la liste, retiré de mes prospects.
    await page.goto("/a-contacter");
    await page.getByRole("button", { name: `Annuler la coche de ${name}` }).click();
    await expect(page.getByRole("article", { name })).toBeVisible();
    await page.goto("/prospection");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`^Supprimer ${name} `) })).toHaveCount(0);
  });

  test("seul un admin peut retirer un commerce de la liste", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await page.goto("/a-contacter");
    await expect(page.getByRole("heading", { level: 1, name: "À contacter" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Retirer .* de la liste$/ })).toHaveCount(0);
  });
});

test.describe("activité (admins)", () => {
  test("qui est venu aujourd'hui, et les connexions réussies ou refusées", async ({ page, browser }) => {
    // Quelqu'un se trompe de mot de passe, sur un autre appareil.
    const other = await newContextLike(browser);
    await signIn(await other.newPage(), "Inès Marchetti", "pas-le-bon");
    await other.close();

    await loginAs(page, "mehdi", "Mehdi Belkacem");
    await openSection(page, "Activité");
    await expect(page.getByRole("heading", { level: 1, name: "Activité" })).toBeVisible();

    const today = page.getByRole("list", { name: "Présence aujourd'hui" }).getByRole("listitem").filter({ hasText: "Mehdi Belkacem" });
    await expect(today).toContainText(/Venu à \d{2}:\d{2}/);
    await expect(page.getByRole("list", { name: "Présence et activité sur 7 jours" }).getByRole("listitem")).not.toHaveCount(0);

    const logins = page.getByRole("list", { name: "Journal des connexions" });
    await expect(logins.getByRole("listitem").filter({ hasText: "Mehdi Belkacem" }).first()).toContainText("Connecté");
    await expect(logins.getByRole("listitem").filter({ hasText: "Inès Marchetti" }).first()).toContainText("Mot de passe refusé");
    await expect(page.getByRole("progressbar", { name: "Espace de stockage utilisé" })).toBeVisible();
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
    // Semaine, mois et année : pas de classement du jour.
    await expect(page.getByRole("button", { name: "Semaine", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Aujourd'hui", exact: true })).toHaveCount(0);
    for (const label of ["Mois", "Année"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
    }

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
    await page.getByRole("button", { name: "Le parcours", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Trouver/ })).toBeVisible();
  });

  test("guide du prospecteur : la page d'origine, avec son sommaire, ses polices et sa recherche", async ({ page }) => {
    await loginAs(page, "karim", "Karim Ouali");
    await openSection(page, "Guide du prospecteur");
    const guide = page.frameLocator('iframe[title="Guide du prospecteur"]');
    await expect(guide.getByRole("heading", { level: 1, name: "Guide du prospecteur" })).toBeVisible();
    await expect(guide.getByRole("heading", { level: 2, name: "Votre rôle" })).toBeVisible();
    // Polices d'origine (Google Fonts) chargées malgré la politique de sécurité du site.
    await expect
      .poll(() => guide.locator("body").evaluate(() => document.fonts.ready.then(() => document.fonts.check('16px "Bricolage Grotesque"'))))
      .toBe(true);
    await guide.getByLabel("Rechercher une question").fill("Google");
    await expect(guide.getByText("Est-ce que je serai bien visible sur Google ?")).toBeVisible();
    await expect(guide.getByText("Combien ça coûte ?")).toBeHidden();
    // Le menu reste accessible au-dessus du guide.
    await openSection(page, "Accueil");
    await expect(page).toHaveURL("/");
  });

  test("le sommaire du guide mène à chaque section sans quitter le guide", async ({ page }) => {
    await loginAs(page, "karim", "Karim Ouali");
    await openSection(page, "Guide du prospecteur");
    const guide = page.frameLocator('iframe[title="Guide du prospecteur"]');
    const sommaire = guide.getByRole("navigation", { name: "Sommaire" });
    for (const [label, id] of [
      ["Les packs", "packs"],
      ["Lexique", "lexique"],
      ["Votre rôle", "role"],
    ]) {
      await sommaire.getByRole("link", { name: label }).click();
      await expect(guide.locator(`#${id}`)).toBeInViewport();
      await expect(sommaire.getByRole("link", { name: label })).toHaveClass(/is-here/);
    }
    // Lien vers une section depuis le texte du guide.
    await guide.locator('#role a[href="#messages"]').click();
    await expect(guide.locator("#messages")).toBeInViewport();
    await expect(guide.getByRole("heading", { level: 1, name: "Guide du prospecteur" })).toBeAttached();
    await expect(page).toHaveURL("/guide");
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

  test("un membre peut gérer les mails et liens, mais ni les contrats ni les identifiants", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await page.goto("/ressources");
    await expect(page.getByRole("heading", { level: 1, name: "Mails et liens" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter" })).toBeVisible();
    await page.goto("/contrats");
    await expect(page.getByRole("heading", { level: 1, name: "Contrats" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouveau contrat" })).toHaveCount(0);
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
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
  // Première visite de la page en développement : le bouton peut s'afficher avant d'être actif.
  await expect(async () => {
    if (new URL(page.url()).pathname === "/bienvenue") await page.getByRole("button", { name: "C'est parti" }).click();
    await expect(page).toHaveURL("/", { timeout: 3000 });
  }).toPass({ timeout: 20_000 });
});

test("aucun débordement horizontal sur les écrans principaux", async ({ page }) => {
  await loginAs(page, "mehdi", "Mehdi Belkacem");
  for (const path of ["/", "/a-contacter", "/prospection", "/recherche", "/classement", "/bilan", "/contrats", "/guide", "/equipe", "/ressources", "/agence", "/admin", "/activite"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `débordement sur ${path}`).toBeLessThanOrEqual(0);
  }
});

test("l'admin ajoute un contrat et le fait avancer jusqu'à la mise en ligne", async ({ page }) => {
  const client = `Contrat test ${unique()}`;
  await loginAs(page, "camille", "Camille Renaud");
  await page.goto("/contrats");
  await page.getByRole("button", { name: "Nouveau contrat" }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Commerce").fill(client);
  await sheet.locator("label").filter({ hasText: /^Pro$/ }).click();
  await sheet.getByLabel("Montant (€, payé une fois)").fill("780");
  await sheet.getByRole("button", { name: "Ajouter le contrat" }).click();
  const card = page.getByRole("article").filter({ hasText: client });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Passer à : Développement" }).click();
  await card.getByRole("button", { name: "Passer à : Validation client" }).click();
  await card.getByRole("button", { name: "Marquer en ligne" }).click();
  await page.getByRole("button", { name: /Effectués/ }).click();
  await expect(page.getByRole("article").filter({ hasText: client })).toContainText("En ligne depuis");
});

test.describe("échange", () => {
  const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

  test("un message avec photo est vu par l'équipe ; l'auteur peut le supprimer", async ({ page, browser }) => {
    const text = `Bonjour l'équipe ${unique()}`;
    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "Échange");
    await expect(page.getByRole("heading", { level: 1, name: "Échange" })).toBeVisible();

    await page.getByLabel("Photos à envoyer").setInputFiles({ name: "vitrine.png", mimeType: "image/png", buffer: PIXEL });
    const chips = page.getByRole("list", { name: "Fichiers à envoyer" });
    await expect(chips.getByText("vitrine.png")).toBeVisible();
    await expect(chips.getByLabel("Envoi en cours")).toHaveCount(0);
    await page.getByRole("textbox", { name: "Message" }).fill(text);
    await page.getByRole("button", { name: "Envoyer" }).click();

    const log = page.getByRole("log", { name: "Messages" });
    const mine = log.getByRole("listitem").filter({ hasText: text });
    await expect(mine).toBeVisible();
    await expect(mine.getByRole("img", { name: "vitrine.png" })).toBeVisible();
    await expect(chips).toHaveCount(0);

    // Un collègue voit la nouveauté, puis le message et la photo (servie après vérification de la session).
    const otherContext = await newContextLike(browser);
    const other = await otherContext.newPage();
    await loginAs(other, "theo", "Théo Garnier");
    await expect(other.getByRole("region", { name: "Les rubriques" }).getByText("Nouveau")).toBeVisible();
    await openSection(other, "Échange");
    const otherLog = other.getByRole("log", { name: "Messages" });
    const message = otherLog.getByRole("listitem").filter({ hasText: text });
    await expect(message).toBeVisible();
    await expect.poll(() => message.getByRole("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
    await expect(message.getByRole("button", { name: "Supprimer" })).toHaveCount(0);
    await otherContext.close();

    // Sans session, le fichier n'est pas servi.
    const src = await mine.getByRole("img", { name: "vitrine.png" }).getAttribute("src");
    const anonymous = await newContextLike(browser);
    const response = await anonymous.request.get(src!, { maxRedirects: 0 });
    expect(response.status()).not.toBe(200);
    await anonymous.close();

    await mine.getByRole("button", { name: "Supprimer" }).click();
    await mine.getByRole("button", { name: "Oui" }).click();
    await expect(log.getByText(text)).toHaveCount(0);
  });
});

test.describe("import d'une liste", () => {
  test("un fichier CSV : aperçu ligne par ligne, ville par défaut, doublons, puis enregistrement", async ({ page }) => {
    const u = unique();
    const csv = [
      "Nom;Ville;Moyen de contact;Téléphone;Date",
      `Import A ${u};Lyon;Appel;0612345678;`,
      `Import B ${u};Lyon;;contact@b-${u}.fr;`,
      `Import A ${u};Lyon;Téléphone;;`,
      "X;Lyon;Téléphone;;",
      `Import C ${u};;Sur place;;`,
    ].join("\n");
    const file = { name: "prospects.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") };

    await loginAs(page, "lea", "Léa Fontaine");
    await openSection(page, "Prospecter");
    await page.getByLabel("Fichier de prospects").setInputFiles(file);
    const sheet = page.getByRole("dialog", { name: "Importer une liste" });
    const summary = sheet.getByRole("list", { name: "Résumé" });
    await expect(summary).toContainText("2 prêts");
    await expect(summary).toContainText("1 en double dans le fichier");
    await expect(summary).toContainText("2 à corriger");

    await sheet.getByLabel("Ville des lignes sans ville").fill("Lyon");
    await expect(summary).toContainText("3 prêts");
    await sheet.getByRole("button", { name: "Ajouter 3 prospects" }).click();
    await expect(page.getByRole("status").filter({ hasText: "3 prospects ajoutés, 2 ignorés." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Mes prospects" }).getByText(`Import C ${u}`)).toBeVisible();

    // Le même fichier une seconde fois : tout est déjà contacté, rien n'est ajouté sans le demander.
    await page.getByLabel("Fichier de prospects").setInputFiles(file);
    await expect(summary).toContainText("2 déjà contactés");
    await sheet.getByLabel("Ville des lignes sans ville").fill("Lyon");
    await expect(summary).toContainText("3 déjà contactés");
    await expect(sheet.getByRole("button", { name: "Ajouter 0 prospect" })).toBeDisabled();
    await sheet.getByLabel("Ajouter aussi les commerces déjà contactés").check();
    await expect(sheet.getByRole("button", { name: "Ajouter 3 prospects" })).toBeEnabled();
    await sheet.getByRole("button", { name: "Fermer" }).click();
  });

  test("un fichier Excel : titres libres, date et numéro sans son 0 reconnus", async ({ page }) => {
    await loginAs(page, "yanis", "Yanis Haddad");
    await openSection(page, "Prospecter");
    await page.getByLabel("Fichier de prospects").setInputFiles("tests/e2e/fixtures/prospects.xlsx");
    const sheet = page.getByRole("dialog", { name: "Importer une liste" });
    await expect(sheet.getByText("Colonnes reconnues : Nom, Ville, Coordonnées, Date.")).toBeVisible();
    const rows = sheet.getByRole("list", { name: "Lignes du fichier" });
    await expect(rows.getByText("Fixture Excel Bistrot")).toBeVisible();
    await expect(rows.getByText(/0612345678/)).toBeVisible();
    await expect(rows.getByText(/fleurs@exemple\.fr/)).toBeVisible();
  });

  test("un ancien format Excel est refusé avec une explication", async ({ page }) => {
    await loginAs(page, "theo", "Théo Garnier");
    await openSection(page, "Prospecter");
    await page.getByLabel("Fichier de prospects").setInputFiles({ name: "vieux.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("x") });
    await expect(page.getByRole("alert").filter({ hasText: "Ancien format Excel" })).toBeVisible();
  });
});
