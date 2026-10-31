// W7: the technical office's registers, built from the documents — RFI / submittal / variation order statuses, due dates, days
// late and turnaround, the VO arithmetic, and the register as a dated document with live Excel totals and no app mark.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { daysBetween, registerOf, rfiRow, submittalRow, voRow, type RegDoc } from "../src/domain/tools/registers";
import { computeVo } from "../src/domain/tools/vo-calc";
import { registerSpec } from "../src/features/tools/register";
import { module as vo } from "../src/features/tools/office/vo";
import { evalFormula, specXlsx } from "../src/doc/xlsx";
import { specDocx } from "../src/doc/docx";
import { docLayout } from "../src/doc/layout";
import { toolAllowed } from "../src/tools/gate";

const TODAY = "2026-10-31";
const doc = (kind: string, over: Partial<RegDoc> & { body?: any } = {}): RegDoc => ({
  id: Math.random().toString(36).slice(2), kind, title: "مستند", docNo: null, dateIso: "2026-10-01", status: "issued", body: {}, ...over,
});

describe("RFI rows", () => {
  it("open until the due date (date + reply days), then overdue by the days past it", () => {
    expect(rfiRow(doc("rfi", { dateIso: "2026-10-25", body: { days: "7" } }), TODAY)).toMatchObject({ status: "open", due: "2026-11-01", days: 6, late: 0 });
    expect(rfiRow(doc("rfi", { dateIso: "2026-10-10", body: { days: "7" } }), TODAY)).toMatchObject({ status: "overdue", due: "2026-10-17", days: 21, late: 14 });
  });
  it("answered: turnaround to the reply date; a late reply keeps its days late", () => {
    expect(rfiRow(doc("rfi", { dateIso: "2026-10-01", body: { days: "7", answer: "يُعتمد منسوب الإنشائي", answeredOn: "2026-10-05" } }), TODAY)).toMatchObject({ status: "answered", days: 4, late: 0, doneOn: "2026-10-05" });
    expect(rfiRow(doc("rfi", { dateIso: "2026-10-01", body: { days: "7", answer: "نعم", answeredOn: "2026-10-12" } }), TODAY)).toMatchObject({ status: "answered", days: 11, late: 4 });
  });
  it("a closed query is closed; a draft is never late (it was not sent)", () => {
    expect(rfiRow(doc("rfi", { body: { answer: "x", closed: true } }), TODAY).status).toBe("closed");
    expect(rfiRow(doc("rfi", { status: "draft", dateIso: "2026-01-01", body: { days: "7" } }), TODAY)).toMatchObject({ status: "draft", due: null, days: null, late: 0 });
  });
  it("an older RFI without the new fields still reads (default 7 days)", () => {
    expect(rfiRow(doc("rfi", { dateIso: "2026-10-28", body: { question: "؟" } }), TODAY)).toMatchObject({ status: "open", due: "2026-11-04" });
  });
});

describe("submittal rows", () => {
  it("consultant codes A · B · C · D, otherwise pending until the review period runs out", () => {
    const c = (code: string) => submittalRow(doc("submittal", { body: { code, codeOn: "2026-10-09", days: "14" } }), TODAY).status;
    expect([c("A"), c("B"), c("C"), c("D")]).toEqual(["approved", "approvedNoted", "revise", "rejected"]);
    expect(submittalRow(doc("submittal", { dateIso: "2026-10-25", body: {} }), TODAY)).toMatchObject({ status: "pending", due: "2026-11-08" });
    expect(submittalRow(doc("submittal", { dateIso: "2026-10-01", body: { days: "14" } }), TODAY)).toMatchObject({ status: "overdue", late: 16 });
  });
});

describe("variation orders", () => {
  it("additions minus omissions; omissions are negative lines; share of the contract", () => {
    const r = computeVo([
      { item: "4.1", desc: "خرسانة إضافية", unit: "م³", qty: 40, rate: 4500, omit: false },
      { item: "6.2", desc: "إلغاء بلاط", unit: "م²", qty: 120, rate: 650, omit: true },
    ], { contract: 10_000_000, alertPct: 1, approved: null });
    expect(r.lines.map((l) => l.amount)).toEqual([180000, -78000]);
    expect([r.additions, r.omissions, r.net]).toEqual([180000, -78000, 102000]);
    expect(r.pct).toBeCloseTo(1.02, 9);
    expect(r.checks.find((c) => c.id === "limit")!.ok).toBe(false);     // 1.02 % > the contract's 1 % alert
  });
  it("the register reads the decision: approved value (or the net when left blank), rejected = 0, days asked / approved", () => {
    const body = (status: string, approvedValue = "") => ({ items: [{ qty: "10", rate: "1000", omit: false }], status, approvedValue, approvedDays: "5", daysReq: "10", approvedOn: "2026-10-20" });
    expect(voRow(doc("vo", { body: body("approved") }), TODAY).extra).toMatchObject({ claimed: 10000, approved: 10000, daysAsked: 10, daysApproved: 5 });
    expect(voRow(doc("vo", { body: body("partial", "7500") }), TODAY).extra.approved).toBe(7500);
    expect(voRow(doc("vo", { body: body("rejected") }), TODAY).extra.approved).toBe(0);
    expect(voRow(doc("vo", { body: body("submitted") }), TODAY)).toMatchObject({ status: "submitted", days: 30 });
  });
});

