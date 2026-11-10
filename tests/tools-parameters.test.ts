// v0.39: nothing a calculation uses is fixed — the grade, the site mix, the bag, the wastes, the joint, the VAT rate, lines
// added to a certificate, a steel the list does not name. And the other half of the promise: a document saved before these
// fields existed computes exactly what it did (every default is the constant it replaces).
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { module as concrete, boxOf, concTuned, mixOf } from "../src/features/tools/concrete/concrete";
import { module as bbs, BBS_CUSTOM } from "../src/features/tools/rebar/bbs";
import { module as trade } from "../src/features/tools/trade/trade";
import { module as ipc } from "../src/features/tools/office/ipc";
import { CONC_PROFILE, concMaterials, concTakeoff } from "../src/domain/tools/concrete-calc";
import { UNIT_PRESETS, tradeDrywall, tradeElectric, tradeFormwork, tradeMasonry, tradePaint, tradePlaster, tradePlumbing, tradeRoomArea, tradeTiles, PLASTER_PRESETS } from "../src/domain/tools/trade-calc";
import { computeIpc, type IpcItem, type IpcTerms } from "../src/domain/tools/ipc-calc";
import { evalFormula, workbookXlsx } from "../src/doc/xlsx";
import { ResultHero } from "../src/ui/kit";
import type { DocBlock, DocSpec } from "../src/doc/model";
import type { ToolDoc } from "../src/data/tool-docs";
import type { ToolModule } from "../src/features/tools/module";

const docOf = <B,>(mod: ToolModule<B>, body: B): ToolDoc<B> => ({
  id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body), dateIso: "2026-11-10",
  docNo: null, rev: "00", status: "draft", body, profile: mod.profile, photos: {}, log: [],
});
const blocks = (s: DocSpec): DocBlock[] => s.sections.flatMap((x) => x.blocks);
const table = (s: DocSpec, id: string) => blocks(s).find((b): b is Extract<DocBlock, { k: "table" }> => b.k === "table" && b.id === id)!;
const kv = (s: DocSpec, label: string) => {
  for (const b of blocks(s)) if (b.k === "kv") for (const r of b.rows) if (r.label === label) return typeof r.value === "string" ? r.value : r.value.spans.map((x) => x.t).join("");
  return undefined;
};
const basis = (s: DocSpec, key: string) => blocks(s).flatMap((b) => (b.k === "basis" ? b.rows : [])).find((r) => r.key === key)!;
// the hero figure a screen shows (stub React: the editor is a plain function, the hero an element with its props)
type El = { $el: true; type: unknown; props: Record<string, unknown> };
const isEl = (x: unknown): x is El => !!x && typeof x === "object" && (x as El).$el === true;
function hero(node: unknown): El | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const h = hero(n);
      if (h) return h;
    }
    return null;
  }
  if (!isEl(node)) return null;
  if (node.type === ResultHero) return node;
  return hero(node.props.children);
}

describe("every tool's document fits its page", () => {
  it("no table is wider than the text block (a wider one is scaled down on the sheet and its text shrinks)", async () => {
    const { TOOL_MODULES } = await import("../src/features/tools/module");
    const { docLayout, fixedMeasurer } = await import("../src/doc/layout");
    for (const kind of Object.keys(TOOL_MODULES)) {
      const mod = await TOOL_MODULES[kind]();
      const warnings = docLayout(mod.build(docOf(mod, mod.blank()), null), fixedMeasurer).warnings;
      expect(warnings.filter((w) => /scaled/.test(w)), kind).toEqual([]);
    }
  });
});

