import { create } from "zustand";
import type {
  ResumeDocument,
  DynamicSection,
  SectionItem,
  Rewrite,
} from "@resumetra/shared";
import type { TemplateId } from "../components/pdf/templates/templateTypes";

// ── State interface ────────────────────────────────────────────────────

interface ResumeEditorState {
  // Layer 1: source document (immutable after load)
  sourceDocument: ResumeDocument | null;
  // Layer 2: rewrites from tailoring
  rewrites: Rewrite[];
  // Layer 3: user edits — always wins
  userEdits: Map<string, string>;
  // UI state
  sectionOrder: string[];
  selectedTemplate: TemplateId;
  activeSectionId: string | null;
  // BuildMode state
  isThinResume: boolean;
  buildModeActive: boolean;

  // Actions
  initialize: (document: ResumeDocument, rewrites?: Rewrite[]) => void;
  setUserEdit: (key: string, value: string) => void;
  clearUserEdit: (key: string) => void;
  acceptRewrite: (id: string) => void;
  rejectRewrite: (id: string) => void;
  acceptAllRewrites: () => void;
  rejectAllRewrites: () => void;
  resetRewrites: () => void;
  reorderSection: (sectionId: string, newIndex: number) => void;
  addBullet: (sectionId: string, itemId: string, text: string) => void;
  removeBullet: (sectionId: string, itemId: string, index: number) => void;
  addEntry: (sectionId: string) => void;
  removeEntry: (sectionId: string, itemId: string) => void;
  setActiveSection: (sectionId: string | null) => void;
  setTemplate: (templateId: TemplateId) => void;
  toggleBuildMode: () => void;
  getResolvedDocument: () => ResumeDocument | null;
  resetEditor: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  sourceDocument: null as ResumeDocument | null,
  rewrites: [] as Rewrite[],
  userEdits: new Map<string, string>(),
  sectionOrder: [] as string[],
  selectedTemplate: "professional" as TemplateId,
  activeSectionId: null as string | null,
  isThinResume: false,
  buildModeActive: false,
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function checkThinResume(doc: ResumeDocument): boolean {
  // Thin = any experience section has < 3 bullets per entry, or total sections with content < 3
  const sectionsWithContent = doc.sections.filter((s) => s.items.length > 0);
  if (sectionsWithContent.length < 3) return true;

  const hasThinExperience = doc.sections.some(
    (s) =>
      s.type === "experience" &&
      s.items.some((item) => (item.bullets?.length ?? 0) < 3),
  );
  return hasThinExperience;
}

/** Build a mutable copy of the source document, applying rewrites and user edits. */
function buildResolvedDocument(
  source: ResumeDocument,
  rewrites: Rewrite[],
  userEdits: Map<string, string>,
  sectionOrder: string[],
): ResumeDocument {
  const doc = deepClone(source);

  // Reorder sections per sectionOrder
  const sectionMap = new Map(doc.sections.map((s) => [s.id, s]));
  const ordered: DynamicSection[] = [];
  for (const id of sectionOrder) {
    const section = sectionMap.get(id);
    if (section) ordered.push(section);
  }
  // Append any sections not in sectionOrder (safety)
  for (const section of doc.sections) {
    if (!sectionOrder.includes(section.id)) ordered.push(section);
  }
  doc.sections = ordered;

  // Build lookup: "sectionId.itemId.field" → accepted rewrite
  const acceptedRewrites = new Map<string, Rewrite>();
  for (const rw of rewrites) {
    if (rw.accepted === true) {
      acceptedRewrites.set(`${rw.sectionId}.${rw.itemId}.${rw.field}`, rw);
    }
  }

  // Apply layers: for each field, user edit > accepted rewrite > source
  for (const section of doc.sections) {
    for (const item of section.items) {
      applyFields(section.id, item, acceptedRewrites, userEdits);
    }
  }

  return doc;
}

function applyFields(
  sectionId: string,
  item: SectionItem,
  acceptedRewrites: Map<string, Rewrite>,
  userEdits: Map<string, string>,
): void {
  const scalarFields = [
    "heading",
    "subheading",
    "dateRange",
    "description",
    "rawText",
  ] as const;

  for (const field of scalarFields) {
    const key = `${sectionId}.${item.id}.${field}`;
    const userValue = userEdits.get(key);
    if (userValue !== undefined) {
      (item as unknown as Record<string, unknown>)[field] = userValue;
      continue;
    }

    const rw = acceptedRewrites.get(key);
    if (rw) {
      (item as unknown as Record<string, unknown>)[field] = rw.after;
    }
  }

  // Handle bullets array
  if (item.bullets) {
    const resolvedBullets = [...item.bullets];
    for (let i = 0; i < resolvedBullets.length; i++) {
      const key = `${sectionId}.${item.id}.bullets.${i}`;
      const userValue = userEdits.get(key);
      if (userValue !== undefined) {
        resolvedBullets[i] = userValue;
      } else {
        const rw = acceptedRewrites.get(key);
        if (rw) resolvedBullets[i] = rw.after;
      }
    }
    item.bullets = resolvedBullets;
  }

  // Handle items array (for list-type sections — skills)
  if (item.items) {
    const resolvedItems = [...item.items];
    for (let i = 0; i < resolvedItems.length; i++) {
      const key = `${sectionId}.${item.id}.items.${i}`;
      const userValue = userEdits.get(key);
      if (userValue !== undefined) {
        resolvedItems[i] = userValue;
      }
    }
    item.items = resolvedItems;
  }

  // Handle rows (for table-type sections — education)
  if (item.rows) {
    const resolvedRows = item.rows.map((row, rowIdx) => {
      const resolvedRow: Record<string, string> = {};
      for (const [col, val] of Object.entries(row)) {
        const key = `${sectionId}.${item.id}.rows.${rowIdx}.${col}`;
        const userValue = userEdits.get(key);
        resolvedRow[col] = userValue !== undefined ? userValue : val;
      }
      return resolvedRow;
    });
    item.rows = resolvedRows;
  }
}

// ── Store ──────────────────────────────────────────────────────────────

const useResumeEditorStore = create<ResumeEditorState>()((set, get) => ({
  ...INITIAL_STATE,

  initialize: (document: ResumeDocument, rewrites?: Rewrite[]) => {
    const sectionOrder = document.sections.map((s) => s.id);
    set({
      sourceDocument: deepClone(document),
      rewrites: rewrites ?? [],
      userEdits: new Map(),
      sectionOrder,
      activeSectionId: sectionOrder.length > 0 ? sectionOrder[0] : null,
      isThinResume: checkThinResume(document),
      buildModeActive: false,
    });
  },

  setUserEdit: (key: string, value: string) =>
    set((state) => {
      const next = new Map(state.userEdits);
      next.set(key, value);
      return { userEdits: next };
    }),

  clearUserEdit: (key: string) =>
    set((state) => {
      const next = new Map(state.userEdits);
      next.delete(key);
      return { userEdits: next };
    }),

  acceptRewrite: (id: string) =>
    set((state) => ({
      rewrites: state.rewrites.map((rw) =>
        rw.id === id ? { ...rw, accepted: true } : rw,
      ),
    })),

  rejectRewrite: (id: string) =>
    set((state) => ({
      rewrites: state.rewrites.map((rw) =>
        rw.id === id ? { ...rw, accepted: false } : rw,
      ),
    })),

  acceptAllRewrites: () =>
    set((state) => ({
      rewrites: state.rewrites.map((rw) => ({ ...rw, accepted: true })),
    })),

  rejectAllRewrites: () =>
    set((state) => ({
      rewrites: state.rewrites.map((rw) => ({ ...rw, accepted: false })),
    })),

  resetRewrites: () =>
    set((state) => ({
      rewrites: state.rewrites.map((rw) => ({ ...rw, accepted: null })),
    })),

  reorderSection: (sectionId: string, newIndex: number) =>
    set((state) => {
      const order = [...state.sectionOrder];
      const currentIdx = order.indexOf(sectionId);
      if (currentIdx === -1) return state;
      order.splice(currentIdx, 1);
      order.splice(newIndex, 0, sectionId);
      return { sectionOrder: order };
    }),

  addBullet: (sectionId: string, itemId: string, text: string) =>
    set((state) => {
      if (!state.sourceDocument) return state;
      const doc = deepClone(state.sourceDocument);
      const section = doc.sections.find((s) => s.id === sectionId);
      if (!section) return state;
      const item = section.items.find((it) => it.id === itemId);
      if (!item) return state;
      item.bullets = [...(item.bullets ?? []), text];
      return { sourceDocument: doc };
    }),

  removeBullet: (sectionId: string, itemId: string, index: number) =>
    set((state) => {
      if (!state.sourceDocument) return state;
      const doc = deepClone(state.sourceDocument);
      const section = doc.sections.find((s) => s.id === sectionId);
      if (!section) return state;
      const item = section.items.find((it) => it.id === itemId);
      if (!item || !item.bullets) return state;
      item.bullets = item.bullets.filter((_, i) => i !== index);

      // Clean up userEdits for bullets at/after removed index
      const nextEdits = new Map(state.userEdits);
      const prefix = `${sectionId}.${itemId}.bullets.`;
      for (const key of nextEdits.keys()) {
        if (!key.startsWith(prefix)) continue;
        const idx = parseInt(key.slice(prefix.length), 10);
        if (idx === index) {
          nextEdits.delete(key);
        } else if (idx > index) {
          // Shift down
          const newKey = `${prefix}${idx - 1}`;
          nextEdits.set(newKey, nextEdits.get(key)!);
          nextEdits.delete(key);
        }
      }

      // Also clean up rewrites referencing this bullet index
      const rewrites = state.rewrites.map((rw) => {
        if (rw.sectionId !== sectionId || rw.itemId !== itemId) return rw;
        if (!rw.field.startsWith("bullets.")) return rw;
        const rwIdx = parseInt(rw.field.slice("bullets.".length), 10);
        if (rwIdx === index) return { ...rw, accepted: false };
        return rw;
      });

      return { sourceDocument: doc, userEdits: nextEdits, rewrites };
    }),

  addEntry: (sectionId: string) =>
    set((state) => {
      if (!state.sourceDocument) return state;
      const doc = deepClone(state.sourceDocument);
      const section = doc.sections.find((s) => s.id === sectionId);
      if (!section) return state;

      const newItem: SectionItem = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        heading: "",
        subheading: "",
        dateRange: "",
        bullets: [],
      };

      // For experience sections, include bullets. For others, match type.
      if (section.type === "text") {
        newItem.description = "";
      } else if (section.type === "raw") {
        newItem.rawText = "";
      } else if (section.type === "list") {
        newItem.items = [];
      } else if (section.type === "table") {
        newItem.rows = [];
      }

      section.items.push(newItem);
      return { sourceDocument: doc };
    }),

  removeEntry: (sectionId: string, itemId: string) =>
    set((state) => {
      if (!state.sourceDocument) return state;
      const doc = deepClone(state.sourceDocument);
      const section = doc.sections.find((s) => s.id === sectionId);
      if (!section) return state;
      section.items = section.items.filter((it) => it.id !== itemId);

      // Clean up userEdits for removed item
      const nextEdits = new Map(state.userEdits);
      const prefix = `${sectionId}.${itemId}.`;
      for (const key of nextEdits.keys()) {
        if (key.startsWith(prefix)) nextEdits.delete(key);
      }

      // Clean up rewrites for removed item
      const rewrites = state.rewrites.map((rw) => {
        if (rw.sectionId === sectionId && rw.itemId === itemId) {
          return { ...rw, accepted: false };
        }
        return rw;
      });

      return { sourceDocument: doc, userEdits: nextEdits, rewrites };
    }),

  setActiveSection: (sectionId: string | null) =>
    set({ activeSectionId: sectionId }),

  setTemplate: (templateId: TemplateId) => set({ selectedTemplate: templateId }),

  toggleBuildMode: () =>
    set((state) => ({ buildModeActive: !state.buildModeActive })),

  getResolvedDocument: () => {
    const { sourceDocument, rewrites, userEdits, sectionOrder } = get();
    if (!sourceDocument) return null;
    return buildResolvedDocument(sourceDocument, rewrites, userEdits, sectionOrder);
  },

  resetEditor: () =>
    set({
      ...INITIAL_STATE,
      userEdits: new Map(),
    }),
}));

export { useResumeEditorStore };
export type { ResumeEditorState };
