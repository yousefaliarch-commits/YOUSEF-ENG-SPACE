// v0.39 the command palette (Ctrl / ⌘ K): what each role can reach, how typed words rank it, and the shortcut itself.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PALETTE_GROUPS, RECENT_MAX, paletteItems, paletteKeys, searchPalette, type PaletteContext, type PaletteItem } from "../src/tools/palette";
import { isPaletteKey } from "../src/app/palette";
import { TOOL_MODULES } from "../src/features/tools/module";
import { TOOL_REGISTRY, toolById } from "../src/tools/registry";
import { toolAllowed, toolKindsForRole } from "../src/tools/gate";
import { headerOf, newDocId, type ToolDoc, type ToolHeader } from "../src/data/tool-docs";
import { blankProject, type ToolProject } from "../src/data/tool-projects";
import type { ToolRole } from "../src/tools/types";

const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");
const doc = (title: string, over: Partial<ToolDoc> = {}): ToolHeader => headerOf({
  id: newDocId(), kind: "concrete", v: 1, at: 1, createdAt: 1, projectId: "p1", title, dateIso: "2026-11-01", docNo: null, rev: "00", status: "draft",
  profile: { id: "x", edition: "", values: {}, overridden: [], unverified: [] }, body: {}, photos: {}, log: [], ...over,
});
const allDocs: ToolHeader[] = [
  doc("صب سقف الدور الثاني", { at: 50, wbs: { zone: "برج A", level: "الدور 02", element: "بلاطة S-04" } }),
  doc("المستخلص رقم 4", { kind: "ipc", at: 90, docNo: "TWR-IPC-0004" }),
  doc("أعمدة الأرضي", { kind: "bbs", at: 70, wbs: { zone: "برج B" } }),
  doc("حصر الدور الأول", { kind: "qto", at: 10 }),
  doc("يومية ٣ نوفمبر", { kind: "siteDiary", at: 30 }),
  doc("تصريح أعمال ساخنة", { kind: "workPermit", at: 20 }),
  doc("أمر تغيير 2", { kind: "vo", at: 60 }),
  { ...doc("محذوف", { at: 99 }), deleted: true },
];
const projects: ToolProject[] = [
  { ...blankProject("p1"), code: "TWR", name: "أبراج النيل" },
  { ...blankProject("p2"), code: "MALL", name: "مول المدينة", nameEn: "City Mall" },
  { ...blankProject("p3"), code: "OLD", name: "مشروع مؤرشف", archived: true },
];
const TABS = [{ id: "home", label: "الرئيسية" }, { id: "community", label: "المجتمع" }, { id: "tools", label: "الأدوات" }, { id: "inbox", label: "الرسائل" }];
const ctx = (role: ToolRole, over: Partial<PaletteContext> = {}): PaletteContext => ({
  role, tabs: TABS, docs: allDocs.filter((h) => toolKindsForRole(role).includes(h.kind)), projects, activeProject: "p1", docKinds: Object.keys(TOOL_MODULES),
  screens: [{ type: "settings", label: "الإعدادات", keywords: "settings" }], ...over,
});
const ids = (xs: PaletteItem[]) => xs.map((x) => x.id);

