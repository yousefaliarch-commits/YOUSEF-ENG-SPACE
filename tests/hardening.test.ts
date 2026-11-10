// v0.39 hardening: text a member (or an imported file) supplies is only ever text — in the page, in Excel, in Word; what
// arrives from the account copy is read before it is trusted; and the app has no place where a string becomes markup or code.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import * as H from "./harness";
import { ToolStore, memoryAdapter, type CloudPort } from "../src/lib/tool-store";
import { isToolDoc, isToolTomb, newDocId, shardOf, type ToolDoc } from "../src/data/tool-docs";
import { applyDocControls } from "../src/data/doc-controls";
import { blankProject } from "../src/data/tool-projects";
import { buildSpec, snapOf } from "../src/features/tools/spec";
import { specDocx } from "../src/doc/docx";
import { specXlsx, workbookXlsx } from "../src/doc/xlsx";
import { module as qto } from "../src/features/tools/office/qto";
import type { DocBlock } from "../src/doc/model";

const HOSTILE = [
  '=HYPERLINK("http://evil.example","انقر")',
  "+SUM(1,2)",
  "-2+3",
  "@SUM(A1:A9)",
  "=cmd|' /C calc'!A0",
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "]]><x>",
  "a\u0000b\u0007c\u001Fd",
];
const doc = (over: Partial<ToolDoc> = {}): ToolDoc => ({
  id: newDocId(), kind: "concrete", v: 1, at: 1, createdAt: 1, projectId: "p1", title: HOSTILE[0], dateIso: "2026-11-10", docNo: "TWR-PP-0001", rev: "01", status: "issued",
  profile: { id: "x@1", edition: "", values: {}, overridden: [], unverified: [] }, body: {}, photos: {}, log: [], ...over,
});
const spec = () => {
  const project = snapOf({ ...blankProject("p1"), code: "TWR", name: HOSTILE[5], contractor: { name: HOSTILE[1] }, consultant: { name: HOSTILE[6] }, client: { name: HOSTILE[3] }, location: { site: HOSTILE[2] } });
  const blocks: DocBlock[] = [
    { k: "kv", cols: 2, rows: HOSTILE.slice(0, 4).map((v, i) => ({ label: `حقل ${i}`, value: v })) },
    {
      k: "table", id: "t", caption: `جدول [1]: a/b\\c?*`, cols: [{ key: "a", label: "البيان", wMm: 100, align: "start" }, { key: "n", label: "الكمية", wMm: 40, align: "end", num: { dp: 2 }, xl: { f: "{n}*1" } }],
      rows: HOSTILE.map((v, i) => ({ cells: { a: v, n: i + 1 } })), carry: { sumCols: ["n"] },
    },
    { k: "notes", title: HOSTILE[4], text: HOSTILE.join("\n") },
  ];
  const d = doc({ sign: [{ label: HOSTILE[0], name: HOSTILE[5], title: HOSTILE[1] }], revs: [{ rev: "00", dateIso: "2026-11-01", desc: HOSTILE[0] }], tb: { scale: "=1+1", reference: HOSTILE[6] } });
  return applyDocControls(buildSpec({ doc: d, meta: { kind: "concrete", docType: "PP", docTypeName: "خطة صب", discipline: "إنشائي", engine: "x@1" }, project, sections: [{ orientation: "portrait", blocks }] }), d);
};
const unzipText = (bytes: Uint8Array) => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([k, v]) => [k, strFromU8(v)]));
const cellsOf = (xml: string) => [...xml.matchAll(/<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((m) => ({ attrs: m[1], inner: m[2] || "" }));

describe("Excel: member text is a string, never a formula", () => {
  const files = unzipText(specXlsx(spec(), new Date("2026-11-10T00:00:00Z")));
  const sheets = Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => files[k]);
  const all = Object.values(files).join("\n");
  it("every hostile value is stored as an inline string cell", () => {
    const strings = sheets.flatMap(cellsOf).filter((c) => /t="inlineStr"/.test(c.attrs)).map((c) => c.inner);
    for (const h of ['=HYPERLINK(&quot;http://evil.example&quot;,&quot;انقر&quot;)', "+SUM(1,2)", "-2+3", "@SUM(A1:A9)", "=cmd|' /C calc'!A0", "&lt;script&gt;alert(1)&lt;/script&gt;"]) {
      expect(strings.some((s) => s.includes(h)), h).toBe(true);
    }
  });
  it("formula cells hold only what the tool wrote: references, numbers and functions", () => {
    const formulas = sheets.flatMap((x) => [...x.matchAll(/<f>([^<]*)<\/f>/g)].map((m) => m[1]));
    expect(formulas.length).toBeGreaterThan(0);
    for (const f of formulas) {
      expect(f, f).toMatch(/^[A-Z0-9$:,.+\-*/()<>= ]+$/);
      expect(f).not.toMatch(/HYPERLINK|cmd|script|WEBSERVICE|DDE|EXEC|CALL/i);
    }
    // a cell is either a formula or an inline string — never a string cell with a formula inside
    for (const c of sheets.flatMap(cellsOf)) if (/t="inlineStr"/.test(c.attrs)) expect(c.inner).not.toContain("<f>");
  });
  it("the package is well-formed: markup escaped, control characters gone, no external link, no macro", () => {
    expect(all).not.toContain("<script>");
    // the tag never opens: its «<» is escaped, so «onerror=» is only letters inside a string
    expect(all).not.toMatch(/<img/);
    expect(all).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(all).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    expect(all).not.toContain("]]><x>");
    expect(Object.keys(files).some((k) => /vbaProject|externalLink|\.bin$/.test(k))).toBe(false);
    expect(all).not.toMatch(/TargetMode="External"/);
  });
  it("sheet names keep to Excel's rules whatever the caption says", () => {
    const names = [...files["xl/workbook.xml"].matchAll(/<sheet name="([^"]*)"/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThanOrEqual(2);
    for (const n of names) {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[:\\/?*[\]]/);
    }
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
  });
  it("a tool's own live workbook (the take-off) treats its rows the same way", () => {
    const body = { ...qto.blank(), lines: [{ ...qto.blank().lines[0], kind: "plaster" as const, wbs: HOSTILE[0], desc: HOSTILE[5], boq: "=1+1", L: "5", H: "3", openings: [{ id: "o", label: HOSTILE[3], n: "1", w: "1", h: "1" }] }] };
    const wb = unzipText(workbookXlsx(qto.workbook!(doc({ kind: "qto", body }) as never, null)));
    const xml = Object.keys(wb).filter((k) => k.startsWith("xl/worksheets/")).map((k) => wb[k]).join("");
    const formulas = [...xml.matchAll(/<f>([^<]*)<\/f>/g)].map((m) => m[1]).join("\n");
    expect(formulas).not.toMatch(/HYPERLINK|script|SUM\(A1:A9\)/);
    expect(xml).toContain("=HYPERLINK(&quot;http://evil.example&quot;");
    expect(xml).not.toContain("<script>");
  });
});

