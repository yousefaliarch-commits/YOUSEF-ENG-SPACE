// =====================================================================
//  The command palette's index and ranking (Ctrl / ⌘ K) — pure data in, an ordered list out; app/palette.tsx draws it.
//  · What a member can reach from the keyboard: every tool their role may open, a new document of any document tool, every
//    saved document (title · number · zone · level · element · tool · date — tools/doc-search.ts), the tabs and a few
//    screens, their projects (to make one active) and two switches (theme, language).
//  · The same gate as everywhere else: tools come from `toolsForRole`, documents from the index the app already filtered
//    for the role — a supervisor's palette holds no money tool and no money document, an HR account's holds no site tool.
//  · Ranking: every typed word must match (Arabic normalised as people type it); a title that starts with the words beats
//    a word inside the title, which beats a keyword — and a keyword that starts with the word beats one that merely
//    contains it. Groups are shown best-first, each ranked inside.
// =====================================================================
import { wbsPath, type ToolHeader } from "../data/tool-docs";
import type { ToolProject } from "../data/tool-projects";
import { haystack, normalise } from "./doc-search";
import { toolsForRole } from "./gate";
import { PACKS, toolById } from "./registry";
import type { ToolRole } from "./types";

export type PaletteAction =
  | { k: "tool"; id: string }
  | { k: "doc"; kind: string; id: string }
  | { k: "new"; kind: string }
  | { k: "tab"; id: string }
  | { k: "push"; type: string }
  | { k: "project"; id: string | null }
  | { k: "theme" }
  | { k: "lang" };

export type PaletteGroup = "recent" | "tools" | "new" | "docs" | "go" | "projects" | "actions";

export type PaletteItem = {
  id: string;
  group: PaletteGroup;
  title: string;
  sub?: string;
  hay: string;        // normalised text the words are matched against
  icon?: string;      // a lucide name from the tool registry (tools and new documents)
  ugc?: boolean;      // the title is member-written (a document, a project): shown as typed, never translated
  at?: number;        // recency, for documents
  run: PaletteAction;
};

export const PALETTE_GROUPS: Record<PaletteGroup, string> = {
  recent: "الأخيرة", tools: "الأدوات", new: "مستند جديد", docs: "مستندات محفوظة", go: "انتقال", projects: "المشاريع", actions: "إعدادات سريعة",
};
const GROUP_ORDER: PaletteGroup[] = ["recent", "tools", "new", "docs", "go", "projects", "actions"];

export type PaletteContext = {
  role: ToolRole;
  tabs: { id: string; label: string }[];
  docs: ToolHeader[];
  projects: ToolProject[];
  activeProject: string | null;
  docKinds: string[];              // the document kinds that have an editor (features/tools/module.ts)
  screens?: { type: string; label: string; keywords?: string }[];
};

const packName = (id: string) => (PACKS.find((p) => p.id === id) || { name: "" }).name;

