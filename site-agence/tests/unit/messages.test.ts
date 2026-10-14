import { describe, expect, test } from "vitest";
import { cleanFileName, fileTypeOf, formatBytes, matchesSignature } from "@/lib/attachments";
import { DemoRepository } from "@/lib/data/demo-repository";
import * as messages from "@/lib/services/messages";
import { buildMessagesView } from "@/lib/views";
import { makeMember } from "./helpers";

const NOW = "2026-10-14T10:00:00.000Z";
const paul = makeMember("paul", { isAdmin: true, fullName: "Paul" });
const julien = makeMember("julien", { fullName: "Julien" });
const maxime = makeMember("maxime", { fullName: "Maxime" });

const repository = () =>
  new DemoRepository({
    members: [paul, julien, maxime].map((member) => ({ member: { ...member }, passwordHash: null, sessionVersion: 1 })),
    prospects: [],
    resources: [],
    contracts: [],
  });

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const file = (name: string, bytes: number[] | string) => new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name);

describe("échange : messages", () => {
  test("toute l'équipe écrit, tout le monde lit dans l'ordre", async () => {
    const repo = repository();
    expect((await messages.sendMessage(repo, julien, { text: "  Salut l'équipe  ", attachmentIds: [] }, NOW)).ok).toBe(true);
    expect((await messages.sendMessage(repo, maxime, { text: "Hello", attachmentIds: [] }, "2026-10-14T10:01:00.000Z")).ok).toBe(true);
    const view = buildMessagesView({ messages: await repo.listMessages(50), members: [paul, julien, maxime], me: maxime, now: NOW });
    expect(view.messages.map((m) => [m.authorName, m.text, m.mine])).toEqual([
      ["Julien", "Salut l'équipe", false],
      ["Maxime", "Hello", true],
    ]);
  });

  test("refuse un message vide ou trop long", async () => {
    const repo = repository();
    expect(await messages.sendMessage(repo, julien, { text: "   ", attachmentIds: [] }, NOW)).toMatchObject({ ok: false });
    expect(await messages.sendMessage(repo, julien, { text: "x".repeat(2001), attachmentIds: [] }, NOW)).toMatchObject({ ok: false });
    expect(await repo.listMessages(10)).toEqual([]);
  });

  test("une photo envoyée se joint au message de son auteur seulement, une seule fois", async () => {
    const repo = repository();
    const upload = await messages.uploadAttachment(repo, julien, file("vitrine.png", PNG), NOW);
    if (!upload.ok) throw new Error(upload.message);
    expect(upload.data).toMatchObject({ name: "vitrine.png", type: "image/png", kind: "image" });

    // Quelqu'un d'autre ne peut ni la joindre, ni la lire avant l'envoi.
    expect(await messages.sendMessage(repo, maxime, { text: "", attachmentIds: [upload.data.id] }, NOW)).toMatchObject({ ok: false });
    expect(await messages.readAttachment(repo, maxime, upload.data.id)).toBeNull();

    expect((await messages.sendMessage(repo, julien, { text: "", attachmentIds: [upload.data.id] }, NOW)).ok).toBe(true);
    expect(await messages.readAttachment(repo, maxime, upload.data.id)).not.toBeNull();
    // Déjà publiée : impossible de la rattacher à un second message.
    expect(await messages.sendMessage(repo, julien, { text: "encore", attachmentIds: [upload.data.id] }, NOW)).toMatchObject({ ok: false });
  });

  test("refuse les fichiers non acceptés, vides, trop lourds ou déguisés", async () => {
    const repo = repository();
    expect(await messages.uploadAttachment(repo, julien, file("script.html", "<script>"), NOW)).toMatchObject({ ok: false });
    expect(await messages.uploadAttachment(repo, julien, file("faux.png", "<svg onload=alert(1)>"), NOW)).toMatchObject({ ok: false });
    expect(await messages.uploadAttachment(repo, julien, file("vide.pdf", []), NOW)).toMatchObject({ ok: false });
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "gros.pdf");
    expect(await messages.uploadAttachment(repo, julien, big, NOW)).toMatchObject({ ok: false });
    expect(await messages.uploadAttachment(repo, julien, "pas un fichier", NOW)).toMatchObject({ ok: false });
    expect((await messages.uploadAttachment(repo, julien, file("devis.pdf", "%PDF-1.7\n"), NOW)).ok).toBe(true);
  });

  test("seuls l'auteur et les admins suppriment un message, et ses fichiers avec", async () => {
    const repo = repository();
    const upload = await messages.uploadAttachment(repo, julien, file("photo.png", PNG), NOW);
    if (!upload.ok) throw new Error(upload.message);
    await messages.sendMessage(repo, julien, { text: "Avec photo", attachmentIds: [upload.data.id] }, NOW);
    const [message] = await repo.listMessages(1);

    expect(await messages.deleteMessage(repo, maxime, message.id)).toMatchObject({ ok: false });
    expect((await messages.deleteMessage(repo, paul, message.id)).ok).toBe(true);
    expect(await repo.listMessages(10)).toEqual([]);
    expect(await repo.getFile(upload.data.id)).toBeNull();
  });

  test("une pièce jointe retirée avant l'envoi est supprimée", async () => {
    const repo = repository();
    const upload = await messages.uploadAttachment(repo, julien, file("notes.txt", "Bonjour"), NOW);
    if (!upload.ok) throw new Error(upload.message);
    expect(await messages.discardAttachment(repo, maxime, upload.data.id)).toMatchObject({ ok: false });
    expect((await messages.discardAttachment(repo, julien, upload.data.id)).ok).toBe(true);
    expect(await repo.getFile(upload.data.id)).toBeNull();
  });

  test("deux envois simultanés ne publient pas le même fichier deux fois", async () => {
    const repo = repository();
    const upload = await messages.uploadAttachment(repo, julien, file("photo.png", PNG), NOW);
    if (!upload.ok) throw new Error(upload.message);
    const results = await Promise.all([
      messages.sendMessage(repo, julien, { text: "un", attachmentIds: [upload.data.id] }, NOW),
      messages.sendMessage(repo, julien, { text: "deux", attachmentIds: [upload.data.id] }, NOW),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await repo.listMessages(10)).toHaveLength(1);
  });

  test("fichiers en attente : 20 au plus, effacés après 24 h", async () => {
    const repo = repository();
    for (let index = 0; index < 20; index += 1) {
      expect((await messages.uploadAttachment(repo, julien, file(`notes-${index}.txt`, "texte"), NOW)).ok).toBe(true);
    }
    expect(await messages.uploadAttachment(repo, julien, file("encore.txt", "texte"), NOW)).toMatchObject({ ok: false });
    // Une autre personne n'est pas concernée.
    expect((await messages.uploadAttachment(repo, maxime, file("a.txt", "texte"), NOW)).ok).toBe(true);
    // Le lendemain, les fichiers jamais envoyés sont effacés.
    const tomorrow = "2026-10-15T11:00:00.000Z";
    expect((await messages.uploadAttachment(repo, julien, file("nouveau.txt", "texte"), tomorrow)).ok).toBe(true);
    expect(await repo.listPendingFiles(julien.id)).toHaveLength(1);
  });

  test("refuse un identifiant de pièce jointe mal formé", async () => {
    expect(await messages.sendMessage(repository(), julien, { text: "x", attachmentIds: ["../../etc"] }, NOW)).toMatchObject({ ok: false });
  });

  test("le dernier message signale les nouveautés", async () => {
    const repo = repository();
    expect(await messages.chatStatus(repo)).toEqual({ latestAt: null, latestAuthorId: null });
    await messages.sendMessage(repo, maxime, { text: "Nouveau", attachmentIds: [] }, NOW);
    expect(await messages.chatStatus(repo)).toEqual({ latestAt: NOW, latestAuthorId: maxime.id });
  });
});

