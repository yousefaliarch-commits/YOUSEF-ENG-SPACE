// =====================================================================
//  The public page's sample documents — what the showcase draws, live, with the app's own tools and document kit.
//  · Each sample is a tool's blank document with a few realistic rows on a fictional project; the issuer is «شركتك هنا»,
//    because that is the point: the title block is the firm's own, the app's name is nowhere on the sheet.
//  · Nothing here is a real company, contract or price. The page labels every sheet «نموذج».
// =====================================================================
import type { ToolDoc } from "../../data/tool-docs";
import type { ProjectSnap } from "../../data/tool-projects";

export const SAMPLE_PROJECT: ProjectSnap = {
  code: "NKH", name: "برج النخيل السكني", nameEn: "Al-Nakheel Residences",
  client: { name: "شركة التطوير العقاري" }, consultant: { name: "المكتب الاستشاري الهندسي" }, contractor: { name: "شركتك هنا" },
  issuerRole: "contractor", location: { site: "قطعة 14 — القاهرة الجديدة" }, contractNo: "C-2026-014",
  signatories: [
    { role: "prepared", name: "م. أحمد سامي", title: "مهندس مكتب فني" }, { role: "checked", name: "م. منى خالد", title: "مدير المكتب الفني" },
    { role: "approved", name: "م. هشام فؤاد", title: "مدير المشروع" }, { role: "siteEngineer", name: "م. كريم عادل" },
  ],
  at: 0,
};

export type Sample = {
  kind: string;
  caption: string;
  title: string;
  docNo: string;
  rev: string;
  wbs?: ToolDoc["wbs"];
  revs?: ToolDoc["revs"];
  // the tool's blank body with the sample's rows laid over it
  body: (blank: Record<string, unknown>) => Record<string, unknown>;
};