describe("what each role can reach", () => {
  it("an engineer: every live tool, a new document of every document tool, every saved document", () => {
    const items = paletteItems(ctx("engineer"));
    for (const t of TOOL_REGISTRY.filter((x) => x.status !== "soon" && toolAllowed("engineer", x.id))) expect(ids(items), t.id).toContain(`tool:${t.id}`);
    for (const kind of Object.keys(TOOL_MODULES)) expect(ids(items), kind).toContain(`new:${kind}`);
    expect(items.filter((i) => i.group === "docs")).toHaveLength(7);
    expect(ids(items)).not.toContain(expect.stringContaining("محذوف"));
  });
  it("a site supervisor: no money tool, no new money document, no money document — by any wording", () => {
    const items = paletteItems(ctx("supervisor"));
    for (const t of TOOL_REGISTRY.filter((x) => x.money)) {
      expect(ids(items), t.id).not.toContain(`tool:${t.id}`);
      for (const k of t.docKinds || []) expect(ids(items), k).not.toContain(`new:${k}`);
    }
    expect(items.some((i) => i.run.k === "doc" && ["ipc", "vo"].includes(i.run.kind))).toBe(false);
    for (const q of ["مستخلص", "ipc", "أمر تغيير", "vo", "payment", "راتب", "عرض"]) {
      for (const hit of searchPalette(items, q)) {
        const tool = hit.run.k === "tool" ? toolById(hit.run.id) : hit.run.k === "new" || hit.run.k === "doc" ? toolById(hit.run.kind) : null;
        expect(tool ? tool.money : false, `${q} → ${hit.id}`).toBe(false);
      }
    }
    expect(ids(items)).toContain("tool:concrete");
    expect(ids(items)).toContain("new:siteDiary");
  });
  it("an HR account: no site tool at all — only places and switches", () => {
    const items = paletteItems(ctx("hr"));
    expect(items.filter((i) => i.group === "tools" || i.group === "new" || i.group === "docs")).toEqual([]);
    expect(ids(items)).toEqual(expect.arrayContaining(["tab:home", "go:settings", "act:theme", "act:lang"]));
  });
  it("only the member's own tabs, live projects, and «no project» when one is active", () => {
    const items = paletteItems(ctx("engineer", { tabs: [{ id: "tools", label: "الأدوات" }] }));
    expect(ids(items).filter((x) => x.startsWith("tab:"))).toEqual(["tab:tools"]);
    expect(ids(items).filter((x) => x.startsWith("project:"))).toEqual(["project:p1", "project:p2", "project:none"]);
    expect(items.find((i) => i.id === "project:p1")!.sub).toBe("المشروع النشط الآن");
    expect(ids(paletteItems(ctx("engineer", { activeProject: null })))).not.toContain("project:none");
    expect(ids(paletteItems(ctx("engineer", { activeProject: "p3" })))).not.toContain("project:none");
  });
  it("a document's title and a project's name are the member's words (never translated); tool names are interface text", () => {
    const items = paletteItems(ctx("engineer"));
    expect(items.filter((i) => i.group === "docs" || (i.group === "projects" && i.id !== "project:none")).every((i) => i.ugc)).toBe(true);
    expect(items.filter((i) => i.group === "tools" || i.group === "new" || i.group === "go" || i.group === "actions").some((i) => i.ugc)).toBe(false);
  });
  it("every group has a heading, and every item an action the app understands", () => {
    for (const i of paletteItems(ctx("engineer"))) {
      expect(PALETTE_GROUPS[i.group]).toBeTruthy();
      expect(["tool", "doc", "new", "tab", "push", "project", "theme", "lang"]).toContain(i.run.k);
    }
  });
});

