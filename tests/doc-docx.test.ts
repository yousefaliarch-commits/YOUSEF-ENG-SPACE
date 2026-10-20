// The document kit's Word export (src/doc/docx.ts): a DocSpec becomes a valid, editable .docx package — the expected
// parts and no docProps/app.xml, real tables, right-to-left marks for Arabic, escaping, white-label properties and a
// landscape section. Pure code: the zip is opened with fflate and the XML checked as text.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import type { DocBlock, DocSpec } from "../src/doc/model";
import { DOCX_MIME, documentXml, specDocx } from "../src/doc/docx";
import { module as bbs } from "../src/features/tools/rebar/bbs";
import { module as toolbox } from "../src/features/tools/site/toolbox";
import { module as permit } from "../src/features/tools/site/permit";

const spec = (blocks: DocBlock[], over: Partial<DocSpec["meta"]> = {}, extra: DocSpec["sections"] = []): DocSpec => ({
  meta: {
    docType: "PP", docTypeName: "خطة صب · Pour plan", docNo: "TWR-AB-PP-0007", rev: "01", status: "issued", dateIso: "2026-10-10",
    lang: "ar", issuer: "شركة البناء الحديث", issuerRole: "contractor", appVersion: "0.28.0", profileLabel: "ecp203-site@1",
    engines: ["concrete@1.0.0"], hash: "7f3a91c20b5e44d1aa", ...over,
  },
  title: {
    parties: [
      { role: "client", name: "المالك" },
      { role: "project", name: "برج النخيل" },
      { role: "contractor", name: "شركة البناء الحديث", issuer: true },
    ],
    title: "خطة صب سقف الدور الثالث", discipline: "إنشائي", location: "القاهرة الجديدة", reference: "S-301",
  },
  revisions: [],
  sections: [{ orientation: "portrait", blocks }, ...extra],
  colophon: {
    generatedAt: "2026-10-10T08:00:00+03:00", appVersion: "0.28.0", backend: "raster", profiles: ["ecp203-site@1"],
    unverified: 0, overridden: [], hash: "7f3a91c20b5e44d1aa", disclaimer: "",
  },
});

const blocks: DocBlock[] = [
  { k: "heading", num: "1", text: "العناصر" },
  { k: "kv", cols: 2, rows: [{ label: "الخرسانة", value: "C30" }, { label: "الحجم", value: { spans: [{ t: "12.5 م³", dir: "ltr", w: 600 }] } }] },
  { k: "kpis", items: [{ label: "الحجم الكلي", value: "12.50", unit: "م³", mark: "ok" }] },
  {
    k: "table", id: "els", caption: "جدول العناصر",
    cols: [
      { key: "mark", label: "العنصر", wMm: 40, align: "start" },
      { key: "vol", label: "الحجم", unit: "م³", wMm: 50, align: "end", num: { dp: 3 } },
    ],
    rows: [
      { cells: { mark: "C1 <A&B>", vol: 0.1254 } },
      { cells: { mark: "⁦C2⁩", vol: 2 } },
    ],
    totals: { cells: { mark: "الإجمالي", vol: 2.1254 } },
  },
  { k: "checks", rows: [{ label: "الهبوط", value: "120", limit: "≤ 150", clause: "ECP 203", ok: true }] },
  { k: "notes", title: "ملاحظات", text: "السطر الأول\nالسطر الثاني" },
  { k: "para", text: "بند في قائمة", bullet: true },
  { k: "signatures", parties: [{ role: "أعدّ", name: "م. أحمد", syndicateNo: "12345" }, { role: "اعتمد" }], stamp: true },
  { k: "photos", items: [], grid: "2x2" },
  { k: "disclaimer", text: "للاستخدام الهندسي فقط" },
  { k: "pageBreak" },
];

