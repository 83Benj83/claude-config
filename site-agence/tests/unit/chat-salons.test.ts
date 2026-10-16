import { describe, expect, test } from "vitest";
import { splitMessageText } from "@/lib/chat";
import { DemoRepository } from "@/lib/data/demo-repository";
import * as messages from "@/lib/services/messages";
import { buildMessagesView } from "@/lib/views";
import { makeMember } from "./helpers";

const NOW = "2026-10-17T10:00:00.000Z";
const admin = makeMember("admin", { isAdmin: true, fullName: "Camille Admin" });
const lea = makeMember("lea", { fullName: "Léa Fontaine" });
const repo = () => new DemoRepository({ members: [admin, lea].map((member) => ({ member, passwordHash: null, sessionVersion: 1 })), prospects: [], resources: [], contracts: [] });

describe("salons de l'échange", () => {
  test("un message va dans son salon et n'apparaît pas dans les autres", async () => {
    const repository = repo();
    await messages.sendMessage(repository, lea, { text: "Bon plan Hyères", attachmentIds: [], channel: "prospection" }, NOW);
    await messages.sendMessage(repository, lea, { text: "Salut", attachmentIds: [] }, NOW);
    const view = buildMessagesView({ messages: await repository.listMessages(200), members: [admin, lea], me: lea, now: NOW, channel: "prospection" });
    expect(view.messages.map((m) => m.text)).toEqual(["Bon plan Hyères"]);
    const general = buildMessagesView({ messages: await repository.listMessages(200), members: [admin, lea], me: lea, now: NOW });
    expect(general.channel).toBe("general");
    expect(general.messages.map((m) => m.text)).toEqual(["Salut"]);
  });

  test("salon inconnu refusé ; annonces réservées aux admins", async () => {
    const repository = repo();
    expect(await messages.sendMessage(repository, lea, { text: "x", attachmentIds: [], channel: "nimporte" }, NOW)).toMatchObject({ ok: false });
    expect(await messages.sendMessage(repository, lea, { text: "x", attachmentIds: [], channel: "annonces" }, NOW)).toMatchObject({ ok: false });
    expect((await messages.sendMessage(repository, admin, { text: "Réunion", attachmentIds: [], channel: "annonces" }, NOW)).ok).toBe(true);
  });

  test("réponse : l'extrait du message cité est affiché, et seulement dans le même salon", async () => {
    const repository = repo();
    await messages.sendMessage(repository, lea, { text: "Question ?", attachmentIds: [] }, NOW);
    const [question] = await repository.listMessages(10);
    expect((await messages.sendMessage(repository, admin, { text: "Réponse", attachmentIds: [], replyTo: question.id }, "2026-10-17T10:01:00.000Z")).ok).toBe(true);
    expect(await messages.sendMessage(repository, admin, { text: "Autre salon", attachmentIds: [], channel: "astuces", replyTo: question.id }, NOW)).toMatchObject({ ok: false });
    const view = buildMessagesView({ messages: await repository.listMessages(200), members: [admin, lea], me: admin, now: NOW });
    expect(view.messages[1].reply).toMatchObject({ authorName: "Léa Fontaine", text: "Question ?" });
  });

  test("réactions : un clic ajoute, un second retire ; emoji inconnu refusé", async () => {
    const repository = repo();
    await messages.sendMessage(repository, lea, { text: "Super", attachmentIds: [] }, NOW);
    const [message] = await repository.listMessages(10);
    await messages.toggleReaction(repository, admin, { id: message.id, emoji: "🔥" });
    await messages.toggleReaction(repository, lea, { id: message.id, emoji: "🔥" });
    let view = buildMessagesView({ messages: await repository.listMessages(10), members: [admin, lea], me: lea, now: NOW });
    expect(view.messages[0].reactionList).toEqual([{ emoji: "🔥", count: 2, mine: true, names: ["Camille Admin", "Léa Fontaine"] }]);
    await messages.toggleReaction(repository, lea, { id: message.id, emoji: "🔥" });
    await messages.toggleReaction(repository, admin, { id: message.id, emoji: "🔥" });
    view = buildMessagesView({ messages: await repository.listMessages(10), members: [admin, lea], me: lea, now: NOW });
    expect(view.messages[0].reactionList).toEqual([]);
    expect(await messages.toggleReaction(repository, lea, { id: message.id, emoji: "💣" })).toMatchObject({ ok: false });
  });

  test("épingler : réservé aux admins", async () => {
    const repository = repo();
    await messages.sendMessage(repository, lea, { text: "Règle d'or", attachmentIds: [] }, NOW);
    const [message] = await repository.listMessages(10);
    expect(await messages.togglePin(repository, lea, message.id)).toMatchObject({ ok: false });
    expect(await messages.togglePin(repository, admin, message.id)).toMatchObject({ ok: true });
    const view = buildMessagesView({ messages: await repository.listMessages(10), members: [admin, lea], me: admin, now: NOW });
    expect(view.pinned).toHaveLength(1);
    expect(view.canPin).toBe(true);
  });
});

describe("mise en forme du texte", () => {
  test("liens https et mentions, sans la ponctuation finale", () => {
    expect(splitMessageText("Voir https://exemple.fr/page. Merci @Léa !")).toEqual([
      { kind: "text", value: "Voir " },
      { kind: "link", value: "https://exemple.fr/page" },
      { kind: "text", value: "." },
      { kind: "text", value: " Merci " },
      { kind: "mention", value: "@Léa" },
      { kind: "text", value: " !" },
    ]);
  });

  test("jamais de lien javascript:", () => {
    expect(splitMessageText("javascript:alert(1)").every((part) => part.kind === "text")).toBe(true);
  });
});