describe("concrete: the grade is whatever the specification calls it", () => {
  type B = ReturnType<typeof concrete.blank> & Record<string, unknown>;
  const body = (o: Record<string, unknown> = {}): B => ({
    ...(concrete.blank() as B), scope: "takeoff", siteMixed: true,
    rows: [{ kind: "slab", label: "S1", n: "1", dims: { L: "6", B: "4", t: "0.15", open: "" }, waste: "" }, { kind: "blinding", label: "PC", n: "1", dims: { L: "3", B: "3", t: "0.1" }, waste: "" }],
    ...o,
  });
  it("prints a grade outside the six common ones exactly as typed", () => {
    const s = concrete.build(docOf(concrete, body({ scope: "pour", grade: "C45/55 SRC" })), null);
    expect(kv(s, "الرتبة")).toContain("C45/55 SRC");
    expect(concrete.summary(docOf(concrete, body({ scope: "pour", grade: "C45/55 SRC" })))).toContain("C45/55 SRC");
  });
  it("defaults are the profile's own figures: a document without the new fields computes what it always did", () => {
    const old = body();
    delete (old as Record<string, unknown>).mix;
    const mats = table(concrete.build(docOf(concrete, old), null), "mats").rows.map((r) => r.cells);
    const take = concTakeoff([
      { id: "1", kind: "slab", label: "S1", n: 1, dims: { L: 6, B: 4, t: 0.15, open: null } },
      { id: "2", kind: "blinding", label: "PC", n: 1, dims: { L: 3, B: 3, t: 0.1 } },
    ]);
    const rc = concMaterials(take.rows[0].orderM3 * 1.04, CONC_PROFILE.mixes.rc);
    const lean = concMaterials(take.rows[1].orderM3 * 1.04, CONC_PROFILE.mixes.lean);
    const row = (name: string) => mats.find((c) => c.mix === name)!;
    expect(row(CONC_PROFILE.mixes.rc.name)).toMatchObject({ bags: rc.bags, sand: rc.sandM3, grav: rc.gravelM3, water: rc.waterM3 });
    expect(row(CONC_PROFILE.mixes.lean.name)).toMatchObject({ bags: lean.bags, sand: lean.sandM3 });
    expect(concTuned(old as never)).toBe(0);
    expect(mixOf({}, "rc")).toBe(CONC_PROFILE.mixes.rc);
    expect(mixOf({ mix: { rc: { c: "", s: " ", g: "", w: "" } } }, "rc")).toEqual(CONC_PROFILE.mixes.rc);
  });
  it("the site's own mix, bag and allowance replace them — only the figures typed, the rest stay", () => {
    const b = body({ mix: { rc: { c: "400", s: "", g: "0.75", w: "" } }, bagKg: "25", siteExtra: "6" });
    expect(mixOf(b as never, "rc")).toEqual({ ...CONC_PROFILE.mixes.rc, cementKg: 400, gravelM3: 0.75 });
    expect(mixOf(b as never, "lean")).toEqual(CONC_PROFILE.mixes.lean);
    const s = concrete.build(docOf(concrete, b), null);
    const mats = table(s, "mats");
    const rc = mats.rows.map((r) => r.cells).find((c) => c.mix === CONC_PROFILE.mixes.rc.name)!;
    const order = 6 * 4 * 0.15 * 1.02 * 1.06;
    expect(rc.v as number).toBeCloseTo(order, 6);
    expect(rc.bags).toBe(Math.ceil((order * 400) / 25 - 1e-9));
    expect(rc.sand as number).toBeCloseTo(order * 0.4, 6);
    expect(rc.grav as number).toBeCloseTo(order * 0.75, 6);
    expect(mats.caption).toContain("+6 %");
    expect(mats.cols.find((c) => c.key === "bags")!.unit).toBe("شكارة 25 كجم");
    expect(concTuned(b as never)).toBe(4);
    // the basis says whose figures these are: the engineer's, not a flagged default
    expect(basis(s, "mix.rc")).toMatchObject({ value: "400 kg · 0.4 · 0.75", flagged: false });
    expect(basis(concrete.build(docOf(concrete, body()), null), "mix.rc")).toMatchObject({ value: "350 kg · 0.4 · 0.8", flagged: true });
  });
  it("nonsense in an advanced field falls back to the default instead of breaking the document", () => {
    const b = body({ mix: { rc: { c: "abc", s: "", g: "", w: "" } }, bagKg: "0", siteExtra: "-5" });
    expect(mixOf(b as never, "rc")).toEqual(CONC_PROFILE.mixes.rc);
    const rc = table(concrete.build(docOf(concrete, b), null), "mats").rows[0].cells;
    expect(Number.isFinite(rc.bags as number)).toBe(true);
    // a negative allowance is not a number here: the default 4 % stays
    expect(rc.v as number).toBeCloseTo(6 * 4 * 0.15 * 1.02 * 1.04, 6);
  });
  it("box-shaped elements give the sketch their three dimensions; other shapes give none", () => {
    expect(boxOf("slab", { L: "6", B: "4", t: "0.15" })).toEqual({ L: 6, B: 4, H: 0.15 });
    expect(boxOf("column", { a: "0.3", b: "0.6", hFF: "3.2", ts: "0.15" })).toEqual({ L: 0.6, B: 0.3, H: 3.05 });
    expect(boxOf("wall", { L: "5", t: "0.25", H: "3" })).toEqual({ L: 5, B: 0.25, H: 3 });
    expect(boxOf("beam", { b: "0.25", h: "0.6", ts: "0.15", L: "4.5" })).toEqual({ L: 4.5, B: 0.25, H: 0.6 });
    expect(boxOf("footing", { L: "٢", B: "1.5", H: "0.5" })).toEqual({ L: 2, B: 1.5, H: 0.5 });
    expect(boxOf("slab", {})).toEqual({ L: 0, B: 0, H: 0 });
    for (const k of ["stair", "hourdi", "columnRound", "raft", "footingSloped"] as const) expect(boxOf(k, {})).toBeNull();
  });
});

