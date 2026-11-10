// The export triad on EVERY document tool, with the engineer's additions (custom parameters, custom rows, waste %):
// the A4 PDF layout carries the issuer's title block and the additions, the Word copy carries them as editable text, and the
// Excel workbook carries them with a live formula whose cached value equals the engine's figure.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { TOOL_MODULES } from "../src/features/tools/module";
import { TOOL_REGISTRY } from "../src/tools/registry";
import { docLayout } from "../src/doc/layout";
import { specDocx } from "../src/doc/docx";
import { evalFormula, specXlsx, workbookXlsx } from "../src/doc/xlsx";
import { extraBlocks, extraCalc, extraSheet, hasExtra, round2, withExtra, type DocExtra } from "../src/domain/tools/extra";
import { mergeDoc } from "../src/data/tool-docs";
import { tradeMasonry, UNIT_PRESETS } from "../src/domain/tools/trade-calc";

const fixed = { width: (t: string, f: any) => t.length * f.pt * 0.18, ascent: (f: any) => f.pt * 0.28, descent: (f: any) => f.pt * 0.08 };

const EXTRA: DocExtra = {
  params: [
    { label: "إجهاد التربة", value: "1.5", unit: "kg/cm²" },
    { label: "ملاحظة الموقع", value: "حسب تعليمات الاستشاري", unit: "" },
    { label: "", value: "", unit: "" },
  ],
  rows: [
    { desc: "أسمنت بورتلاندي", qty: "120", unit: "شكارة", waste: "5", note: "توريد أسبوعي" },
    { desc: "رمل", qty: "٣٣٫٣٣", unit: "m³", waste: "12.5", note: "" },
    { desc: "بند بلا هالك", qty: "7", unit: "عدد", waste: "", note: "" },
    { desc: "", qty: "", unit: "", waste: "", note: "" },
  ],
};
const PROJECT: any = {
  code: "TWR", name: "برج النيل", client: { name: "شركة المالك" }, consultant: { name: "المكتب الاستشاري" }, contractor: { name: "المقاول العام" },
  issuerRole: "contractor", location: { site: "العاصمة الإدارية" }, contractNo: "CON-1", signatories: [], at: 1,
};
const docOf = (mod: any, extra?: DocExtra) => {
  const body = mod.blank();
  return {
    id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body), dateIso: "2026-11-10",
    docNo: "TWR-X-0001", rev: "00", status: "issued", body, extra, profile: mod.profile, photos: {}, log: [],
  } as any;
};

