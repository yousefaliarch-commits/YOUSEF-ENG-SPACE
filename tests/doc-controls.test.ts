// v0.39: what an engineer sets on any document beyond its calculation — the revision code and history, the signature boxes,
// the scale and reference cells, and the project's own document-number pattern. Checked down to what the page prints.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  DOCNO_DEFAULT, REVS_MAX, SIGN_MAX, applyDocControls, cleanRev, cleanSign, cleanTitleExtras, controlsForHash, defaultSign, docNoPatternProblem,
  formatDocNo, nextRev, revisionRows, withRevision, type DocRev,
} from "../src/data/doc-controls";
import { newDocId, type ToolDoc } from "../src/data/tool-docs";
import { blankProject, type ToolProject } from "../src/data/tool-projects";
import { buildSpec, nextDocNo, snapOf } from "../src/features/tools/spec";
import { docSettingsChanged } from "../src/features/tools/doc-settings";
import { docLayout, fixedMeasurer } from "../src/doc/layout";
import { specDocx } from "../src/doc/docx";
import { specXlsx } from "../src/doc/xlsx";
import { canonical } from "../src/doc/hash";
import type { DrawOp } from "../src/doc/model";

const doc = (over: Partial<ToolDoc> = {}): ToolDoc => ({
  id: newDocId(), kind: "concrete", v: 1, at: 1, createdAt: 1, projectId: "p1", title: "خطة صب سقف الدور الثالث", dateIso: "2026-11-09",
  docNo: "TWR-PP-0007", rev: "01", status: "issued", profile: { id: "ecp203-site@1", edition: "2020", values: {}, overridden: [], unverified: [] },
  body: {}, photos: {}, log: [], ...over,
});
const project: ToolProject = {
  ...blankProject("p1"), code: "TWR", name: "أبراج النيل", contractNo: "C-77", contractor: { name: "شركة المقاولات" },
  location: { site: "قطعة 12" },
  signatories: [{ role: "prepared", name: "م. أحمد" }, { role: "checked", name: "م. منى" }, { role: "approved", name: "م. خالد", title: "مدير المشروع" }, { role: "siteEngineer", name: "م. سامي" }],
};
const meta = { kind: "concrete", docType: "PP", docTypeName: "خطة صب · Pour plan", discipline: "إنشائي", engine: "concrete@1.0.0" };
const base = (d: ToolDoc, roles?: Parameters<typeof buildSpec>[0]["signRoles"]) =>
  buildSpec({ doc: d, meta, project: snapOf(project), sections: [{ orientation: "portrait", blocks: [{ k: "notes", text: "ملاحظات" }] }], signRoles: roles });
const printed = (d: ToolDoc, roles?: Parameters<typeof buildSpec>[0]["signRoles"]) =>
  docLayout(applyDocControls(base(d, roles), d), fixedMeasurer).pages.flatMap((p) => p.ops.filter((o): o is Extract<DrawOp, { op: "text" }> => o.op === "text").map((o) => o.text));

describe("revision codes follow the firm's own scheme", () => {
  it("numbers count up and keep their width", () => {
    expect(nextRev("00")).toBe("01");
    expect(nextRev("09")).toBe("10");
    expect(nextRev("99")).toBe("100");
    expect(nextRev("0")).toBe("1");
    expect(nextRev("007")).toBe("008");
  });
  it("letters run A … Z, AA", () => {
    expect(nextRev("A")).toBe("B");
    expect(nextRev("Z")).toBe("AA");
    expect(nextRev("AZ")).toBe("BA");
    expect(nextRev("ZZ")).toBe("AAA");
  });
  it("a prefix stays: P01 → P02, C09 → C10, T-03 → T-04, R1.9 → R1.10", () => {
    expect(nextRev("P01")).toBe("P02");
    expect(nextRev("C09")).toBe("C10");
    expect(nextRev("T-03")).toBe("T-04");
    expect(nextRev("R1.9")).toBe("R1.10");
  });
  it("anything typed is cleaned first: Arabic digits, lower case, spaces", () => {
    expect(cleanRev(" p٠١ ")).toBe("P01");
    expect(cleanRev("rev/2")).toBe("REV2");
    expect(cleanRev("ABCDEFGHIJKL")).toHaveLength(8);
    expect(nextRev("")).toBe("01");
    expect(nextRev("p٠١")).toBe("P02");
    expect(nextRev("-")).toBe("-1");
  });
  it("never grows past the title block's cell", () => {
    expect(nextRev("99999999")).toHaveLength(8);
  });
});