describe("rebar: a steel the list does not name", () => {
  type B = ReturnType<typeof bbs.blank> & Record<string, unknown>;
  const body = (o: Record<string, unknown>): B => ({
    ...(bbs.blank() as B),
    lines: [{ member: "B1", mark: "01", d: 16, shape: "00", dims: { A: "5000" }, segs: [], nMembers: "1", nPer: "4", pos: "top", lap: "auto", lapMm: "" }],
    ...o,
  });
  const ld = (b: B) => basis(bbs.build(docOf(bbs, b), null), "ld").value;
  it("a custom yield strength drives the development length like a listed grade of the same fy", () => {
    expect(ld(body({ grade: BBS_CUSTOM, fyCustom: "500" }))).toBe(ld(body({ grade: "B500DWR" })));
    expect(ld(body({ grade: BBS_CUSTOM, fyCustom: "400" }))).toBe(ld(body({ grade: "B400DWR" })));
    expect(ld(body({ grade: BBS_CUSTOM, fyCustom: "600" }))).not.toBe(ld(body({ grade: "B500DWR" })));
  });
  it("prints the figure, and assumes 400 MPa until one is typed", () => {
    expect(kv(bbs.build(docOf(bbs, body({ grade: BBS_CUSTOM, fyCustom: "550" })), null), "رتبة الحديد")).toContain("fy 550 MPa");
    expect(kv(bbs.build(docOf(bbs, body({ grade: BBS_CUSTOM })), null), "رتبة الحديد")).toContain("fy 400 MPa");
    expect(kv(bbs.build(docOf(bbs, body({ grade: "B500DWR" })), null), "رتبة الحديد")).toContain("B500DWR · fy 500 MPa");
  });
});

