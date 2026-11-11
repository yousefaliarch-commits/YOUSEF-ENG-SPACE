// v0.40 — nothing in a document is clipped: a long Arabic, English or mixed string in a table header, a table cell, a key-value
// row or a totals label wraps onto more lines (the row grows) and every word reaches the page. Numbers stay left-to-right.
import { describe, expect, it } from "vitest";
import { docLayout, fixedMeasurer } from "../src/doc/layout";
import type { DocBlock, DocSpec, DrawOp } from "../src/doc/model";

const spec = (blocks: DocBlock[], lang: "ar" | "en" = "ar"): DocSpec => ({
  meta: { docType: "IPC", docTypeName: "مستخلص · Payment certificate", docNo: "TWR-IPC-0005", rev: "01", status: "issued", dateIso: "2026-11-10", lang, issuer: "شركتك", issuerRole: "contractor", appVersion: "t", profileLabel: "contract@1", engines: ["x@1"], hash: "7f3a91c20b5e44d1aa" },
  title: { parties: [{ role: "client", name: "المالك" }, { role: "project", name: "برج" }, { role: "consultant", name: "الاستشاري" }, { role: "contractor", name: "شركتك", issuer: true }], title: "مستخلص", discipline: "مكتب فني", location: "القاهرة", reference: "C-1" },
  revisions: [],
  sections: [{ orientation: "landscape", blocks }],
  colophon: { generatedAt: "2026-11-10T00:00:00Z", appVersion: "t", backend: "raster", profiles: ["x"], unverified: 0, overridden: [], hash: "7f3a91c20b5e44d1aa", disclaimer: "" },
});
const printed = (s: DocSpec) => docLayout(s, fixedMeasurer).pages.flatMap((p) => p.ops.filter((o): o is Extract<DrawOp, { op: "text" }> => o.op === "text").map((o) => o.text)).join(" ");
const words = (t: string) => t.replace(/[⁦-⁩]/g, "").split(/\s+/).filter((w) => w.length > 1);

const LONG_AR = "توريد وتركيب وتشغيل وصيانة منظومة الإنذار المبكر ومكافحة الحريق بالرشاشات الأوتوماتيكية لجميع أدوار المبنى الإداري والجراج";
const LONG_MIX = "Supply, install & commission HVAC chilled-water pipework DN150 مع العزل الحراري والتغطية بالألمنيوم للأدوار من B2 حتى السطح";
const LONG_HEAD = "الكمية التراكمية المنفذة حتى نهاية الفترة السابقة بحسب المستخلص المعتمد";

import { strFromU8, unzipSync } from "fflate";
import { specXlsx } from "../src/doc/xlsx";

describe("Excel: long text wraps inside its cell", () => {
  it("every text cell of a table sheet has wrap-text on; a number cell does not need it", () => {
    const s = spec([{ k: "table", id: "t", caption: "", cols: [{ key: "d", label: "البيان", wMm: 60, align: "start" }, { key: "n", label: "الكمية", wMm: 30, align: "end", num: { dp: 2 } }], rows: [{ cells: { d: LONG_AR, n: 12.5 } }] }]);
    const files = unzipSync(specXlsx(s, new Date("2026-11-10T00:00:00Z")));
    const styles = strFromU8(files["xl/styles.xml"]);
    const xfs = [...(styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/) || [""])[0].matchAll(/<xf [^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => m[0]);
    const sheet = Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k])).find((x) => x.includes(LONG_AR.slice(0, 30)))!;
    const cell = /<c r="[A-Z]+\d+"([^>]*)t="inlineStr"[^>]*><is><t[^>]*>([^<]*توريد وتركيب[^<]*)<\/t>/.exec(sheet)!;
    const sid = Number(/ s="(\d+)"/.exec(cell[1])![1]);
    expect(xfs[sid]).toContain('wrapText="1"');
  });
});

describe("long text wraps — in a table, in a key-value row, in a header", () => {
  const cols = [
    { key: "d", label: LONG_HEAD, wMm: 40, align: "start" as const },
    { key: "e", label: "Cumulative quantity executed to the end of the previous certificate", wMm: 40, align: "start" as const },
    { key: "n", label: "الكمية", wMm: 30, align: "end" as const, num: { dp: 2 } },
  ];
  const table: DocBlock = {
    k: "table", id: "t", caption: LONG_MIX, grid: true, cols,
    rows: [
      { cells: { d: LONG_AR, e: LONG_MIX, n: 1234.5 } },
      { cells: { d: LONG_MIX, e: LONG_AR, n: 8 } },
      { kind: "total", cells: { d: "الإجمالي العام لجميع البنود المنفذة", n: 1242.5 } },
    ],
  };
  const kv: DocBlock = { k: "kv", cols: 2, rows: [{ label: "بيان الأعمال", value: LONG_AR, wide: true }, { label: "Scope of works", value: LONG_MIX }, { label: "ملاحظات الاستشاري المعتمدة على الملف", value: LONG_AR }] };
  for (const lang of ["ar", "en"] as const) {
    it(`every word of every header, cell, key-value row and caption is on the page (${lang})`, () => {
      const out = printed(spec([kv, table], lang));
      const lost: string[] = [];
      for (const t of [LONG_HEAD, "Cumulative quantity executed to the end of the previous certificate", LONG_AR, LONG_MIX, "الإجمالي العام لجميع البنود المنفذة"]) for (const w of words(t)) if (!out.includes(w)) lost.push(w);
      expect([...new Set(lost)]).toEqual([]);
    });
  }
  it("a taller row simply takes more room: the page count grows instead of the text being cut", () => {
    const one = docLayout(spec([{ ...table, rows: [table.rows[0]] } as DocBlock]), fixedMeasurer).pages.length;
    const many = docLayout(spec([{ ...table, rows: Array.from({ length: 40 }, () => table.rows[0]) } as DocBlock]), fixedMeasurer).pages.length;
    expect(many).toBeGreaterThan(one);
  });
  it("even an extreme header or key-value text (three times the longest) is whole on the page", () => {
    const huge = `${LONG_HEAD} ${LONG_MIX} ${LONG_AR}`;
    const s = spec([
      { k: "kv", cols: 2, rows: [{ label: huge, value: `${LONG_AR} ${LONG_AR} ${LONG_AR} ${LONG_MIX} ${LONG_MIX}`, wide: true }, { label: "Scope", value: `${LONG_AR} ${LONG_MIX} ${LONG_AR} ${LONG_MIX}` }] },
      { k: "table", id: "h", caption: "", grid: true, cols: [{ key: "a", label: huge, wMm: 30, align: "start" }, { key: "b", label: "x", wMm: 30, align: "start" }], rows: [{ cells: { a: "1", b: "2" } }] },
    ]);
    const out = printed(s);
    const lost = [...new Set([...words(huge), ...words(LONG_AR), ...words(LONG_MIX)].filter((w) => !out.includes(w)))];
    expect(lost).toEqual([]);
  });
  it("a word longer than its column breaks inside the column, never past it", () => {
    const s = spec([{ k: "table", id: "w", caption: "", cols: [{ key: "a", label: "Ref", wMm: 20, align: "start" }], rows: [{ cells: { a: "A".repeat(90) } }] }]);
    const out = printed(s);
    expect(out.replace(/\s/g, "").includes("A".repeat(90))).toBe(true);
    expect(docLayout(s, fixedMeasurer).warnings).toEqual([]);
  });
});