// every opening tag closed in order (self-closing tags skipped): enough to catch a broken writer
function balanced(xml: string): boolean {
  const stack: string[] = [];
  const body = xml.replace(/<\?xml[^>]*\?>/, "");
  for (const m of body.matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

describe("specDocx — the editable Word copy of a tool document", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const files = unzipSync(specDocx(spec(blocks), now));
  const doc = strFromU8(files["word/document.xml"]);
  const core = strFromU8(files["docProps/core.xml"]);

  it("is a WordprocessingML package with the expected parts and no app.xml", () => {
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/core.xml",
      "word/_rels/document.xml.rels",
      "word/document.xml",
      "word/numbering.xml",
      "word/styles.xml",
    ]);
    expect(files["docProps/app.xml"]).toBeUndefined();
    expect(DOCX_MIME).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    for (const k of Object.keys(files)) expect(balanced(strFromU8(files[k])), k).toBe(true);
  });

  it("writes the title block, real tables and right-to-left marks for Arabic", () => {
    expect(doc).toContain("<w:tbl>");
    expect(doc).toContain("خطة صب سقف الدور الثالث");
    expect(doc).toContain("TWR-AB-PP-0007");
    expect(doc).toContain("العنصر");
    expect(doc).toContain("الحجم (م³)");
    expect(doc).toContain("<w:tblHeader/>");
    expect(doc).toContain("<w:bidi/>");
    expect(doc).toContain("<w:rtl/>");
    expect(doc).toContain("<w:bidiVisual/>");
    // numbers with the column's decimals, Latin digits
    expect(doc).toContain("0.125");
    expect(doc).toContain("2.000");
    // a real Word list for bullets, a page break, the photo placeholder
    expect(doc).toContain('<w:numId w:val="1"/>');
    expect(doc).toContain('<w:br w:type="page"/>');
    expect(doc).toContain("Photos are in the PDF version");
    expect(doc).toContain("رقم القيد: 12345");
  });

  it("escapes markup and strips the isolate marks the PDF needs", () => {
    expect(doc).toContain("C1 &lt;A&amp;B&gt;");
    expect(doc).not.toContain("<A&B>");
    expect(doc).not.toMatch(/[⁦-⁩‪-‮]/);
    expect(doc).toContain(">C2<");
  });

  it("names the issuer as the author and never the app", () => {
    expect(core).toContain("<dc:creator>شركة البناء الحديث</dc:creator>");
    expect(core).toContain("<dc:title>خطة صب سقف الدور الثالث</dc:title>");
    expect(core).toContain("<dc:language>ar-EG</dc:language>");
    expect(core).not.toMatch(/EngSpace/i);
  });

  it("marks a draft and gives an English document no right-to-left marks", () => {
    const en = documentXml(spec([{ k: "para", text: "Hello" }], { lang: "en", docNo: null }));
    expect(en).toContain("Draft — مسودة");
    expect(en).not.toContain("<w:bidi/>");
    expect(en).not.toContain("<w:rtl/>");
    const enCore = strFromU8(unzipSync(specDocx(spec([], { lang: "en" }), now))["docProps/core.xml"]);
    expect(enCore).toContain("<dc:language>en-GB</dc:language>");
  });

  it("gives a landscape section its own turned page", () => {
    const x = documentXml(spec([{ k: "para", text: "portrait" }], {}, [{ orientation: "landscape", blocks: [{ k: "para", text: "wide" }] }]));
    expect(x).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    expect(x).toContain('<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>');
    // the portrait section closes inside a paragraph, the landscape one at the end of the body
    expect(x).toMatch(/<w:p><w:pPr><w:sectPr><w:pgSz w:w="11906"/);
    expect(x).toMatch(/<w:sectPr><w:pgSz w:w="16838"[^]*<\/w:sectPr><\/w:body>/);
  });
});

describe("specDocx — real tool documents", () => {
  const docOf = (mod: any) => ({
    id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(mod.blank()),
    dateIso: "2026-10-20", docNo: null, rev: "00", status: "draft", body: mod.blank(), profile: mod.profile, photos: {}, log: [],
  }) as any;

  it.each([["bbs", bbs], ["toolbox", toolbox], ["permit", permit]])("%s builds a well-formed Word file", (_k, mod: any) => {
    const s = mod.build(docOf(mod), null) as DocSpec;
    const files = unzipSync(specDocx(s));
    const xml = strFromU8(files["word/document.xml"]);
    expect(balanced(xml)).toBe(true);
    expect(xml).toContain("<w:tbl>");
    expect(strFromU8(files["docProps/core.xml"])).not.toMatch(/EngSpace/i);
  });
});