describe("échange : fichiers", () => {
  test("type déduit de l'extension et vérifié sur les premiers octets", () => {
    expect(fileTypeOf("Devis FINAL.PDF")?.type).toBe("application/pdf");
    expect(fileTypeOf("photo.heic")).toBeNull();
    const png = fileTypeOf("a.png")!;
    expect(matchesSignature(png, new Uint8Array(PNG))).toBe(true);
    expect(matchesSignature(png, new TextEncoder().encode("<html>"))).toBe(false);
    const txt = fileTypeOf("a.txt")!;
    expect(matchesSignature(txt, new TextEncoder().encode("<script>"))).toBe(false);
  });

  test("noms propres et poids lisibles", () => {
    expect(cleanFileName("C:\\fakepath\\devis\u0007.pdf")).toBe("devis.pdf");
    expect(cleanFileName(`${"a".repeat(200)}.pdf`)).toMatch(/^a+….pdf$/);
    const emojis = cleanFileName(`${"😀".repeat(130)}.pdf`);
    expect(emojis.isWellFormed()).toBe(true);
    expect(() => encodeURIComponent(emojis)).not.toThrow();
    expect(formatBytes(820 * 1024)).toBe("820 Ko");
    expect(formatBytes(1.4 * 1024 * 1024)).toBe("1,4 Mo");
  });
});