export const SAMPLES: Sample[] = [
  {
    kind: "concrete", caption: "خطة صب", title: "خطة صب سقف الدور الثالث", docNo: "NKH-PP-0007", rev: "01",
    wbs: { zone: "برج A", level: "الدور 03", element: "بلاطة S-301" },
    revs: [
      { rev: "00", dateIso: "2026-10-28", desc: "إصدار أول", prepared: "م. أحمد سامي", checked: "م. منى خالد", approved: "م. هشام فؤاد" },
      { rev: "01", dateIso: "2026-11-05", desc: "تعديل موعد الصب وإضافة الكمرات", prepared: "م. أحمد سامي", checked: "م. منى خالد", approved: "م. هشام فؤاد" },
    ],
    body: (b) => ({
      ...b, scope: "pour", zone: "سقف الدور الثالث", level: "+9.60", start: "06:30", grade: "C30", supplier: "محطة الخرسانة الجاهزة", slump: "120", airC: "24",
      rows: [
        { kind: "slab", label: "S-301", n: "1", dims: { L: "18.4", B: "12.6", t: "0.16", open: "6.2" }, waste: "" },
        { kind: "beam", label: "B1 — محاور A–D", n: "8", dims: { b: "0.25", h: "0.60", ts: "0.16", L: "4.8" }, waste: "" },
        { kind: "beam", label: "B2 — محاور 1–5", n: "6", dims: { b: "0.30", h: "0.70", ts: "0.16", L: "5.6" }, waste: "" },
        { kind: "column", label: "C1", n: "12", dims: { a: "0.30", b: "0.60", hFF: "3.20", ts: "0.16" }, waste: "" },
      ],
      cj: { layer: "0.5", area: "60", len: "12.6" }, spans: { slab: "4.8", beam: "5.6" },
    }),
  },
  {
    kind: "ipc", caption: "مستخلص جاري", title: "المستخلص رقم 5", docNo: "NKH-IPC-0005", rev: "00",
    body: (b) => ({
      ...b, certNo: "5", from: "2026-10-01", to: "2026-10-31", contractRef: "C-2026-014", contract: "18500000", ret: "5", retLimit: "5", adv: "1850000",
      advMethod: "proportional", vat: "14", vatOn: "gross",
      items: [
        { id: "a", section: "أعمال ترابية", ref: "1.1", desc: "حفر في تربة عادية", unit: "م³", qc: "4200", rate: "95", qp: "4200", qq: "0" },
        { id: "b", section: "أعمال ترابية", ref: "1.2", desc: "ردم على طبقات مع الدمك", unit: "م³", qc: "1800", rate: "140", qp: "950", qq: "420" },
        { id: "c", section: "خرسانات", ref: "2.1", desc: "خرسانة عادية للنظافة", unit: "م³", qc: "310", rate: "2650", qp: "310", qq: "0" },
        { id: "d", section: "خرسانات", ref: "2.2", desc: "خرسانة مسلحة للقواعد والسملات", unit: "م³", qc: "1150", rate: "5200", qp: "1150", qq: "0" },
        { id: "e", section: "خرسانات", ref: "2.3", desc: "خرسانة مسلحة للأعمدة والحوائط", unit: "م³", qc: "640", rate: "5650", qp: "214", qq: "96" },
        { id: "f", section: "خرسانات", ref: "2.4", desc: "خرسانة مسلحة للأسقف والكمرات", unit: "م³", qc: "1920", rate: "5400", qp: "512", qq: "256" },
        { id: "g", section: "مباني", ref: "3.1", desc: "مباني طوب طفلي 25 سم", unit: "م³", qc: "880", rate: "1850", qp: "0", qq: "112" },
      ],
      deductions: [
        { id: "m", name: "تشوينات حديد بالموقع", mode: "fixed", pct: "", prev: "180000", cur: "65000", add: true },
        { id: "w", name: "خصم تحت حساب الضريبة", mode: "pct", pct: "1", prev: "0", cur: "" },
      ],
    }),
  },
  {
    kind: "qto", caption: "حصر كميات", title: "حصر تشطيبات الدور الثاني", docNo: "NKH-QTO-0012", rev: "00",
    wbs: { zone: "برج A", level: "الدور 02" },
    body: (b) => ({
      ...b, rules: "is1200",
      lines: [
        { id: "1", kind: "masonry", wbs: "برج A / الدور 02 / شقة 3", desc: "حوائط خارجية 25 سم", boq: "3.1", n: "1", L: "32.4", W: "", H: "2.90", t: "0.25", faces: "1", byArea: false, upturn: "0.3", ceiling: false,
          openings: [{ id: "o1", label: "شباك W1", n: "4", w: "1.20", h: "1.20" }, { id: "o2", label: "باب بلكونة D3", n: "2", w: "1.60", h: "2.20" }] },
        { id: "2", kind: "plaster", wbs: "برج A / الدور 02 / شقة 3", desc: "بياض داخلي للحوائط", boq: "5.1", n: "1", L: "86.5", W: "", H: "2.90", t: "0.25", faces: "1", byArea: false, upturn: "0.3", ceiling: false,
          openings: [{ id: "o3", label: "باب D1", n: "6", w: "0.90", h: "2.20" }, { id: "o4", label: "فتحة تكييف", n: "3", w: "0.50", h: "0.45" }] },
        { id: "3", kind: "plaster", wbs: "برج A / الدور 02 / شقة 3", desc: "بياض الأسقف", boq: "5.2", n: "1", L: "12.4", W: "9.8", H: "", t: "0.25", faces: "1", byArea: false, upturn: "0.3", ceiling: true, openings: [] },
        { id: "4", kind: "tiles", wbs: "برج A / الدور 02 / شقة 3", desc: "بورسلين 60×60 للاستقبال والغرف", boq: "6.1", n: "1", L: "12.4", W: "8.6", H: "", t: "0.25", faces: "1", byArea: false, upturn: "0.3", ceiling: false,
          openings: [{ id: "o5", label: "عمود C4", n: "2", w: "0.30", h: "0.60" }] },
        { id: "5", kind: "waterproof", wbs: "برج A / الدور 02 / حمامات", desc: "عزل الحمامات مع الرفرف", boq: "7.1", n: "3", L: "2.4", W: "1.8", H: "", t: "0.25", faces: "1", byArea: false, upturn: "0.3", ceiling: false, openings: [] },
      ],
    }),
  },
  {
    kind: "bbs", caption: "جدول تفريد الحديد", title: "تفريد كمرات سقف الدور الثالث", docNo: "NKH-BBS-0009", rev: "00",
    wbs: { zone: "برج A", level: "الدور 03", element: "كمرات B1 · B2" },
    body: (b) => ({
      ...b, group: "كمرات سقف الدور 3", drawingRef: "S-301", drawingRev: "B", grade: "B500DWR", fcu: "30", rounding: "25", stockM: "12", minRem: "1000",
      lines: [
        { member: "B1", mark: "01", d: 16, shape: "00", dims: { A: "5400" }, segs: [], nMembers: "8", nPer: "3", pos: "other", lap: "auto", lapMm: "" },
        { member: "B1", mark: "02", d: 12, shape: "11", dims: { A: "5200", B: "300" }, segs: [], nMembers: "8", nPer: "2", pos: "top", lap: "auto", lapMm: "" },
        { member: "B1", mark: "03", d: 8, shape: "51", dims: { A: "540", B: "190" }, segs: [], nMembers: "8", nPer: "32", pos: "other", lap: "auto", lapMm: "" },
        { member: "B2", mark: "04", d: 18, shape: "00", dims: { A: "6200" }, segs: [], nMembers: "6", nPer: "4", pos: "other", lap: "auto", lapMm: "" },
        { member: "B2", mark: "05", d: 8, shape: "51", dims: { A: "640", B: "240" }, segs: [], nMembers: "6", nPer: "38", pos: "other", lap: "auto", lapMm: "" },
      ],
    }),
  },
];
