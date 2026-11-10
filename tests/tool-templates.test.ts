// v0.39 firm templates: what a template keeps, what it never carries over, how it leaves the app as a file — and how a
// file from outside is treated as untrusted input before it becomes a template.
import { describe, expect, it } from "vitest";
import {
  TPL_FILE_MAX, TPL_LIMITS, cleanTemplateName, conformBody, docFromTemplate, isTemplateKind, paramsOnly, revStart, safeJson, templateBody, templateDoc,
  templateFile, templateFileName, templateKind, type TemplateFile,
} from "../src/data/tool-templates";
import { parseTemplateFile } from "../src/data/template-file";
import { templateFits, templateFromFile } from "../src/features/tools/templates";
import { TOOL_MODULES, type ToolModule } from "../src/features/tools/module";
import { ToolStore, memoryAdapter } from "../src/lib/tool-store";
import { toolKindsForRole } from "../src/tools/gate";
import { newDocId, type ToolDoc } from "../src/data/tool-docs";

const mods: Record<string, ToolModule> = {};
const load = async (kind: string) => (mods[kind] ||= await TOOL_MODULES[kind]());
const profile = { id: "contract@1", edition: "x", values: {}, overridden: [], unverified: [] };

describe("what a template keeps", () => {
  it("parameters only: every value that is not a list and holds no list", () => {
    const blank = { rate: "5", rules: "is1200", custom: { min: "0.1" }, calib: { bucketL: "10" }, rows: [{ a: "" }], plan: {} as Record<string, unknown>, note: "" };
    const body = { rate: "7.5", rules: "contract", custom: { min: "0.25" }, calib: { bucketL: "12" }, rows: [{ a: "x" }, { a: "y" }], plan: { p1: { cuts: [1, 2] } }, note: "ملاحظة" };
    expect(paramsOnly(blank, body)).toEqual({ rate: "7.5", rules: "contract", custom: { min: "0.25" }, calib: { bucketL: "12" }, rows: [{ a: "" }], plan: {}, note: "ملاحظة" });
  });
  it("never shares structure with the document it came from", () => {
    const body = { custom: { min: "0.25" }, rows: [{ a: "x" }] };
    const t = templateBody(body, { custom: { min: "0.1" }, rows: [] as { a: string }[] }, true);
    t.custom.min = "9";
    t.rows[0].a = "z";
    expect(body).toEqual({ custom: { min: "0.25" }, rows: [{ a: "x" }] });
  });
  it("the scheme a new document starts with: P03 → P01 · C → A · 04 → 00", () => {
    expect(revStart("P03")).toBe("P01");
    expect(revStart("C12")).toBe("C01");
    expect(revStart("04")).toBe("00");
    expect(revStart("C")).toBe("A");
    expect(revStart("AB")).toBe("A");
    expect(revStart("")).toBe("00");
  });
});

