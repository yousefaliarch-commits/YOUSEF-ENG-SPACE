// W4 documents: the RC section review and the duct schedule lay out as A4 (with the working and the clauses printed), export
// Word and a live Excel whose formulas reproduce the engine, carry no app mark, and open only for the right roles.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { evalFormula, specXlsx } from "../src/doc/xlsx";
import { specDocx } from "../src/doc/docx";
import { docLayout } from "../src/doc/layout";
import { module as rc, inputOf } from "../src/features/tools/design/rc-section";
import { module as duct, calc as ductCalc } from "../src/features/tools/mep/duct";
import { checkRc } from "../src/domain/tools/rc-calc";
import { toolAllowed } from "../src/tools/gate";
import { toolById } from "../src/tools/registry";

const fixed = { width: (t: string, f: any) => t.length * f.pt * 0.18, ascent: (f: any) => f.pt * 0.28, descent: (f: any) => f.pt * 0.08 };
const docOf = (mod: any, body: any) => ({
  id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body),
  dateIso: "2026-10-31", docNo: null, rev: "00", status: "draft", body, profile: mod.profile, photos: {}, log: [],
}) as any;

const allSheets = (bytes: Uint8Array) => {
  const z = unzipSync(bytes);
  return Object.keys(z).filter((k) => k.startsWith("xl/worksheets/sheet")).map((k) => strFromU8(z[k]));
};
// every formula re-evaluated from the sheet's own cached values must give its own cached value
function formulasAgree(xml: string) {
  const values = new Map<string, number>();
  const fs: { ref: string; f: string; v: number }[] = [];
  for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const v = /<v>([^<]*)<\/v>/.exec(m[2] || "");
    const f = /<f>([^<]*)<\/f>/.exec(m[2] || "");
    if (v) values.set(m[1], Number(v[1]));
    if (f) fs.push({ ref: m[1], f: f[1], v: Number(v ? v[1] : NaN) });
  }
  for (const x of fs) expect(evalFormula(x.f, (r) => values.get(r) ?? null), `${x.ref} = ${x.f}`).toBeCloseTo(x.v, 6);
  return fs;
}

const rcBody = () => ({
  ...rc.blank(),
  members: [
    { ...rc.blank().members[0], tag: "B12", b: "300", h: "600", cover: "40", nT: "3", dT: "25", dS: "10", sS: "150", nC: "0", mu: "250", vu: "200", span: "6" },
    { ...rc.blank().members[0], tag: "B13", b: "250", h: "500", cover: "25", nT: "3", dT: "16", dS: "8", sS: "200", nC: "2", dC: "12", mu: "180", vu: "120", span: "7" },
    { ...rc.blank().members[0], tag: "S1", kind: "slab" as const, b: "1000", h: "150", cover: "20", dT: "10", sT: "200", mu: "15", vu: "30", span: "3.5" },
  ],
});