describe("ranking", () => {
  const items = paletteItems(ctx("engineer"));
  it("nothing typed: the latest documents first (as «الأخيرة»), then tools, places, projects, switches — never deleted ones", () => {
    const d = searchPalette(items, "", 200);
    const recent = d.filter((i) => i.group === "recent");
    expect(recent).toHaveLength(RECENT_MAX);
    expect(recent.map((i) => i.title)).toEqual(["المستخلص رقم 4", "أعمدة الأرضي", "أمر تغيير 2", "صب سقف الدور الثاني", "يومية ٣ نوفمبر"]);
    expect([...new Set(d.map((i) => i.group))]).toEqual(["recent", "tools", "go", "projects", "actions"]);
    expect(d.some((i) => i.title === "محذوف")).toBe(false);
  });
  it("every word must match, in any order, Arabic typed loosely", () => {
    expect(searchPalette(items, "الدور برج a").filter((i) => i.group === "docs").map((i) => i.title)).toEqual(["صب سقف الدور الثاني"]);
    expect(searchPalette(items, "اعمده الارضى").filter((i) => i.group === "docs").map((i) => i.title)).toEqual(["أعمدة الأرضي"]);
    expect(searchPalette(items, "برج a مستخلص")).toEqual([]);
    expect(searchPalette(items, "zzzz")).toEqual([]);
  });
  it("a document is found by its number, a project by its code or English name", () => {
    expect(searchPalette(items, "twr-ipc-0004")[0]).toMatchObject({ id: expect.stringMatching(/^doc:/), title: "المستخلص رقم 4" });
    expect(searchPalette(items, "mall")[0].id).toBe("project:p2");
    expect(searchPalette(items, "city")[0].id).toBe("project:p2");
  });
  it("a title that starts with the words beats a word inside it, which beats a keyword", () => {
    const hits = searchPalette(items, "حصر");
    // «حصر الكميات» / «حصر وصب الخرسانة» start with it; the saved document «حصر الدور الأول» too — all before keyword-only hits
    const first = hits.slice(0, 3).map((i) => i.title);
    expect(first.every((t) => t.startsWith("حصر") || t.startsWith("جديد: حصر"))).toBe(true);
    const english = searchPalette(items, "concrete");
    expect(english.map((i) => i.id)).toEqual(expect.arrayContaining(["tool:concrete", "new:concrete"]));
  });
  it("groups come best-first and each is ranked inside; the limit holds", () => {
    const hits = searchPalette(items, "مستخلص");
    expect(hits.length).toBeGreaterThan(1);
    const groups = hits.map((i) => i.group);
    // each group appears as one run (no interleaving)
    expect(groups.filter((g, i) => i === 0 || groups[i - 1] !== g).length).toBe(new Set(groups).size);
    expect(searchPalette(items, "", 6)).toHaveLength(6);
    expect(searchPalette(items, "ا", 4)).toHaveLength(4);
  });
  it("typing «جديد» offers new documents; a new-document command opens that tool's editor kind", () => {
    const hits = searchPalette(items, "جديد مستخلص");
    expect(hits[0]).toMatchObject({ id: "new:ipc", run: { k: "new", kind: "ipc" } });
  });
});

describe("the shortcut", () => {
  const key = (o: Partial<Parameters<typeof isPaletteKey>[0]>) => isPaletteKey({ key: "k", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...o });
  it("Ctrl K or ⌘K — and nothing else", () => {
    expect(key({ ctrlKey: true })).toBe(true);
    expect(key({ metaKey: true })).toBe(true);
    expect(key({ metaKey: true, key: "K" })).toBe(true);
    expect(key({})).toBe(false);
    expect(key({ ctrlKey: true, shiftKey: true })).toBe(false);
    expect(key({ ctrlKey: true, altKey: true })).toBe(false);
    expect(key({ ctrlKey: true, key: "j" })).toBe(false);
  });
  it("names the key the member's keyboard has", () => {
    expect(paletteKeys("MacIntel")).toBe("⌘K");
    expect(paletteKeys("iPad")).toBe("⌘K");
    expect(paletteKeys("Win32")).toBe("Ctrl K");
    expect(paletteKeys("Linux x86_64")).toBe("Ctrl K");
    expect(paletteKeys("")).toBe("Ctrl K");
  });
  it("its entrance is one-shot, transform and opacity, and off under prefers-reduced-motion", () => {
    const block = css.slice(css.indexOf("the command palette (src/app/palette-panel.tsx)"));
    expect(block).toContain("@keyframes palette-in { from { opacity: 0; transform:");
    expect(block.slice(block.indexOf("@media (prefers-reduced-motion: reduce)"))).toContain(".palette-scrim, .palette-in { animation: none !important; }");
    expect(block).not.toMatch(/infinite|backdrop-filter/);
  });
});