describe("what never carries over (the tools' own rules)", () => {
  it("payment certificate: terms and deduction lines stay, what was certified does not", async () => {
    const ipc = await load("ipc");
    const body = {
      ...(ipc.blank() as Record<string, unknown>), certNo: "7", from: "2026-10-01", to: "2026-10-31", contractRef: "C-77", contract: "5000000", ret: "10", retLimit: "5",
      adv: "500000", advMethod: "fidic", advPrev: "125000", vat: "14",
      items: [{ id: "a", section: "خرسانات", ref: "2.1", desc: "خرسانة مسلحة", unit: "م³", qc: "1200", rate: "4500", qp: "640", qq: "85" }],
      deductions: [{ id: "d", name: "ضريبة الخصم من المنبع", mode: "pct", pct: "1", prev: "0", cur: "" }, { id: "e", name: "تشوينات", mode: "fixed", pct: "", prev: "30000", cur: "12000" }],
    };
    const withRows = templateBody(body, ipc.blank(), true, ipc.template) as typeof body;
    expect(withRows).toMatchObject({ certNo: "1", from: "", to: "", advPrev: "0", contractRef: "C-77", ret: "10", retLimit: "5", advMethod: "fidic" });
    expect(withRows.items).toEqual([{ id: "a", section: "خرسانات", ref: "2.1", desc: "خرسانة مسلحة", unit: "م³", qc: "1200", rate: "4500", qp: "0", qq: "" }]);
    expect(withRows.deductions.map((d) => [d.name, d.pct, d.prev, d.cur])).toEqual([["ضريبة الخصم من المنبع", "1", "0", ""], ["تشوينات", "", "0", ""]]);
    const paramsOnlyT = templateBody(body, ipc.blank(), false, ipc.template) as typeof body;
    expect(paramsOnlyT).toMatchObject({ certNo: "1", contractRef: "", ret: "10", retLimit: "5", vat: "14" });
    expect(paramsOnlyT.items).toHaveLength(1);
    expect(paramsOnlyT.items[0]).toMatchObject({ ref: "", desc: "", qp: "0", qq: "" });
    expect(paramsOnlyT.deductions).toHaveLength(2);
  });
  it("RFI: the reply and the closed flag · submittal: the consultant's code · variation: the decision", async () => {
    const rfi = await load("rfi");
    const r = templateBody({ ...(rfi.blank() as object), question: "ما المطلوب؟", answer: "حسب اللوحة", answeredBy: "م. منى", answeredOn: "2026-10-02", closed: true }, rfi.blank(), true, rfi.template);
    expect(r).toMatchObject({ question: "ما المطلوب؟", answer: "", answeredBy: "", answeredOn: "", closed: false });
    const sub = await load("submittal");
    expect(templateBody({ ...(sub.blank() as object), material: "حديد", code: "B", codeOn: "2026-10-03" }, sub.blank(), true, sub.template)).toMatchObject({ material: "حديد", code: "", codeOn: "" });
    const vo = await load("vo");
    expect(templateBody({ ...(vo.blank() as object), alertPct: "15", status: "approved", approvedValue: "1000", approvedOn: "2026-10-04", approvedRef: "L-1" }, vo.blank(), true, vo.template))
      .toMatchObject({ alertPct: "15", status: "draft", approvedValue: "", approvedOn: "", approvedRef: "" });
  });
  it("work permit: never a tick, a gas reading, an authorisation or a closing note", async () => {
    const ptw = await load("workPermit");
    const t = templateBody({ ...(ptw.blank() as object), type: "confined", location: "خزان 2", state: "active", authorisedAt: 123, paperSigned: true, controls: { c1: "y" }, gas: [{ o2: "20.9" }], closeNote: "تم" }, ptw.blank(), true, ptw.template) as Record<string, unknown>;
    expect(t).toMatchObject({ type: "confined", location: "خزان 2", state: "draft", paperSigned: false, controls: {}, gas: [], closeNote: "" });
    expect(t.authorisedAt).toBeUndefined();
  });
  it("every tool can print a document started from its own template — with rows and with parameters only", async () => {
    for (const kind of Object.keys(TOOL_MODULES)) {
      const mod = await load(kind);
      for (const rows of [true, false]) {
        const body = templateBody(mod.blank(), mod.blank(), rows, mod.template);
        expect(templateFits(mod, body), `${kind} rows=${rows}`).toBe(true);
        // and after the trip through a file (JSON, then the tool's own top-level shape)
        expect(templateFits(mod, conformBody(mod.blank(), JSON.parse(JSON.stringify(body)))), `${kind} file rows=${rows}`).toBe(true);
      }
    }
  });
});

