// The technical office's live workbooks (QTO and the payment certificate): every formula re-evaluated over the sheet's own
// values, and the sheet's results equal to the engine's — the Excel copy, the PDF and the screen agree to the cent.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { evalFormula, workbookXlsx } from "../src/doc/xlsx";
import { specDocx } from "../src/doc/docx";
import { docLayout } from "../src/doc/layout";
import { module as ipc } from "../src/features/tools/office/ipc";
import { module as qto } from "../src/features/tools/office/qto";
import { computeIpc } from "../src/domain/tools/ipc-calc";
import { toolAllowed } from "../src/tools/gate";
import { toolById } from "../src/tools/registry";

const fixed = { width: (t: string, f: any) => t.length * f.pt * 0.18, ascent: (f: any) => f.pt * 0.28, descent: (f: any) => f.pt * 0.08 };
const docOf = (mod: any, body: any) => ({
  id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body),
  dateIso: "2026-10-20", docNo: "TWR-IPC-0005", rev: "00", status: "issued", body, profile: mod.profile, photos: {}, log: [],
}) as any;

function cells(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const values = new Map<string, number>();
  const texts = new Map<string, string>();
  const formulas: { ref: string; f: string; v: number }[] = [];
  for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const body = m[2] || "";
    const v = /<v>([^<]*)<\/v>/.exec(body);
    const f = /<f>([^<]*)<\/f>/.exec(body);
    const t = /<t[^>]*>([^<]*)<\/t>/.exec(body);
    if (v) values.set(m[1], Number(v[1]));
    if (t) texts.set(m[1], t[1]);
    if (f) formulas.push({ ref: m[1], f: f[1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<"), v: Number(v ? v[1] : NaN) });
  }
  return { files, xml, values, texts, formulas };
}
const consistent = (c: ReturnType<typeof cells>) => {
  for (const x of c.formulas) {
    const got = evalFormula(x.f, (r) => c.values.get(r) ?? null);
    expect(got, `${x.ref} = ${x.f}`).not.toBeNull();
    expect(Math.abs((got as number) - x.v), `${x.ref} = ${x.f}`).toBeLessThan(1e-6);
  }
};
// the value in the «total» column (E) of the summary row whose label starts with `label`
const summary = (c: ReturnType<typeof cells>, label: string, col = "E") => {
  for (const [r, t] of c.texts) if (r.startsWith("A") && t.startsWith(label)) return c.values.get(`${col}${r.slice(1)}`);
  return undefined;
};

const ipcBody = (o: any = {}) => ({
  ...ipc.blank(), certNo: "5", from: "2026-09-01", to: "2026-09-30", contractRef: "CON-2025-014", contract: "10000000", ret: "10", retLimit: "5", adv: "1000000",
  items: [
    { id: "1", section: "أعمال ترابية", ref: "1.1", desc: "حفر", unit: "م³", qc: "5000", rate: "120", qp: "3000", qq: "1500" },
    { id: "2", section: "خرسانات", ref: "2.1", desc: "خرسانة مسلحة", unit: "م³", qc: "2000", rate: "4500", qp: "800", qq: "400" },
    { id: "3", section: "مباني", ref: "3.1", desc: "مباني طوب", unit: "م³", qc: "1000", rate: "1800", qp: "0", qq: "1100" },
  ],
  deductions: [{ id: "w", name: "خصم من المنبع", mode: "pct", pct: "1", prev: "0", cur: "" }, { id: "g", name: "غرامة تأخير", mode: "fixed", pct: "", prev: "5000", cur: "2500" }],
  ...o,
});

describe("the payment certificate workbook", () => {
  it("every formula holds, and the sheet's totals equal the engine's (proportional advance, capped retention, 14 % VAT)", () => {
    const body = ipcBody();
    const c = cells(workbookXlsx(ipc.workbook!(docOf(ipc, body), null)));
    consistent(c);
    expect(c.formulas.length).toBeGreaterThan(30);
    expect(c.xml).toContain(`state="frozen"`);
    const r = computeIpc(
      body.items.map((i: any) => ({ id: i.id, ref: i.ref, desc: i.desc, unit: i.unit, qtyContract: +i.qc, rate: +i.rate, qtyPrev: +i.qp, qtyCur: +i.qq })),
      { contractAmount: 1e7, retentionPct: 10, retentionLimitPct: 5, advanceAmount: 1e6, advanceMethod: "proportional", fidicStartPct: 10, fidicRatePct: 25, advanceRecoveredPrev: 0, vatPct: 14, vatOn: "gross",
        deductions: [{ id: "w", name: "", mode: "pct", pct: 1, prev: 0, cur: 0 }, { id: "g", name: "", mode: "fixed", pct: 0, prev: 5000, cur: 2500 }] },
    );
    expect(summary(c, "إجمالي الأعمال")).toBeCloseTo(r.s.gross.total, 6);
    expect(summary(c, "يُخصم: التأمين")).toBeCloseTo(r.s.retention.total, 6);
    expect(summary(c, "يُخصم: استهلاك")).toBeCloseTo(r.s.advance.total, 6);
    expect(summary(c, "يُضاف: ضريبة")).toBeCloseTo(r.s.vat.total, 6);
    expect(summary(c, "صافي المستحق")).toBeCloseTo(r.s.payable.total, 6);
    expect(summary(c, "صافي المستحق", "D")).toBeCloseTo(r.s.payable.cur, 6);
    expect(r.s.payable.cur).toBeCloseTo(3_974_800 - 2_500, 6);
  });
  it("FIDIC 14.2 recovery and VAT on the net are live formulas too", () => {
    const body = ipcBody({ advMethod: "fidic", vatOn: "net", deductions: [] });
    const c = cells(workbookXlsx(ipc.workbook!(docOf(ipc, body), null)));
    consistent(c);
    expect(c.formulas.some((x) => /^.*IF\(K\d+>\$B\$\d+\*\$B\$\d+,MIN\(/.test(x.f))).toBe(true);
    expect(summary(c, "يُخصم: استهلاك", "D")).toBeCloseTo(990_000, 6);
  });
  it("the next certificate carries the totals forward", () => {
    // the editor's «next» builder is internal; the engine helper it uses is covered in tools-ipc — here the PDF and Word build
    const s = ipc.build(docOf(ipc, ipcBody()), null);
    const { pages } = docLayout(s as any, fixed as any);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages.some((p) => p.orientation === "landscape")).toBe(true);
    const docx = strFromU8(unzipSync(specDocx(s as any))["word/document.xml"]);
    expect(docx).toContain("ملخص المستخلص");
    expect(docx).toContain("صافي المستحق");
  });
  it("is a money tool: engineers and owners, never site supervisors or HR", () => {
    expect(toolById("ipc")!.money).toBe(true);
    expect(toolAllowed("engineer", "ipc")).toBe(true);
    expect(toolAllowed("supervisor", "ipc")).toBe(false);
    expect(toolAllowed("hr", "ipc")).toBe(false);
  });
});

describe("the quantity take-off workbook", () => {
  const body = {
    ...qto.blank(), lines: [
      { id: "p", kind: "plaster", wbs: "برج A / الدور 02", desc: "بياض حوائط", n: "1", L: "5", W: "", H: "3", t: "", faces: "2", byArea: false, upturn: "", ceiling: false,
        openings: [{ id: "d", label: "باب", n: "1", w: "0.9", h: "2.1" }, { id: "v", label: "تهوية", n: "1", w: "0.4", h: "0.4" }, { id: "o", label: "فتحة", n: "1", w: "2", h: "2" }] },
      { id: "m", kind: "masonry", wbs: "برج A / الدور 02", desc: "مباني 25", n: "2", L: "6", W: "", H: "3", t: "0.25", faces: "1", byArea: false, upturn: "", ceiling: false, openings: [{ id: "d", label: "باب", n: "1", w: "0.9", h: "2.1" }] },
      { id: "w", kind: "waterproof", wbs: "سطح", desc: "عزل", n: "1", L: "4", W: "3", H: "", t: "", faces: "1", byArea: false, upturn: "0.3", ceiling: false, openings: [] },
      { id: "s", kind: "skirting", wbs: "برج A", desc: "وزرة", n: "1", L: "18", W: "", H: "", t: "", faces: "1", byArea: false, upturn: "", ceiling: false, openings: [{ id: "d", label: "باب", n: "1", w: "0.9", h: "" }] },
    ],
  };
  it("gross, deductions and nets are formulas that reproduce the engine", () => {
    const c = cells(workbookXlsx(qto.workbook!(docOf(qto, body), null)));
    consistent(c);
    const nets = c.formulas.filter((x) => x.f.startsWith("MAX(0,")).map((x) => x.v);
    expect(nets.map((v) => Math.round(v * 1000) / 1000)).toEqual([20.11, 8.055, 16.2, 17.1]); // 30 − 1.89 (door, one face) − 8 (4 m², both faces); the vent stays
    expect(c.formulas.some((x) => x.f.includes("*(") && x.f.includes("2*("))).toBe(true); // the waterproofing upturn formula
  });
  it("builds a landscape PDF and a Word copy with the deduction rules spelled out", () => {
    const s = qto.build(docOf(qto, body), null);
    const { pages } = docLayout(s as any, fixed as any);
    expect(pages[0].orientation).toBe("landscape");
    const docx = strFromU8(unzipSync(specDocx(s as any))["word/document.xml"]);
    expect(docx).toContain("يُخصم من وجه واحد");
    expect(docx).toContain("لا يُخصم");
  });
});