describe("Word: member text is text", () => {
  const files = unzipText(specDocx(spec(), new Date("2026-11-10T00:00:00Z")));
  const body = files["word/document.xml"];
  it("markup is escaped and control characters are gone", () => {
    expect(body).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(body).not.toContain("<script>");
    expect(body).not.toMatch(/<img/);
    expect(body).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(Object.values(files).join("")).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
  });
  it("no field code, hyperlink, macro or external relationship is ever written", () => {
    const all = Object.values(files).join("\n");
    expect(all).not.toMatch(/w:instrText|w:fldSimple|w:fldChar|w:hyperlink|w:object|w:altChunk/);
    expect(all).not.toMatch(/TargetMode="External"/);
    expect(Object.keys(files).some((k) => /vbaProject|\.bin$|embeddings/.test(k))).toBe(false);
  });
});

describe("what arrives from the account copy is read before it is trusted", () => {
  const good = (title: string, at = 5): ToolDoc => doc({ title, at, status: "draft", docNo: null });
  it("a document needs its envelope; a tombstone its id and time", () => {
    expect(isToolDoc(good("x"))).toBe(true);
    for (const bad of [null, 5, "x", [], {}, { ...good("x"), id: 7 }, { ...good("x"), id: "" }, { ...good("x"), id: "a\u0000b" }, { ...good("x"), kind: "" }, { ...good("x"), at: "now" },
      { ...good("x"), at: NaN }, { ...good("x"), at: -1 }, { ...good("x"), title: null }, { ...good("x"), log: "none" }, { ...good("x"), body: null }, { ...good("x"), docNo: 12 }, { ...good("x"), id: "x".repeat(65) }]) {
      expect(isToolDoc(bad), JSON.stringify(bad)?.slice(0, 60)).toBe(false);
    }
    expect(isToolTomb({ id: "d1", kind: "ipc", deleted: true, at: 9 })).toBe(true);
    for (const bad of [null, {}, { id: "d1", at: 9 }, { id: "", deleted: true, at: 9 }, { id: "d1", deleted: true, at: "9" }]) expect(isToolTomb(bad)).toBe(false);
  });
  it("documents of every shape the app writes pass: templates, customised controls, a document without a project", () => {
    expect(isToolDoc(doc({ kind: "tpl.ipc", projectId: null, docNo: null, body: { of: "ipc", v: 1, body: {}, rows: true } }))).toBe(true);
    expect(isToolDoc(doc({ sign: [{ label: "x" }], revs: [], tb: { scale: "1:50" }, wbs: { zone: "A" } }))).toBe(true);
    const noProject = { ...good("x") } as Record<string, unknown>;
    delete noProject.projectId;
    expect(isToolDoc(noProject)).toBe(true);
  });
  it("a shard with broken entries: the good documents are merged, the rest passed over, nothing throws, nothing local is lost", async () => {
    const rows = new Map<string, { value: unknown; updated_at: string }>();
    let clock = 0;
    const port: CloudPort = {
      stamps: async () => Object.fromEntries([...rows].map(([k, v]) => [k, v.updated_at])),
      rows: async (keys) => keys.filter((k) => rows.has(k)).map((k) => ({ key: k, value: structuredClone(rows.get(k)!.value), updated_at: rows.get(k)!.updated_at })),
      save: async (key, value) => void rows.set(key, { value: JSON.parse(JSON.stringify(value)), updated_at: String(++clock).padStart(8, "0") }),
    };
    const s = await ToolStore.open("p1", port, memoryAdapter());
    const mine = (await s.save(good("على هذا الجهاز"))) as { status: "ok"; doc: ToolDoc };
    await s.flush();
    const remote = good("من جهاز آخر", Date.now() + 1000);
    const shard = shardOf(remote.id);
    const before = (rows.get(shard)?.value as { docs: unknown[] } | undefined)?.docs || [];
    rows.set(shard, { value: { v: 1, docs: [...before, null, 42, "junk", { id: 7 }, { id: "dbroken", kind: "ipc" }, remote, { ...remote, id: "dnolog", log: null }] }, updated_at: "99999990" });
    rows.set("toolIndex", { value: { v: 1, tombs: [null, { id: 5 }, "x", { id: mine.doc.id, at: "soon", deleted: true }] }, updated_at: "99999991" });
    const r = await s.pull();
    expect(r.status).toBe("ok");
    const titles = s.headers().map((h) => h.title).sort();
    expect(titles).toEqual(["على هذا الجهاز", "من جهاز آخر"].sort());
    expect(s.get(mine.doc.id)).not.toBeNull();
    expect(s.get("dbroken")).toBeNull();
    expect(s.get("dnolog")).toBeNull();
  });
});

describe("no place where a string becomes markup or code", () => {
  it("the app never sets HTML from a string, evaluates one, or builds a function from one", () => {
    expect(H.src).not.toMatch(/dangerouslySetInnerHTML/);
    expect(H.src).not.toMatch(/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\(|document\.write\(/);
    expect(H.src).not.toMatch(/\beval\(|new Function\(/);
  });
  it("links the public page builds are https addresses it checked, opened without the opener", () => {
    const landing = H.src.slice(H.src.indexOf("export const downloadLinks"), H.src.indexOf("export const downloadLinks") + 400);
    expect(landing).toContain("^https:");
    expect(H.src).toMatch(/data-landing-apk rel="noopener"/);
  });
});
