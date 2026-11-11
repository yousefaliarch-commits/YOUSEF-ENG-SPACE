// =====================================================================
//  The omnisearch's index and ranking (Ctrl / ⌘ K) — pure data in, an ordered list out; app/palette.tsx draws it.
//  · What a member can reach from the keyboard: every tool their role may open, a new document of any document tool, every
//    saved document (title · number · zone · level · element · tool · date — tools/doc-search.ts), the community's posts, the
//    jobs and the companies the member may open, the tabs and a few screens, their projects (to make one active) and two
//    switches (theme, language). Results are grouped, and the panel's tabs narrow them to one category.
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
import { GROUPS, toolById } from "./registry";
import type { ToolRole } from "./types";

export type PaletteAction =
  | { k: "tool"; id: string }
  | { k: "doc"; kind: string; id: string }
  | { k: "new"; kind: string }
  | { k: "tab"; id: string }
  | { k: "push"; type: string; id?: string }
  | { k: "project"; id: string | null }
  | { k: "theme" }
  | { k: "lang" };

export type PaletteGroup = "recent" | "tools" | "new" | "docs" | "posts" | "jobs" | "companies" | "go" | "projects" | "actions";

export type PaletteItem = {
  id: string;
  group: PaletteGroup;
  title: string;
  sub?: string;
  hay: string;        // normalised text the words are matched against
  icon?: string;      // a lucide name from the tool registry (tools and new documents)
  ugc?: boolean;      // the title is member-written (a document, a project, a post): shown as typed, never translated
  at?: number;        // recency, for documents
  badge?: string;     // what kind of thing this is, as a short label on the row («سؤال» · «وظيفة» · «شركة»)
  when?: string;      // when it was written or dated, shown on the row (a post's «منذ ساعتين», a document's date)
  run: PaletteAction;
};

export const PALETTE_GROUPS: Record<PaletteGroup, string> = {
  recent: "الأخيرة", tools: "الأدوات", new: "مستند جديد", docs: "مستندات محفوظة", posts: "نقاشات المجتمع", jobs: "وظائف", companies: "شركات",
  go: "انتقال", projects: "المشاريع", actions: "إعدادات سريعة",
};
const GROUP_ORDER: PaletteGroup[] = ["recent", "tools", "new", "docs", "posts", "jobs", "companies", "go", "projects", "actions"];

// the tabs over the results: «الكل» and one per kind of thing (a group may belong to one category only)
export type PaletteCategory = "all" | "tools" | "docs" | "community" | "jobs" | "companies";
export const PALETTE_CATEGORIES: { id: PaletteCategory; label: string; groups: PaletteGroup[] }[] = [
  { id: "all", label: "الكل", groups: GROUP_ORDER },
  { id: "tools", label: "الأدوات", groups: ["tools", "new"] },
  { id: "docs", label: "المستندات", groups: ["recent", "docs"] },
  { id: "community", label: "المجتمع", groups: ["posts"] },
  { id: "jobs", label: "الوظائف", groups: ["jobs"] },
  { id: "companies", label: "الشركات", groups: ["companies"] },
];

// what the community side hands over (the app already filtered it for the member's role — a post the feed hides, a job or a
// company a supervisor may not open, are simply not here)
export type PalettePost = { id: string; body: string; room?: string; kind?: string; when?: string };
export type PaletteJob = { id: string; title: string; company?: string; city?: string; discipline?: string; when?: string };
export type PaletteCompany = { id: string; name: string; en?: string; sector?: string; city?: string };

export type PaletteContext = {
  role: ToolRole;
  tabs: { id: string; label: string }[];
  docs: ToolHeader[];
  projects: ToolProject[];
  activeProject: string | null;
  docKinds: string[];              // the document kinds that have an editor (features/tools/module.ts)
  posts?: PalettePost[];
  jobs?: PaletteJob[];
  companies?: PaletteCompany[];
  screens?: { type: string; label: string; keywords?: string }[];
};

const groupName = (id: string) => (GROUPS.find((g) => g.id === id) || { name: "" }).name;