describe("the issued revisions", () => {
  const r1: DocRev = { rev: "00", dateIso: "2026-10-01", desc: "إصدار أول", prepared: "م. أحمد", checked: "م. منى", approved: "م. خالد" };
  it("each issue adds a row; issuing the same code again replaces its row", () => {
    const a = withRevision(undefined, r1);
    const b = withRevision(a, { rev: "01", dateIso: "2026-10-20T08:00:00Z", desc: "  تعديل   الكميات  " });
    expect(b.map((r) => r.rev)).toEqual(["00", "01"]);
    expect(b[1]).toEqual({ rev: "01", dateIso: "2026-10-20", desc: "تعديل الكميات", prepared: undefined, checked: undefined, approved: undefined });
    expect(withRevision(b, { rev: "01", dateIso: "2026-10-21", desc: "تصحيح" }).map((r) => r.desc)).toEqual(["إصدار أول", "تصحيح"]);
  });
  it("keeps the latest rows when a document is revised more than the cap", () => {
    let revs: DocRev[] = [];
    for (let i = 0; i < REVS_MAX + 5; i++) revs = withRevision(revs, { rev: String(i).padStart(2, "0"), dateIso: "2026-01-01", desc: `r${i}` });
    expect(revs).toHaveLength(REVS_MAX);
    expect(revs[revs.length - 1].rev).toBe(String(REVS_MAX + 4));
  });
  it("prints as the title block's revision table (newest first) with the names frozen at issue", () => {
    const d = doc({ revs: withRevision(withRevision(undefined, r1), { rev: "01", dateIso: "2026-10-20", desc: "تعديل حسب ملاحظات الاستشاري", prepared: "م. أحمد" }) });
    const t = printed(d);
    expect(t).toContain("تعديل حسب ملاحظات الاستشاري");
    expect(t).toContain("إصدار أول");
    expect(t.indexOf("تعديل حسب ملاحظات الاستشاري")).toBeLessThan(t.indexOf("إصدار أول"));
    expect(revisionRows(d.revs)[0]).toEqual({ rev: "00", dateIso: "2026-10-01", desc: "إصدار أول", prepared: "م. أحمد", checked: "م. منى", approved: "م. خالد" });
  });
  it("a document that was never issued prints no revision table", () => {
    expect(printed(doc())).not.toContain("وصف التعديل");
    expect(applyDocControls(base(doc()), doc()).revisions).toEqual([]);
  });
});

describe("signature boxes", () => {
  it("default: the tool's roles with the project's names", () => {
    expect(defaultSign(base(doc()))).toEqual([
      { label: "أعدّ · Prepared by", name: "م. أحمد", title: undefined },
      { label: "راجع · Checked by", name: "م. منى", title: undefined },
      { label: "اعتمد · Approved by", name: "م. خالد", title: "مدير المشروع" },
    ]);
  });
  it("a role typed once in the project fills its box in every document that carries it", () => {
    expect(defaultSign(base(doc(), ["siteEngineer", "consultantRep", "approved"])).map((b) => b.name)).toEqual(["م. سامي", undefined, "م. خالد"]);
    expect(printed(doc(), ["siteEngineer", "consultantRep", "approved"]).some((x) => x.includes("م. سامي"))).toBe(true);
  });
  it("custom boxes replace them in the printed document — any titles, up to six", () => {
    const d = doc({ sign: [{ label: "مدير المشروع · Project manager", name: "م. هالة" }, { label: "ممثل المالك", name: "", title: "" }, { label: "ضبط الجودة QC", name: "م. عمر", title: "مهندس جودة" }, { label: "المساح" }] });
    const t = printed(d);
    for (const x of ["مدير المشروع · Project manager", "ممثل المالك", "ضبط الجودة QC", "المساح"]) expect(t).toContain(x);
    expect(t.some((x) => x.includes("م. عمر · مهندس جودة"))).toBe(true);
    expect(t).not.toContain("أعدّ · Prepared by");
  });
  it("blank rows are dropped, long text is cut, control characters never reach the page", () => {
    expect(cleanSign([{ label: "  " }, { label: "x".repeat(200), name: "a\u0000b\n c" }])).toEqual([{ label: "x".repeat(60), name: "a b c", title: undefined }]);
    expect(cleanSign(Array.from({ length: 9 }, (_, i) => ({ label: `خانة ${i}` })))).toHaveLength(SIGN_MAX);
    expect(cleanSign([])).toBeUndefined();
    expect(cleanSign(undefined)).toBeUndefined();
    expect(cleanSign("x" as never)).toBeUndefined();
  });
  it("the same boxes reach the Word and Excel copies", () => {
    const d = doc({ sign: [{ label: "مدير المشروع", name: "م. هالة" }] });
    const s = applyDocControls(base(d), d);
    const word = strFromU8(unzipSync(specDocx(s))["word/document.xml"]);
    expect(word).toContain("مدير المشروع");
    expect(word).toContain("م. هالة");
    const zip = unzipSync(specXlsx(s, new Date("2026-11-09T00:00:00Z")));
    const sheets = Object.keys(zip).filter((k) => k.startsWith("xl/")).map((k) => strFromU8(zip[k])).join("");
    expect(sheets).toContain("مدير المشروع");
  });
});

describe("title block cells", () => {
  it("scale and reference print when set; otherwise the contract number and a dash stay", () => {
    expect(applyDocControls(base(doc()), doc()).title).toMatchObject({ reference: "C-77" });
    const d = doc({ tb: { scale: "1:50", reference: "S-301 Rev B" } });
    const s = applyDocControls(base(d), d);
    expect(s.title.scale).toBe("1:50");
    expect(s.title.reference).toBe("S-301 Rev B");
    expect(printed(d)).toContain("1:50");
  });
  it("blank fields change nothing", () => {
    expect(cleanTitleExtras({ scale: "  ", reference: "" })).toBeUndefined();
    expect(cleanTitleExtras({ scale: " 1:100 " })).toEqual({ scale: "1:100" });
    const s = base(doc());
    expect(applyDocControls(s, doc({ tb: { scale: " " } }))).toBe(s);
  });
});