describe("RC section review — the document", () => {
  const body = rcBody();
  const s = rc.build(docOf(rc, body), null);
  it("one A4 document: the summary, then each member with its sketch, checks, notes and working", () => {
    const { pages } = docLayout(s as any, fixed as any);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    const blocks = s.sections[0].blocks;
    expect(blocks.filter((b) => b.k === "sketch")).toHaveLength(3);
    expect(blocks.filter((b) => b.k === "checks")).toHaveLength(3);
    expect(blocks.filter((b) => b.k === "table" && b.id.startsWith("trace-"))).toHaveLength(3);
  });
  it("members with findings (a failure, or the slab's span / depth warning) get the reviewer's notes; a clean one does not", () => {
    const res = body.members.map((m) => checkRc(inputOf(body, m)));
    expect(res.map((o) => o.ok)).toEqual([true, false, true]);
    expect(res.map((o) => o.advice.length > 0)).toEqual([false, true, true]);
    const notes = s.sections[0].blocks.filter((b) => b.k === "notes" && b.title === "ملاحظات المراجعة");
    expect(notes).toHaveLength(2);
  });
  it("Word carries the working with its clauses; Excel's utilisation columns are live formulas", () => {
    const docx = strFromU8(unzipSync(specDocx(s as any))["word/document.xml"]);
    expect(docx).toContain("طريقة الحساب — B12");
    expect(docx).toContain("ACI 318-19 Table 22.5.5.1(a)");
    expect(docx).not.toMatch(/EngSpace/i);
    const sheets = allSheets(specXlsx(s as any, new Date("2026-10-31T00:00:00Z")));
    const fs = sheets.flatMap(formulasAgree);
    expect(fs.some((x) => /^[A-Z]+\d+\/[A-Z]+\d+\*100$/.test(x.f))).toBe(true);
    expect(sheets.join("")).not.toMatch(/EngSpace/i);
  });
  it("under ECP 203 every check is printed with ⚑ and the verdict never says «مطابق» alone", () => {
    const e = rc.build(docOf(rc, { ...body, code: "ecp203-2020", fc: "30", fy: "360", fyt: "240" }), null);
    const checks = e.sections[0].blocks.filter((b) => b.k === "checks") as any[];
    for (const c of checks) for (const row of c.rows) expect(row.unverified).toBe(true);
    const sum = e.sections[0].blocks.find((b) => b.k === "table" && b.id === "rc") as any;
    for (const row of sum.rows) expect(String(row.cells.res)).not.toBe("مطابق");
    expect(e.title.title).toBe("مراجعة القطاعات الخرسانية");
  });
  it("is a design review: engineers and owners only — never a site supervisor or HR", () => {
    expect(toolById("rcSection")!.money).toBe(false);
    expect(toolAllowed("engineer", "rcSection")).toBe(true);
    expect(toolAllowed("owner", "rcSection")).toBe(true);
    expect(toolAllowed("supervisor", "rcSection")).toBe(false);
    expect(toolAllowed("hr", "rcSection")).toBe(false);
  });
});

describe("duct schedule — the document", () => {
  const body = {
    ...duct.blank(), unit: "cfm" as const, extra: "120",
    runs: [
      { tag: "SA-01", desc: "الرئيسي", q: "2119", len: "20", shape: "round" as const, d: "", w: "", h: "", fit: "30", index: true },
      { tag: "SA-02", desc: "فرع الدور 02", q: "1060", len: "12", shape: "rect" as const, d: "", w: "", h: "250", fit: "20", index: true },
      { tag: "SA-03", desc: "فرع المكاتب", q: "640", len: "8", shape: "rect" as const, d: "", w: "", h: "200", fit: "15", index: false },
    ],
  };
  const s = duct.build(docOf(duct, body), null);
  it("a landscape schedule; the index total = Σ index runs + other losses", () => {
    const c = ductCalc(body);
    expect(c.total).toBeCloseTo(c.runs[0].dpTotal + c.runs[1].dpTotal + 120, 9);
    const { pages } = docLayout(s as any, fixed as any);
    expect(pages[0].orientation).toBe("landscape");
  });
  it("flow typed in CFM prints in L/s; Excel's straight and total losses are formulas that reproduce the engine", () => {
    const t = s.sections[0].blocks.find((b) => b.k === "table" && b.id === "duct") as any;
    expect(t.rows[0].cells.q).toBeCloseTo(1000.06, 1);
    const fs = allSheets(specXlsx(s as any, new Date("2026-10-31T00:00:00Z"))).flatMap(formulasAgree);
    expect(fs.some((x) => /^[A-Z]+\d+\*[A-Z]+\d+$/.test(x.f))).toBe(true);
    expect(fs.some((x) => /^[A-Z]+\d+\+[A-Z]+\d+$/.test(x.f))).toBe(true);
  });
  it("is a field tool: engineers, owners and supervisors; never HR", () => {
    expect(toolAllowed("supervisor", "ductSizer")).toBe(true);
    expect(toolAllowed("hr", "ductSizer")).toBe(false);
  });
});