describe("trade kit: every constant is a field, and every default is the constant it replaced", () => {
  type B = ReturnType<typeof trade.blank>;
  const run = (mode: string, inputs: Record<string, string>) => {
    const b = { ...(trade.blank() as B), mode, inputs: { [mode]: inputs } } as B;
    const h = hero(trade.Editor({ body: b, set: () => {}, ctx: { app: {}, project: null, role: "engineer", readOnly: false } }))!;
    return h.props as { value: string; unit: string; sub: string };
  };
  it("masonry: joint 1 cm, the brick's own waste and 25 % mortar waste unless changed", () => {
    const red = UNIT_PRESETS[0];
    const base = tradeMasonry({ unit: red.u, areaM2: 30, leaves: 0.5, jointCm: 1, unitWastePct: red.waste, mortarKgM3: 250, mortarWastePct: 25 });
    expect(run("masonry", { unit: "red", leaves: "0.5", L: "10", H: "3", open: "0", mix: "250" }).value).toBe(String(base.units));
    const tuned = tradeMasonry({ unit: red.u, areaM2: 30, leaves: 0.5, jointCm: 1.5, unitWastePct: 8, mortarKgM3: 250, mortarWastePct: 30 });
    const got = run("masonry", { unit: "red", leaves: "0.5", L: "10", H: "3", open: "0", mix: "250", joint: "1.5", uw: "8", mw: "30", bag: "50" });
    expect(got.value).toBe(String(tuned.units));
    expect(got.sub).toContain("هالك 8 %");
    expect(tuned.units).not.toBe(base.units);
  });
  it("plaster: the backing coat's own thickness and mix", () => {
    const layers = PLASTER_PRESETS.internal.layers;
    const base = tradePlaster({ areaM2: 100, layers, wastePct: 20 });
    expect(run("plaster", { area: "100", preset: "internal", waste: "20" }).value).toBe(String(base.cementBags));
    const thick = tradePlaster({ areaM2: 100, layers: [layers[0], { tMm: 30, cementKgM3: 350 }], wastePct: 20 });
    expect(run("plaster", { area: "100", preset: "internal", waste: "20", t: "30", c: "350", bag: "" }).value).toBe(String(thick.cementBags));
    expect(thick.cementBags).toBeGreaterThan(base.cementBags);
  });
  it("tiles · paint · formwork · electric · plumbing · drywall: old constants by default, the site's figures when typed", () => {
    expect(run("tiles", { area: "20", a: "600", b: "600", j: "2", w: "10", box: "1.44" }).value).toBe(String(tradeTiles({ areaM2: 20, aMm: 600, bMm: 600, jointMm: 2, wastePct: 10, boxM2: 1.44, depthMm: 9 }).tiles));
    const area = tradeRoomArea({ l: 4, w: 3, h: 3, openingsM2: 2, ceiling: true }).areaM2;
    const paint = { l: "4", w: "3", h: "3", open: "2", ceil: "yes", coats: "2", spread: "10", pack: "3.6" };
    expect(run("paint", paint).value).toBe(String(tradePaint({ areaM2: area, coats: 2, spreadM2L: 10, practical: 1, wastePct: 10, packL: 3.6 }).packs));
    expect(run("paint", { ...paint, pw: "15", prac: "0.8" }).value).toBe(String(tradePaint({ areaM2: area, coats: 2, spreadM2L: 10, practical: 0.8, wastePct: 15, packL: 3.6 }).packs));
    const fw = { kind: "slab", a: "6", b: "4", h: "", n: "1", w: "10" };
    expect(run("formwork", fw).value).toBe(String(tradeFormwork({ contactM2: 24, wastePct: 10 }).sheets));
    const small = run("formwork", { ...fw, sl: "2", sw: "1" });
    expect(small.value).toBe(String(tradeFormwork({ contactM2: 24, wastePct: 10, sheetM2: 2 }).sheets));
    expect(small.unit).toContain("1.00×2.00");
    expect(run("electric", { rooms: "3", pts: "8", runs: "100" }).value).toBe("110");
    expect(run("electric", { rooms: "3", pts: "8", runs: "100", extra: "15" }).value).toBe(String(Math.round(tradeElectric({ rooms: 3, pointsPerRoom: 8, runsM: 100, extraPct: 15 }).wireM)));
    expect(run("plumbing", { runs: "7.5 + 12", len: "4" }).sub).toContain(`${tradePlumbing({ runsM: [7.5, 12], lengthM: 4 }).fittings} وصلة`);
    expect(run("plumbing", { runs: "7.5 + 12", len: "4", per: "1" }).sub).toContain(`${tradePlumbing({ runsM: [7.5, 12], lengthM: 4, perFittingM: 1 }).fittings} وصلة`);
    const dw = { L: "6", H: "3", sides: "2", w: "10" };
    expect(run("drywall", dw).value).toBe(String(tradeDrywall({ lengthM: 6, heightM: 3, sides: 2, layers: 1, wastePct: 10 }).boards));
    const dbl = run("drywall", { ...dw, layers: "2", stud: "40" });
    expect(dbl.value).toBe(String(tradeDrywall({ lengthM: 6, heightM: 3, sides: 2, layers: 2, wastePct: 10, studAtM: 0.4 }).boards));
    expect(dbl.sub).toContain(`${tradeDrywall({ lengthM: 6, heightM: 3, sides: 2, layers: 2, wastePct: 10, studAtM: 0.4 }).studs} قائم`);
  });
  it("a blank or absurd advanced field never divides by zero", () => {
    for (const v of [run("plumbing", { runs: "10", len: "4", per: "0" }), run("drywall", { L: "6", H: "3", sides: "2", w: "10", stud: "0", layers: "0" }), run("formwork", { kind: "slab", a: "6", b: "4", h: "", n: "1", w: "10", sl: "0", sw: "" })]) {
      expect(v.value).toMatch(/^\d+$/);
    }
  });
});