function sheetsOf(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  return Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).map((n) => {
    const xml = strFromU8(files[n]);
    const values = new Map<string, number>();
    const formulas: { ref: string; f: string; v: number }[] = [];
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const body = m[2] || "";
      const v = /<v>([^<]*)<\/v>/.exec(body);
      const f = /<f>([^<]*)<\/f>/.exec(body);
      if (v && v[1] !== "" && Number.isFinite(Number(v[1]))) values.set(m[1], Number(v[1]));
      if (f) formulas.push({ ref: m[1], f: f[1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<"), v: Number(v ? v[1] : NaN) });
    }
    return { name: n, values, formulas };
  });
}

describe("the engineer's additions (pure)", () => {
  it("order = quantity × (1 + waste %), blank lines dropped, Arabic digits read", () => {
    const c = extraCalc(EXTRA);
    expect(c.params).toHaveLength(2);
    expect(c.rows.map((r) => r.order)).toEqual([126, 37.5, 7]);
    expect(c.rows[1].qty).toBeCloseTo(33.33, 6);
    expect(round2(1.005)).toBe(1.01);
    expect(hasExtra(undefined)).toBe(false);
    expect(hasExtra({ params: [{ label: "", value: " ", unit: "x" }], rows: [] })).toBe(false);
    expect(extraBlocks(undefined)).toEqual([]);
    expect(extraSheet({ params: [], rows: [] })).toBeNull();
  });
  it("a negative waste is never applied", () => {
    expect(extraCalc({ params: [], rows: [{ desc: "x", qty: "10", unit: "", waste: "-5", note: "" }] }).rows[0].order).toBe(10);
  });
  it("two devices that differ only in the additions are a real conflict, never a silent overwrite", () => {
    const base: any = { ...docOf({ kind: "k", v: 1, blank: () => ({}), defaultTitle: () => "t", profile: {} }), status: "draft" };
    const out = mergeDoc({ ...base, at: 5, extra: EXTRA }, { ...base, at: 6 }, 2, null, () => "dcopy");
    expect(out.copy?.id).toBe("dcopy");
    expect(out.copy?.extra).toEqual(EXTRA);
  });
});

describe("the triad on every document tool", () => {
  it("every tool document in the registry has a module", () => {
    const kinds = TOOL_REGISTRY.flatMap((t) => t.docKinds || []).filter((k) => k !== "inspection");
    expect(kinds.sort()).toEqual(Object.keys(TOOL_MODULES).sort());
  });

  for (const kind of Object.keys(TOOL_MODULES)) {
    it(`${kind}: PDF with title block · Word · Excel, with the additions in all three`, async () => {
      const mod = await TOOL_MODULES[kind]();
      const doc = docOf(mod, EXTRA);
      const plain = mod.build(docOf(mod), PROJECT);
      const spec = withExtra(mod.build(doc, PROJECT), doc.extra);

      // the additions sit before the tail (basis / disclaimer / signatures) of the last section
      const last = spec.sections[spec.sections.length - 1].blocks;
      const at = last.findIndex((b) => b.k === "table" && b.id === "extra");
      expect(at).toBeGreaterThan(-1);
      expect(last.findIndex((b) => b.k === "signatures")).toBeGreaterThan(at);
      expect(last.length).toBe(plain.sections[plain.sections.length - 1].blocks.length + 3);

      // PDF: A4 pages, the issuer's title block (every party), the additions
      const { pages } = docLayout(spec, fixed);
      expect(pages.length).toBeGreaterThan(0);
      const text = pages.flatMap((p) => p.ops).map((o: any) => (o.op === "text" ? o.text : "")).join("\n");
      for (const s of ["شركة المالك", "المكتب الاستشاري", "المقاول العام", "TWR-X-0001", "إضافات المهندس", "أسمنت بورتلاندي", "إجهاد التربة"]) {
        expect(text, s).toContain(s);
      }
      expect(spec.title.parties.find((p) => p.issuer)?.name).toBe("المقاول العام");

      // Word: a real .docx with the additions as text
      const word = unzipSync(specDocx(spec, new Date("2026-11-10T00:00:00Z")));
      const xml = strFromU8(word["word/document.xml"]);
      for (const s of ["بنود إضافية", "أسمنت بورتلاندي", "إجهاد التربة", "المقاول العام"]) expect(xml, s).toContain(s);

      // Excel: every formula re-evaluates to its cached value; the additions' order quantities are live formulas
      const more = extraSheet(doc.extra)!;
      const wb = mod.workbook ? mod.workbook(doc, PROJECT) : null;
      const bytes = wb ? workbookXlsx({ ...wb, sheets: [...wb.sheets, more] }) : specXlsx(spec);
      let orders: number[] = [];
      for (const s of sheetsOf(bytes)) {
        for (const x of s.formulas) {
          const got = evalFormula(x.f, (r) => s.values.get(r) ?? null);
          expect(got, `${s.name} ${x.ref} = ${x.f}`).not.toBeNull();
          expect(Math.abs((got as number) - x.v), `${s.name} ${x.ref} = ${x.f}`).toBeLessThan(1e-6);
        }
        const mine = s.formulas.filter((x) => /^ROUND\([A-Z]+\d+\*\(1\+[A-Z]+\d+\/100\),2\)$/.test(x.f)).map((x) => x.v);
        if (mine.length === 3) orders = mine;
      }
      expect(orders).toEqual([126, 37.5, 7]);
    });
  }
});

describe("trade kit: the site's own waste figures", () => {
  it("a higher unit or mortar waste orders more; the old fixed figures are now only defaults", () => {
    const p = UNIT_PRESETS[0];
    const a = tradeMasonry({ unit: p.u, areaM2: 20, leaves: 0.5, jointCm: 1, unitWastePct: p.waste, mortarKgM3: 250, mortarWastePct: 25 });
    const b = tradeMasonry({ unit: p.u, areaM2: 20, leaves: 0.5, jointCm: 1, unitWastePct: 12, mortarKgM3: 250, mortarWastePct: 40 });
    expect(b.units).toBeGreaterThan(a.units);
    expect(b.sandM3).toBeGreaterThan(a.sandM3);
  });
});
