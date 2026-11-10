// v0.40 — the three exports are one document. Whatever the A4 PDF prints (the title block, the revision table, the signature
// boxes, values, indicators, checks, notes, every table's headers and cells) must also be in the Word file and in the Excel
// workbook — for every sample sheet the public page draws (a pour plan, a certificate, a take-off, a bar schedule).
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { SAMPLES, SAMPLE_PROJECT } from "../src/features/landing/samples";
import { TOOL_MODULES } from "../src/features/tools/module";
import { applyDocControls } from "../src/data/doc-controls";
import { docLayout, fixedMeasurer } from "../src/doc/layout";
import { specDocx } from "../src/doc/docx";
import { specXlsx } from "../src/doc/xlsx";
import { fingerprint, flatText, stripIsolates } from "../src/doc/text";
import type { DocBlock, DocSpec, DocText } from "../src/doc/model";
import type { ToolDoc } from "../src/data/tool-docs";

const plain = (t: DocText | number | null | undefined): string => (t == null ? "" : typeof t === "number" ? "" : stripIsolates(typeof t === "string" ? t : flatText(t)));
const norm = (s: string) => stripIsolates(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

async function specOf(i: number): Promise<DocSpec> {
  const s = SAMPLES[i];
  const mod = await TOOL_MODULES[s.kind]();
  const doc: ToolDoc = {
    id: `sample${i}`, kind: s.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: s.title, dateIso: "2026-11-05", docNo: s.docNo, rev: s.rev, status: "issued",
    profile: mod.profile, body: s.body(mod.blank() as Record<string, unknown>), photos: {}, log: [], wbs: s.wbs, revs: s.revs,
    tb: { scale: "1:50", reference: "S-301 Rev B" }, sign: [{ label: "مدير المشروع · Project manager", name: "م. هشام فؤاد", title: "مدير المشروع" }, { label: "مراجع الاستشاري", name: "م. سمير" }],
  };
  return applyDocControls(mod.build(doc, SAMPLE_PROJECT), doc);
}

// what the PDF prints, as the strings a reader would look for
function expected(spec: DocSpec): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, t: string) => {
    const x = norm(t);
    if (x.length > 1) out.push({ where, text: x });
  };
  const { meta, title } = spec;
  add("title", title.title);
  for (const p of title.parties) add("party", p.name);
  for (const k of ["discipline", "location", "reference"] as const) add(k, String(title[k] || ""));
  if (title.scale) add("scale", title.scale);
  add("docNo", meta.docNo || "");
  add("rev", meta.rev);
  add("date", meta.dateIso.slice(0, 10));
  add("profile", meta.profileLabel);
  add("status", { draft: "مسودة", issued: "صادر", superseded: "مُستبدَل", void: "ملغى" }[meta.status]);
  if (meta.hash) add("fingerprint", fingerprint(meta.hash));
  for (const r of spec.revisions) {
    add("revision", r.desc);
    add("revision", r.prepared);
    add("revision", r.checked);
  }
  for (const sec of spec.sections) {
    for (const b of sec.blocks as DocBlock[]) {
      if (b.k === "kv") b.rows.forEach((r) => (add("kv", r.label), add("kv", plain(r.value))));
      else if (b.k === "kpis") b.items.forEach((i) => add("kpi", i.label));
      else if (b.k === "table") {
        // a drawing column (the bar-shape sketches) is a picture: it stays in the PDF, and the sheet keeps the numbers beside it
        b.cols.filter((c) => !c.sketch).forEach((c) => add("column", c.label));
        for (const r of b.rows) for (const c of b.cols) if (typeof r.cells[c.key] === "string") add("cell", plain(r.cells[c.key] as DocText));
      } else if (b.k === "checks") b.rows.forEach((r) => add("check", r.label));
      else if (b.k === "notes") add("notes", plain(b.text).split("\n")[0]);
      else if (b.k === "signatures") b.parties.forEach((p) => (add("signature", p.role), add("signature", p.name || ""), add("signature", p.title || "")));
      else if (b.k === "heading") add("heading", b.text);
    }
  }
  return out;
}

const docxText = (spec: DocSpec) => norm(strFromU8(unzipSync(specDocx(spec, new Date("2026-11-05T00:00:00Z")))["word/document.xml"]).replace(/<[^>]+>/g, " "));
const xlsxText = (spec: DocSpec) => {
  const files = unzipSync(specXlsx(spec, new Date("2026-11-05T00:00:00Z")));
  return norm(Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k]).replace(/<f>[^<]*<\/f>/g, " ").replace(/<[^>]+>/g, " ")).join(" "));
};
// a long cell may be wrapped or clipped to a column in a sheet; the start of it must be there
const has = (hay: string, needle: string) => hay.includes(needle) || (needle.length > 40 && hay.includes(needle.slice(0, 40)));

describe("one document, three formats", () => {
  for (let i = 0; i < SAMPLES.length; i++) {
    it(`${SAMPLES[i].kind}: everything the PDF prints is in the Word file and in the Excel workbook`, async () => {
      const spec = await specOf(i);
      const want = expected(spec);
      expect(want.length).toBeGreaterThan(30);
      const word = docxText(spec), sheet = xlsxText(spec);
      const lostWord = want.filter((w) => !has(word, w.text)).map((w) => `${w.where}: ${w.text}`);
      const lostSheet = want.filter((w) => !has(sheet, w.text)).map((w) => `${w.where}: ${w.text}`);
      if (process.env.PARITY_DUMP) (await import("node:fs")).appendFileSync(process.env.PARITY_DUMP, JSON.stringify({ kind: SAMPLES[i].kind, lostWord, lostSheet }) + "\n");
      expect(lostWord, "missing from Word").toEqual([]);
      expect(lostSheet, "missing from Excel").toEqual([]);
    });
  }
  it("the PDF itself prints what the spec says (so the comparison above is against the real page)", async () => {
    const spec = await specOf(0);
    const printed = norm(docLayout(spec, fixedMeasurer).pages.flatMap((p) => p.ops.filter((o) => o.op === "text").map((o) => (o as { text: string }).text)).join(" "));
    for (const w of expected(spec).filter((x) => ["title", "docNo", "scale", "revision", "signature"].includes(x.where))) expect(has(printed, w.text), `${w.where}: ${w.text}`).toBe(true);
  });
});