export function paletteItems(c: PaletteContext): PaletteItem[] {
  const out: PaletteItem[] = [];
  const tools = toolsForRole(c.role).filter((t) => t.status !== "soon");
  for (const t of tools) {
    out.push({
      id: `tool:${t.id}`, group: "tools", title: t.name, sub: t.desc, icon: t.icon,
      hay: normalise(`${t.name} ${t.desc} ${t.keywords} ${packName(t.pack)}`), run: { k: "tool", id: t.id },
    });
  }
  for (const t of tools) {
    const kind = (t.docKinds || []).find((k) => c.docKinds.includes(k));
    if (!kind) continue;
    out.push({
      id: `new:${kind}`, group: "new", title: `جديد: ${t.name}`, icon: t.icon,
      hay: normalise(`جديد مستند new ${t.name} ${t.keywords}`), run: { k: "new", kind },
    });
  }
  for (const h of c.docs) {
    if (h.deleted) continue;
    const tool = toolById(h.kind);
    out.push({
      id: `doc:${h.id}`, group: "docs", title: h.title || "بلا عنوان", ugc: true, at: h.at, icon: tool?.icon,
      sub: [tool ? tool.name : "", wbsPath(h.wbs), h.docNo ? `${h.docNo} · Rev ${h.rev}` : h.dateIso].filter(Boolean).join(" · "),
      hay: haystack(h), run: { k: "doc", kind: h.kind, id: h.id },
    });
  }
  for (const t of c.tabs) out.push({ id: `tab:${t.id}`, group: "go", title: t.label, hay: normalise(`${t.label} ${t.id}`), run: { k: "tab", id: t.id } });
  for (const s of c.screens || []) out.push({ id: `go:${s.type}`, group: "go", title: s.label, hay: normalise(`${s.label} ${s.type} ${s.keywords || ""}`), run: { k: "push", type: s.type } });
  const live = c.projects.filter((p) => !p.deleted && !p.archived);
  for (const p of live) {
    const on = p.id === c.activeProject;
    out.push({
      id: `project:${p.id}`, group: "projects", title: `${p.code} · ${p.name}`, ugc: true, sub: on ? "المشروع النشط الآن" : "اجعله المشروع النشط",
      hay: normalise(`${p.code} ${p.name} ${p.nameEn || ""} مشروع project`), run: { k: "project", id: p.id },
    });
  }
  if (c.activeProject && live.some((p) => p.id === c.activeProject)) {
    out.push({ id: "project:none", group: "projects", title: "كل المستندات — بدون مشروع نشط", hay: normalise("كل المستندات بدون مشروع all documents no project"), run: { k: "project", id: null } });
  }
  out.push({ id: "act:theme", group: "actions", title: "تبديل الوضع الفاتح / الداكن", hay: normalise("الوضع الفاتح الداكن المظهر theme dark light mode"), run: { k: "theme" } });
  out.push({ id: "act:lang", group: "actions", title: "تبديل اللغة · Switch language", hay: normalise("اللغة العربية الانجليزية language english arabic"), run: { k: "lang" } });
  return out;
}

export const RECENT_MAX = 5;

// nothing typed: the latest documents, then the tools, the places and the switches — what a member most likely wants next
function defaults(items: PaletteItem[]): PaletteItem[] {
  const recent = items.filter((i) => i.group === "docs").sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, RECENT_MAX).map((i) => ({ ...i, group: "recent" as const }));
  const rest = items.filter((i) => i.group === "tools" || i.group === "go" || i.group === "projects" || i.group === "actions");
  return [...recent, ...GROUP_ORDER.flatMap((g) => rest.filter((i) => i.group === g))];
}

// title starts with the word 100 · a word of the title starts with it 60 · inside the title 40 · a keyword starts with it 20 ·
// buried inside a keyword 10 («city» finds the project «City Mall» before a tool that mentions «ampacity»)
function score(item: PaletteItem, words: string[]): number {
  const title = normalise(item.title);
  const titleWords = title.split(" ");
  const hayWords = item.hay.split(" ");
  let total = 0;
  for (const w of words) {
    if (!item.hay.includes(w) && !title.includes(w)) return 0;
    if (title.startsWith(w)) total += 100;
    else if (titleWords.some((part) => part.startsWith(w))) total += 60;
    else if (title.includes(w)) total += 40;
    else if (hayWords.some((part) => part.startsWith(w))) total += 20;
    else total += 10;
  }
  return total;
}

export function searchPalette(items: PaletteItem[], query: string, limit = 40): PaletteItem[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (!words.length) return defaults(items).slice(0, limit);
  const hits = items.map((item) => ({ item, s: score(item, words) })).filter((x) => x.s > 0);
  const best = new Map<PaletteGroup, number>();
  for (const h of hits) best.set(h.item.group, Math.max(best.get(h.item.group) || 0, h.s));
  const groups = [...best.keys()].sort((a, b) => (best.get(b) as number) - (best.get(a) as number) || GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  const ranked = groups.flatMap((g) =>
    hits.filter((h) => h.item.group === g).sort((a, b) => b.s - a.s || (b.item.at || 0) - (a.item.at || 0) || a.item.title.localeCompare(b.item.title, "ar")).map((h) => h.item),
  );
  return ranked.slice(0, limit);
}

// «Ctrl K» or «⌘K», by the keyboard in front of the member
export const paletteKeys = (platform: string) => (/mac|iphone|ipad/i.test(platform) ? "⌘K" : "Ctrl K");