export function paletteItems(c: PaletteContext): PaletteItem[] {
  const out: PaletteItem[] = [];
  const tools = toolsForRole(c.role).filter((t) => t.status !== "soon");
  for (const t of tools) {
    out.push({
      id: `tool:${t.id}`, group: "tools", title: t.name, sub: t.desc, icon: t.icon,
      hay: normalise(`${t.name} ${t.desc} ${t.keywords} ${groupName(t.group)}`), run: { k: "tool", id: t.id },
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
      sub: [tool ? tool.name : "", wbsPath(h.wbs), h.docNo ? `${h.docNo} · Rev ${h.rev}` : ""].filter(Boolean).join(" · "), when: h.dateIso,
      hay: haystack(h), run: { k: "doc", kind: h.kind, id: h.id },
    });
  }
  // the community: what members wrote (a post's text is theirs — shown as typed), the jobs, the companies
  for (const p of c.posts || []) {
    const text = p.body.replace(/\s+/g, " ").trim();
    if (!text) continue;
    out.push({
      id: `post:${p.id}`, group: "posts", title: text.length > 96 ? `${text.slice(0, 96).replace(/\s+\S*$/, "")}…` : text, ugc: true, badge: p.kind || "منشور", when: p.when,
      sub: p.room, hay: normalise(`${text} ${p.room || ""} ${p.kind || ""}`), run: { k: "push", type: "post", id: p.id },
    });
  }
  for (const j of c.jobs || []) {
    out.push({
      id: `job:${j.id}`, group: "jobs", title: j.title, ugc: true, badge: "وظيفة", when: j.when, sub: [j.company, j.city].filter(Boolean).join(" · "),
      hay: normalise(`${j.title} ${j.company || ""} ${j.city || ""} ${j.discipline || ""} وظيفة job`), run: { k: "push", type: "job", id: j.id },
    });
  }
  for (const co of c.companies || []) {
    out.push({
      id: `company:${co.id}`, group: "companies", title: co.name, ugc: true, badge: "شركة", sub: [co.en, co.sector, co.city].filter(Boolean).join(" · "),
      hay: normalise(`${co.name} ${co.en || ""} ${co.sector || ""} ${co.city || ""} شركة company`), run: { k: "push", type: "company", id: co.id },
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

// nothing typed: the latest documents, then the tools, the places and the switches — what a member most likely wants next; inside
// a category, simply the first of its kind (documents newest first)
function defaults(items: PaletteItem[], category: PaletteCategory): PaletteItem[] {
  if (category !== "all") {
    const groups = (PALETTE_CATEGORIES.find((c) => c.id === category) || PALETTE_CATEGORIES[0]).groups;
    const own = items.filter((i) => groups.includes(i.group) && i.group !== "recent");
    return GROUP_ORDER.filter((g) => groups.includes(g)).flatMap((g) => own.filter((i) => i.group === g).sort((a, b) => (b.at || 0) - (a.at || 0)));
  }
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

export function searchPalette(items: PaletteItem[], query: string, limit = 40, category: PaletteCategory = "all"): PaletteItem[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (!words.length) return defaults(items, category).slice(0, limit);
  const groups = (PALETTE_CATEGORIES.find((c) => c.id === category) || PALETTE_CATEGORIES[0]).groups;
  const hits = items.filter((item) => groups.includes(item.group)).map((item) => ({ item, s: score(item, words) })).filter((x) => x.s > 0);
  const best = new Map<PaletteGroup, number>();
  for (const h of hits) best.set(h.item.group, Math.max(best.get(h.item.group) || 0, h.s));
  const order = [...best.keys()].sort((a, b) => (best.get(b) as number) - (best.get(a) as number) || GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  const ranked = order.flatMap((g) =>
    hits.filter((h) => h.item.group === g).sort((a, b) => b.s - a.s || (b.item.at || 0) - (a.item.at || 0) || (g === "posts" ? 0 : a.item.title.localeCompare(b.item.title, "ar"))).map((h) => h.item),
  );
  return ranked.slice(0, limit);
}

// how many results each tab holds for what is typed (the tabs show it), so a member sees where the matches are before switching
export function categoryCounts(items: PaletteItem[], query: string): Record<PaletteCategory, number> {
  const all = searchPalette(items, query, 100_000, "all");
  const n = (groups: PaletteGroup[]) => all.filter((i) => groups.includes(i.group)).length;
  return Object.fromEntries(PALETTE_CATEGORIES.map((c) => [c.id, c.id === "all" ? all.length : n(c.groups)])) as Record<PaletteCategory, number>;
}

// «Ctrl K» or «⌘K», by the keyboard in front of the member
export const paletteKeys = (platform: string) => (/mac|iphone|ipad/i.test(platform) ? "⌘K" : "Ctrl K");