describe("the register", () => {
  const rfis = [
    doc("rfi", { docNo: "TWR-RFI-0001", dateIso: "2026-10-01", body: { days: "7", answer: "نعم", answeredOn: "2026-10-04" } }),
    doc("rfi", { docNo: "TWR-RFI-0002", dateIso: "2026-10-10", body: { days: "7" } }),
    doc("rfi", { docNo: "TWR-RFI-0003", dateIso: "2026-10-29", body: { days: "7" } }),
    doc("rfi", { status: "draft", dateIso: "2026-10-30", body: {} }),
    doc("submittal", { body: {} }),
  ];
  it("counts by status, overdue, average turnaround; only its own kind, oldest first", () => {
    const r = registerOf("rfi", rfis, TODAY);
    expect(r.total).toBe(4);
    expect(r.sent).toBe(3);
    expect(r.counts).toMatchObject({ answered: 1, overdue: 1, open: 1, draft: 1 });
    expect(r.avgTurnaround).toBe(3);
    expect(r.rows.map((x) => x.no)).toEqual(["TWR-RFI-0001", "TWR-RFI-0002", "TWR-RFI-0003", "—"]);
  });
  it("prints as a dated, numbered log (no draft band, no fingerprint), landscape, white-label", () => {
    const project: any = { id: "p1", code: "TWR", name: "أبراج النيل", issuerRole: "contractor", contractor: { name: "شركة المقاولات" }, client: { name: "" }, consultant: { name: "" }, location: { site: "" }, signatories: [] };
    const s = registerSpec("rfi", rfis, project, TODAY);
    expect(s.meta).toMatchObject({ docNo: "TWR-RFI-LOG", status: "issued", hash: "", dateIso: TODAY });
    expect(s.title.title).toBe("سجل طلبات الاستيضاح — حتى 2026-10-31");
    const { pages } = docLayout(s as any, { width: (t: string, f: any) => t.length * f.pt * 0.18, ascent: (f: any) => f.pt * 0.28, descent: (f: any) => f.pt * 0.08 } as any);
    expect(pages[0].orientation).toBe("landscape");
    const docx = strFromU8(unzipSync(specDocx(s as any))["word/document.xml"]);
    expect(docx).toContain("متأخر · 14 يوم تأخير");
    expect(docx).not.toMatch(/EngSpace/i);
  });
  it("the VO log ends in live SUM totals that match the rows", () => {
    const vos = [
      doc("vo", { docNo: "TWR-VO-0001", body: { items: [{ qty: "10", rate: "1000", omit: false }], status: "approved", approvedValue: "9000" } }),
      doc("vo", { docNo: "TWR-VO-0002", body: { items: [{ qty: "4", rate: "2500", omit: false }, { qty: "2", rate: "500", omit: true }], status: "submitted" } }),
    ];
    const z = unzipSync(specXlsx(registerSpec("vo", vos, null, TODAY) as any, new Date("2026-10-31T00:00:00Z")));
    const xml = Object.keys(z).filter((k) => k.startsWith("xl/worksheets/sheet")).map((k) => strFromU8(z[k])).join("");
    const values = new Map<string, number>();
    const fs: { f: string; v: number }[] = [];
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = /<v>([^<]*)<\/v>/.exec(m[2] || ""), f = /<f>([^<]*)<\/f>/.exec(m[2] || "");
      if (v) values.set(m[1], Number(v[1]));
      if (f) fs.push({ f: f[1], v: Number(v ? v[1] : NaN) });
    }
    const sums = fs.filter((x) => x.f.startsWith("SUM("));
    expect(sums.map((x) => x.v).sort((a, b) => a - b)).toEqual([9000, 19000]);   // approved 9,000 · claimed 10,000 + 9,000
    for (const x of fs) expect(evalFormula(x.f, (r) => values.get(r) ?? null)).toBeCloseTo(x.v, 6);
  });
  it("daysBetween counts calendar days, whatever the time zone", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("the variation order document", () => {
  const body = { ...vo.blank(), contract: "10000000", alertPct: "5", reason: "زيادة سمك البلاطة", items: [
    { item: "4.1", desc: "خرسانة إضافية", unit: "م³", qty: "40", rate: "4500", omit: false },
    { item: "6.2", desc: "إلغاء بلاط", unit: "م²", qty: "120", rate: "650", omit: true },
  ] };
  const d: any = { id: "dvo", kind: "vo", v: 1, at: 1, createdAt: 1, projectId: null, title: "أمر تغيير 1", dateIso: TODAY, docNo: null, rev: "00", status: "draft", body, profile: vo.profile, photos: {}, log: [] };
  it("the items' amounts are live formulas and the net is their SUM, matching the engine", () => {
    const z = unzipSync(specXlsx(vo.build(d, null) as any, new Date("2026-10-31T00:00:00Z")));
    const xml = Object.keys(z).filter((k) => k.startsWith("xl/worksheets/sheet")).map((k) => strFromU8(z[k])).join("");
    expect(xml).toMatch(/<f>[A-Z]+\d+\*[A-Z]+\d+<\/f>/);
    expect(xml).toMatch(/<f>SUM\([A-Z]+\d+:[A-Z]+\d+\)<\/f><v>102000<\/v>/);
  });
  it("is a money tool: engineers and owners, never site supervisors or HR", () => {
    expect(toolAllowed("engineer", "vo")).toBe(true);
    expect(toolAllowed("owner", "vo")).toBe(true);
    expect(toolAllowed("supervisor", "vo")).toBe(false);
    expect(toolAllowed("hr", "vo")).toBe(false);
  });
});