describe("payment certificate: the contract's own VAT rate, and lines added to it", () => {
  const items: IpcItem[] = [{ id: "1", ref: "1.1", desc: "خرسانة", unit: "م³", qtyContract: 1000, rate: 4000, qtyPrev: 200, qtyCur: 100 }];
  const terms = (o: Partial<IpcTerms> = {}): IpcTerms => ({
    contractAmount: 4_000_000, retentionPct: 5, retentionLimitPct: null, advanceAmount: 0, advanceMethod: "proportional", fidicStartPct: 10, fidicRatePct: 25,
    advanceRecoveredPrev: 0, vatPct: 14, vatOn: "gross", deductions: [], ...o,
  });
  it("any VAT rate, not only 14 · 5 · 0", () => {
    const r = computeIpc(items, terms({ vatPct: 8 }));
    expect(r.s.vat.cur).toBe(32000);
    expect(r.s.payable.cur).toBe(400000 - 20000 + 32000);
  });
  it("an added line raises what is paid; a deducted one lowers it; both keep previous · current · total", () => {
    const base = computeIpc(items, terms()).s.payable;
    const r = computeIpc(items, terms({ deductions: [
      { id: "m", name: "تشوينات", mode: "fixed", pct: 0, prev: 50000, cur: 30000, add: true },
      { id: "w", name: "خصم من المنبع", mode: "pct", pct: 1, prev: 0, cur: 0 },
    ] }));
    expect(r.s.deductions.map((d) => [d.name, !!d.add, d.t.prev, d.t.cur, d.t.total])).toEqual([["تشوينات", true, 50000, 30000, 80000], ["خصم من المنبع", false, 8000, 4000, 12000]]);
    expect(r.s.payable.cur).toBe(base.cur + 30000 - 4000);
    expect(r.s.payable.total).toBe(base.total + 80000 - 12000);
    expect(r.trace[r.trace.length - 1].expr).toContain("+ 26,000.00");
  });
  it("materials on site recovered later: a negative amount in the period", () => {
    const r = computeIpc(items, terms({ deductions: [{ id: "m", name: "تشوينات", mode: "fixed", pct: 0, prev: 80000, cur: -80000, add: true }] }));
    expect(r.s.deductions[0].t).toEqual({ prev: 80000, cur: -80000, total: 0 });
    expect(r.s.payable.cur).toBe(computeIpc(items, terms()).s.payable.cur - 80000);
  });
  it("a certificate without added lines computes exactly as before (the flag is simply absent)", () => {
    const d = { id: "w", name: "x", mode: "pct" as const, pct: 2, prev: 0, cur: 0 };
    expect(computeIpc(items, terms({ deductions: [d] })).s).toEqual(computeIpc(items, terms({ deductions: [{ ...d, add: false }] })).s);
    expect("add" in computeIpc(items, terms({ deductions: [d] })).s.deductions[0]).toBe(false);
  });
  it("the screen's document and the live Excel sheet agree with the engine — signs included", () => {
    const body = {
      ...(ipc.blank() as Record<string, unknown>), contract: "4000000", ret: "5", vat: "8",
      items: [{ id: "1", section: "", ref: "1.1", desc: "خرسانة", unit: "م³", qc: "1000", rate: "4000", qp: "200", qq: "100" }],
      deductions: [
        { id: "m", name: "تشوينات", mode: "fixed", pct: "", prev: "50000", cur: "30000", add: true },
        { id: "w", name: "خصم من المنبع", mode: "pct", pct: "1", prev: "0", cur: "" },
      ],
    } as ReturnType<typeof ipc.blank>;
    const engine = computeIpc(items, terms({ vatPct: 8, deductions: [
      { id: "m", name: "تشوينات", mode: "fixed", pct: 0, prev: 50000, cur: 30000, add: true },
      { id: "w", name: "خصم من المنبع", mode: "pct", pct: 1, prev: 0, cur: 0 },
    ] }));
    const doc = docOf(ipc, body);
    const sum = table(ipc.build(doc, null), "summary").rows.map((r) => r.cells);
    expect(sum.map((c) => c.l)).toEqual(expect.arrayContaining(["يُضاف: تشوينات", "يُخصم: خصم من المنبع"]));
    expect(sum[sum.length - 1]).toMatchObject({ p: engine.s.payable.prev, c: engine.s.payable.cur, t: engine.s.payable.total });
    const xml = strFromU8(unzipSync(workbookXlsx(ipc.workbook!(doc, null)))["xl/worksheets/sheet1.xml"]);
    const values = new Map<string, number>();
    const formulas: { ref: string; f: string; v: number }[] = [];
    const texts = new Map<string, string>();
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const inner = m[2] || "";
      const v = /<v>([^<]*)<\/v>/.exec(inner);
      const f = /<f>([^<]*)<\/f>/.exec(inner);
      const t = /<t[^>]*>([^<]*)<\/t>/.exec(inner);
      if (v) values.set(m[1], Number(v[1]));
      if (t) texts.set(m[1], t[1]);
      if (f) formulas.push({ ref: m[1], f: f[1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<"), v: Number(v ? v[1] : NaN) });
    }
    for (const x of formulas) expect(Math.abs((evalFormula(x.f, (r) => values.get(r) ?? null) as number) - x.v), `${x.ref} = ${x.f}`).toBeLessThan(1e-6);
    const rowOf = (label: string) => [...texts].find(([r, t]) => r.startsWith("A") && t.startsWith(label))![0].slice(1);
    const pay = rowOf("صافي المستحق");
    expect(values.get(`E${pay}`)).toBeCloseTo(engine.s.payable.total, 6);
    expect(values.get(`D${pay}`)).toBeCloseTo(engine.s.payable.cur, 6);
    const payF = formulas.find((x) => x.ref === `E${pay}`)!.f;
    expect(payF).toContain(`+E${rowOf("يُضاف: تشوينات")}`);
    expect(payF).toContain(`-E${rowOf("يُخصم: خصم من المنبع")}`);
  });
});