describe("a template is a document of its own kind", () => {
  it("«tpl.<tool>»: stored and synced like any document, listed only when asked for", async () => {
    const s = await ToolStore.open("u1", null, memoryAdapter());
    const ipc = await load("ipc");
    const tpl = templateDoc({ id: newDocId(), name: "  قالب   مستخلصات المكتب ", kind: "ipc", v: ipc.v, body: ipc.blank(), rows: true, profile: ipc.profile, now: Date.UTC(2026, 10, 9), sign: [{ label: "مدير المشروع" }], rev: "P01" });
    await s.save(tpl);
    expect(tpl.kind).toBe("tpl.ipc");
    expect(isTemplateKind(tpl.kind)).toBe(true);
    expect(tpl.title).toBe("قالب مستخلصات المكتب");
    expect(s.headers([templateKind("ipc")]).map((h) => h.title)).toEqual(["قالب مستخلصات المكتب"]);
    // the lists of real documents ask for the role's tool kinds: no template among them, for any role
    for (const role of ["engineer", "owner", "supervisor", "hr"] as const) expect(s.headers(toolKindsForRole(role))).toEqual([]);
    expect(toolKindsForRole("engineer").some(isTemplateKind)).toBe(false);
  });
  it("a new document from it: its own id, today's date, no number, the template's scheme and boxes — and no shared state", async () => {
    const ipc = await load("ipc");
    const tpl = templateDoc({ id: "t1", name: "قالب", kind: "ipc", v: 1, body: ipc.blank(), rows: true, profile: ipc.profile, now: 1, sign: [{ label: "مدير المشروع", name: "م. هالة" }], tb: { scale: "1:50" }, rev: "P01" });
    const d = docFromTemplate(tpl, { id: "d1", projectId: "p9", dateIso: "2026-11-09", title: "المستخلص رقم 1", profile: ipc.profile, now: 5 });
    expect(d).toMatchObject({ id: "d1", kind: "ipc", v: 1, projectId: "p9", dateIso: "2026-11-09", docNo: null, rev: "P01", status: "draft", sign: [{ label: "مدير المشروع", name: "م. هالة" }], tb: { scale: "1:50" } });
    expect(d.revs).toBeUndefined();
    (d.body as { certNo: string }).certNo = "9";
    expect((tpl.body.body as { certNo: string }).certNo).toBe("1");
  });
  it("a template without custom controls starts a plain 00 document", () => {
    const d = docFromTemplate(templateDoc({ id: "t", name: "x", kind: "qto", v: 1, body: {}, rows: false, profile, now: 1 }), { id: "d", projectId: null, dateIso: "2026-11-09", title: "حصر", profile, now: 2 });
    expect(d.rev).toBe("00");
    expect("sign" in d).toBe(false);
    expect("tb" in d).toBe(false);
  });
  it("names are cleaned; file names are safe on every system and keep Arabic", () => {
    expect(cleanTemplateName("  a\u0000b\n\tc  ")).toBe("a b c");
    expect(cleanTemplateName("x".repeat(200))).toHaveLength(80);
    expect(templateFileName("قالب مستخلصات: المكتب/2026")).toBe("قالب-مستخلصات-المكتب-2026.engspace-template.json");
    expect(templateFileName("../../etc/passwd")).toBe("etc-passwd.engspace-template.json");
    expect(templateFileName("")).toBe("template.engspace-template.json");
  });
});

describe("a template file from outside is untrusted input", () => {
  const good = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    format: "engspace.template", version: 1, kind: "ipc", v: 1, name: "قالب المكتب", rows: true, savedAt: "2026-11-09",
    body: { ret: "10", items: [] }, ...over,
  });
  const parse = (o: unknown) => parseTemplateFile(JSON.stringify(o));
  it("a file written by the app reads back exactly", async () => {
    const ipc = await load("ipc");
    const tpl = templateDoc({ id: "t1", name: "قالب المكتب", kind: "ipc", v: 1, body: templateBody(ipc.blank(), ipc.blank(), true, ipc.template), rows: true, profile: ipc.profile, now: Date.UTC(2026, 10, 9), sign: [{ label: "مدير المشروع", name: "م. هالة" }], tb: { scale: "1:50" }, rev: "P01" });
    const file = templateFile(tpl);
    const back = parseTemplateFile(JSON.stringify(file));
    expect(back).toEqual({ ok: true, file });
  });
  it("refuses what is not a template: wrong format, version, kind, name — and anything that is not JSON", () => {
    expect(parseTemplateFile("not json")).toEqual({ ok: false, problem: "notJson" });
    expect(parseTemplateFile("")).toEqual({ ok: false, problem: "notJson" });
    for (const bad of [{ format: "other" }, { version: 2 }, { kind: "../ipc" }, { kind: "__proto__" }, { kind: "tpl.ipc" }, { kind: "a" }, { v: 0 }, { v: 1.5 }, { v: "1" }, { name: "" }, { name: "   " }, { name: "x".repeat(81) }, { rev: "P 01" }, { rev: "<b>" }, { savedAt: "yesterday" }]) {
      expect(parse(good(bad)), JSON.stringify(bad)).toEqual({ ok: false, problem: "notTemplate" });
    }
    expect(parse([good()])).toEqual({ ok: false, problem: "notTemplate" });
    expect(parse(null)).toEqual({ ok: false, problem: "notTemplate" });
  });
  it("too many or too long: a seventh signature box, a 61-character title, a huge file", () => {
    expect(parse(good({ sign: Array.from({ length: 7 }, () => ({ label: "x" })) })).ok).toBe(false);
    expect(parse(good({ sign: [{ label: "x".repeat(61) }] })).ok).toBe(false);
    expect(parse(good({ tb: { scale: "x".repeat(17) } })).ok).toBe(false);
    expect(parseTemplateFile(" ".repeat(TPL_FILE_MAX + 1))).toEqual({ ok: false, problem: "tooBig" });
  });
  it("unknown fields are stripped, known ones trimmed", () => {
    const r = parse(good({ name: "  قالب  ", evil: "<script>", sign: [{ label: " مدير ", onclick: "x" }] }));
    expect(r.ok).toBe(true);
    if (r.ok === true) {
      expect(r.file.name).toBe("قالب");
      expect("evil" in r.file).toBe(false);
      expect(r.file.sign).toEqual([{ label: "مدير" }]);
    }
  });
  it("the body must be a plain, bounded JSON object", () => {
    for (const body of [null, 5, "x", [1, 2]]) expect(parse(good({ body })), JSON.stringify(body)).toEqual({ ok: false, problem: "badBody" });
    let deep: unknown = "x";
    for (let i = 0; i < TPL_LIMITS.depth + 2; i++) deep = { a: deep };
    expect(parse(good({ body: deep }))).toEqual({ ok: false, problem: "badBody" });
    expect(parse(good({ body: { t: "x".repeat(TPL_LIMITS.text + 1) } }))).toEqual({ ok: false, problem: "badBody" });
    expect(parse(good({ body: { rows: Array.from({ length: TPL_LIMITS.list + 1 }, () => 0) } }))).toEqual({ ok: false, problem: "badBody" });
    expect(parse(good({ body: { ["k".repeat(TPL_LIMITS.key + 1)]: 1 } }))).toEqual({ ok: false, problem: "badBody" });
  });
  it("prototype keys are refused wherever they hide, and nothing is ever polluted", () => {
    for (const raw of [
      '{"format":"engspace.template","version":1,"kind":"ipc","v":1,"name":"x","body":{"__proto__":{"polluted":true}}}',
      '{"format":"engspace.template","version":1,"kind":"ipc","v":1,"name":"x","body":{"items":[{"constructor":{"prototype":{"polluted":true}}}]}}',
      '{"format":"engspace.template","version":1,"kind":"ipc","v":1,"name":"x","body":{"a":{"prototype":1}}}',
    ]) expect(parseTemplateFile(raw)).toEqual({ ok: false, problem: "badBody" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });
  it("safeJson: non-finite numbers, class instances and functions are not JSON", () => {
    expect(safeJson({ a: NaN })).toEqual({ ok: false, why: "type" });
    expect(safeJson({ a: new Date(0) })).toEqual({ ok: false, why: "type" });
    expect(safeJson({ a: () => 1 })).toEqual({ ok: false, why: "type" });
    expect(safeJson({ a: [1, "x", null, true, { b: 2 }] })).toEqual({ ok: true, value: { a: [1, "x", null, true, { b: 2 }] } });
    let wide: Record<string, number> = {};
    for (let i = 0; i < TPL_LIMITS.keys + 1; i++) wide[`k${i}`] = i;
    expect(safeJson(wide)).toEqual({ ok: false, why: "size" });
    wide = {};
  });
});

