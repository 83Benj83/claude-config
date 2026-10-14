import { describe, expect, test } from "vitest";
import { guide } from "@/content/guide";
import { AGENCY_RESOURCES } from "@/content/resources";
import { resourceSchema } from "@/lib/validation";

describe("guide du prospecteur", () => {
  test("15 sections aux identifiants uniques, chacune avec du contenu", () => {
    expect(guide.sections).toHaveLength(15);
    expect(new Set(guide.sections.map((section) => section.id)).size).toBe(15);
    expect(guide.sections.every((section) => section.blocks.length > 0)).toBe(true);
  });
});

describe("ressources de l'agence", () => {
  test("toutes valides, avec les modèles du guide", () => {
    for (const resource of AGENCY_RESOURCES) {
      const parsed = resourceSchema.safeParse({ ...resource, id: "", note: resource.note ?? "", sortOrder: String(resource.sortOrder) });
      expect(parsed.success, resource.title).toBe(true);
    }
    expect(AGENCY_RESOURCES.filter((resource) => resource.kind === "template")).toHaveLength(6);
    expect(AGENCY_RESOURCES.map((resource) => resource.value)).toContain("https://getnovaai.vercel.app/tarifs.html");
  });
});
