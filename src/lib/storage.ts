import { createStore, del, get, set, values } from "idb-keyval";
import { posterSchema, type PosterDocument, type SavedDraft } from "@/lib/poster";

let workspace: ReturnType<typeof createStore> | undefined;
function store() {
  workspace ??= createStore("axoposter", "documents");
  return workspace;
}

export async function readAutosave(): Promise<PosterDocument | undefined> {
  const value: unknown = await get("autosave", store());
  if (value === undefined) return undefined;
  return posterSchema.parse(value);
}

export async function writeAutosave(document: PosterDocument) {
  await set("autosave", document, store());
}

export async function listDrafts(): Promise<SavedDraft[]> {
  const entries: unknown[] = await values(store());
  return entries.filter((entry): entry is SavedDraft => {
    if (!entry || typeof entry !== "object" || !("document" in entry)) return false;
    const draft = entry as Partial<SavedDraft>;
    return typeof draft.id === "string" &&
      typeof draft.name === "string" &&
      typeof draft.updatedAt === "number" &&
      posterSchema.safeParse(draft.document).success;
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveDraft(document: PosterDocument): Promise<SavedDraft> {
  const draft: SavedDraft = {
    id: crypto.randomUUID(),
    name: `Axolotl Launcher ${document.version}`,
    updatedAt: Date.now(),
    document,
  };
  await set(`draft:${draft.id}`, draft, store());
  return draft;
}

export async function deleteDraft(id: string) {
  await del(`draft:${id}`, store());
}

export async function restoreDraft(draft: SavedDraft) {
  await set(`draft:${draft.id}`, draft, store());
}