describe("nothing set → the tool's document exactly as before", () => {
  it("returns the same spec object", () => {
    const s = base(doc());
    expect(applyDocControls(s, {})).toBe(s);
    expect(applyDocControls(s, { sign: [], revs: [], tb: {} })).toBe(s);
  });
  it("the issue fingerprint of a document without custom controls is unchanged (the key is absent, not null)", () => {
    expect(controlsForHash({})).toBeUndefined();
    expect(canonical({ a: 1, controls: controlsForHash({}) })).toBe(canonical({ a: 1 }));
    expect(controlsForHash({ sign: [{ label: "x" }], tb: { scale: "1:20" } })).toEqual({ sign: [{ label: "x", name: undefined, title: undefined }], tb: { scale: "1:20" } });
  });
  it("the folded card counts what was customised", () => {
    expect(docSettingsChanged({ rev: "00" })).toBe(0);
    expect(docSettingsChanged({ rev: "07" })).toBe(0);
    expect(docSettingsChanged({ rev: "P01", sign: [{ label: "x" }], tb: { scale: "1:50", reference: "S-1" } })).toBe(4);
  });
});

describe("document numbers follow the project's pattern", () => {
  const parts = { code: "TWR", type: "RFI", n: 12, dateIso: "2026-11-09", orig: "abc" };
  it("the default is what every document had before: <code>-<TYPE>-<NNNN>", () => {
    expect(formatDocNo(undefined, parts)).toBe("TWR-RFI-0012");
    expect(formatDocNo("", parts)).toBe("TWR-RFI-0012");
    expect(formatDocNo(DOCNO_DEFAULT, parts)).toBe("TWR-RFI-0012");
    expect(nextDocNo(null, "PP")).toEqual({ docNo: "GEN-PP-0001", n: 1 });
    expect(nextDocNo({ ...project, numbering: { ...project.numbering, counters: { PP: 6 } } }, "PP")).toEqual({ docNo: "TWR-PP-0007", n: 7 });
  });
  it("tokens: counter width, year, originator", () => {
    expect(formatDocNo("{code}-{orig}-{type}-{nnnn}", parts)).toBe("TWR-ABC-RFI-0012");
    expect(formatDocNo("{type}/{yyyy}/{nnn}", parts)).toBe("RFI/2026/012");
    expect(formatDocNo("{code}-{type}-{yy}{nnn}", parts)).toBe("TWR-RFI-26012");
    expect(formatDocNo("{n}", parts)).toBe("12");
    expect(formatDocNo("DOC.{nnnnnn}", parts)).toBe("DOC.000012");
  });
  it("an empty originator leaves no doubled or dangling separator", () => {
    expect(formatDocNo("{code}-{orig}-{type}-{nnnn}", { ...parts, orig: "" })).toBe("TWR-RFI-0012");
    expect(formatDocNo("{orig}-{type}-{nn}", { ...parts, orig: undefined })).toBe("RFI-12");
  });
  it("a pattern without a counter, with an unknown token or odd characters is refused — and never used", () => {
    expect(docNoPatternProblem("")).toBeNull();
    expect(docNoPatternProblem("{code}-{type}")).toContain("{nnnn}");
    expect(docNoPatternProblem("{code}-{foo}-{nn}")).toContain("{foo}");
    expect(docNoPatternProblem("{code}-{nnnnnnn}")).not.toBeNull();
    expect(docNoPatternProblem("{code} رقم {nn}")).not.toBeNull();
    expect(docNoPatternProblem("=HYPERLINK({nn})")).not.toBeNull();
    expect(docNoPatternProblem("{code}-{type}-{nnn}")).toBeNull();
    expect(formatDocNo("{code}-{type}", parts)).toBe("TWR-RFI-0012");
    expect(formatDocNo("<script>{nn}", parts)).toBe("TWR-RFI-0012");
  });
  it("the result is always a safe file-name stem, at most 40 characters", () => {
    for (const p of ["{code}-{type}-{nnnn}", "{type}/{yyyy}/{nnn}", "A_B.{n}", "{code}{code}{code}{code}{code}{code}{code}{code}-{nnnnnn}"]) {
      const no = formatDocNo(p, { ...parts, code: "ABCDEFGH" });
      expect(no).toMatch(/^[A-Za-z0-9._/-]{1,40}$/);
    }
  });
  it("the project's pattern numbers its documents; the year comes from the document's date", () => {
    const p: ToolProject = { ...project, numbering: { scheme: "simple", originator: "NCC", pattern: "{code}-{orig}-{type}-{yy}-{nnn}", counters: { IPC: 2 } } };
    expect(nextDocNo(p, "IPC", "2027-01-15")).toEqual({ docNo: "TWR-NCC-IPC-27-003", n: 3 });
  });
});