describe("before a file becomes a template, the tool must accept it", () => {
  const file = (over: Partial<TemplateFile> = {}): TemplateFile => ({ format: "engspace.template", version: 1, kind: "ipc", v: 1, name: "قالب", rows: true, savedAt: "2026-11-09", body: {}, ...over });
  it("for another tool, or from a newer app: refused with the reason", async () => {
    const ipc = await load("ipc");
    expect(templateFromFile(file({ kind: "qto" }), ipc, "المستخلص", 1)).toEqual({ ok: false, message: "القالب لأداة أخرى" });
    const r = templateFromFile(file({ v: ipc.v + 1 }), ipc, "المستخلص", 1);
    expect(r.ok).toBe(false);
  });
  it("only the tool's own top-level fields survive, and only with the right kind of value", async () => {
    const ipc = await load("ipc");
    const body = conformBody(ipc.blank(), { ret: "7.5", vat: 14, items: "not a list", deductions: [{ id: "d", name: "x", mode: "pct", pct: "1", prev: "0", cur: "" }], injected: { html: "<img onerror=x>" } }) as Record<string, unknown>;
    expect(body.ret).toBe("7.5");
    expect(body.vat).toBe("14");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.deductions).toHaveLength(1);
    expect("injected" in body).toBe(false);
  });
  it("rows are shaped by the tool's own blank row: every field present, wrong kinds replaced, non-rows dropped", async () => {
    const ipc = await load("ipc");
    const body = conformBody(ipc.blank(), { items: [{ ref: "2.1", desc: "خرسانة", rate: 4500 }, null, "junk", 7, { ref: "2.2", extra: "kept" }] }) as { items: Record<string, unknown>[] };
    expect(body.items).toHaveLength(2);
    // the blank item defines id · section · ref · desc · unit · qc · rate · qp · qq — all there, all text
    for (const it of body.items) for (const k of ["id", "section", "ref", "desc", "unit", "qc", "rate", "qp", "qq"]) expect(typeof it[k], k).toBe("string");
    expect(body.items[0]).toMatchObject({ ref: "2.1", desc: "خرسانة", rate: "" });
    expect(body.items[1]).toMatchObject({ ref: "2.2", extra: "kept" });
  });
  it("a list the blank leaves empty takes rows of one kind; a mixed list is no list of rows", async () => {
    const ipc = await load("ipc");
    expect((conformBody(ipc.blank(), { deductions: [5, "x", { name: "y" }] }) as { deductions: unknown[] }).deductions).toEqual([]);
    expect((conformBody(ipc.blank(), { deductions: [{ name: "y" }, { name: "z" }] }) as { deductions: unknown[] }).deductions).toHaveLength(2);
  });
  it("a parameter group keeps every field the tool reads; a free-form record is taken as it is", async () => {
    const conc = await load("concrete");
    const b = conformBody(conc.blank(), { order: { load: "8", pump: 30, junk: "kept" }, cj: "x" }) as { order: Record<string, unknown>; cj: Record<string, unknown> };
    expect(b.order.load).toBe("8");
    expect(b.order.pump).toBe("30");
    expect(Object.keys(b.order)).toEqual(expect.arrayContaining(["load", "pump", "plant", "crew", "travel", "priming", "loadMin", "wash", "setup", "cleanup"]));
    expect(b.cj).toEqual((conc.blank() as { cj: unknown }).cj);
    const trade = await load("tradeKit");
    expect((conformBody(trade.blank(), { inputs: { masonry: { L: "5", waste: "7" } } }) as { inputs: unknown }).inputs).toEqual({ masonry: { L: "5", waste: "7" } });
  });
  it("a body the tool cannot print is refused; one it can is saved under a fresh id", async () => {
    const ipc = await load("ipc");
    // a tool whose build throws on this body (simulated: the real tools survive what conformBody lets through)
    const brittle: ToolModule = { ...ipc, build: () => { throw new Error("cannot print"); } };
    expect(templateFromFile(file({ body: { ret: "10" } }), brittle, "المستخلص", 1)).toEqual({ ok: false, message: "القالب غير متوافق مع هذه الأداة" });
    expect(templateFits({ ...ipc, summary: () => { throw new Error("x"); } }, ipc.blank())).toBe(false);
    const ok = templateFromFile(file({ body: { ret: "10", retLimit: "5" }, sign: [{ label: "مدير المشروع" }], rev: "P01" }), ipc, "المستخلص", Date.UTC(2026, 10, 9));
    expect(ok.ok).toBe(true);
    if (ok.ok === true) {
      expect(ok.tpl.kind).toBe("tpl.ipc");
      expect(ok.tpl.id).toMatch(/^d[a-z2-7]{20}$/);
      expect(ok.tpl.body).toMatchObject({ of: "ipc", v: 1, rows: true, rev: "P01", sign: [{ label: "مدير المشروع" }] });
      expect((ok.tpl.body.body as { ret: string; certNo: string }).ret).toBe("10");
      expect((ok.tpl.body.body as { ret: string; certNo: string }).certNo).toBe("1");
    }
  });
  it("text that looks like a formula or markup stays text all the way to the printed document", async () => {
    const ipc = await load("ipc");
    const nasty = '=HYPERLINK("http://x","y")';
    const made = templateFromFile(file({ name: nasty, body: { contractRef: "<script>alert(1)</script>", items: [{ id: "a", section: "", ref: "+1", desc: nasty, unit: "@م", qc: "1", rate: "1", qp: "0", qq: "1" }] } }), ipc, "المستخلص", 1);
    expect(made.ok).toBe(true);
    if (made.ok === true) {
      const d: ToolDoc = docFromTemplate(made.tpl, { id: "d1", projectId: null, dateIso: "2026-11-09", title: "t", profile: ipc.profile, now: 1 });
      const { workbookXlsx } = await import("../src/doc/xlsx");
      const { strFromU8, unzipSync } = await import("fflate");
      const zip = unzipSync(workbookXlsx(ipc.workbook!(d, null)));
      const xml = Object.keys(zip).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(zip[k])).join("");
      // the member's text is never inside a formula element, and it is XML-escaped where it is shown
      const formulas = [...xml.matchAll(/<f>([^<]*)<\/f>/g)].map((m) => m[1]).join("\n");
      expect(formulas).not.toContain("HYPERLINK");
      expect(xml).not.toContain("<script>");
      expect(xml).toContain("=HYPERLINK(&quot;http://x&quot;,&quot;y&quot;)");
    }
  });
});
