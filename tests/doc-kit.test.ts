// The document kit (src/doc): layout pagination with a fixed-advance measurer, the lossless page encoder, the PDF writer,
// the content hash and the number / text helpers. Pure code — no canvas.
import { describe, expect, it } from "vitest";
import { unzlibSync } from "fflate";
import type { DocBlock, DocSpec, DrawOp, DrawPage } from "../src/doc/model";
import { docLayout, fingerprint, fixedMeasurer } from "../src/doc/layout";
import { encodeIndexed, unpackIndexed, hexRgb } from "../src/doc/encode";
import { PdfWriter, pdfString } from "../src/doc/pdf-writer";
import { canonical, contentHash } from "../src/doc/hash";
import { PALETTE } from "../src/doc/theme";
import { fmtNum, wrapText, latinDigits, MINUS } from "../src/doc/text";

const spec = (blocks: DocBlock[], over: Partial<DocSpec["meta"]> = {}, revisions: DocSpec["revisions"] = []): DocSpec => ({
  meta: {
    docType: "PP", docTypeName: "خطة صب · Pour plan", docNo: "TWR-AB-PP-0007", rev: "01", status: "issued", dateIso: "2026-10-10",
    lang: "ar", issuer: "شركة البناء الحديث", issuerRole: "contractor", appVersion: "0.28.0", profileLabel: "ecp203-site@1",
    engines: ["concrete@1.0.0"], hash: "7f3a91c20b5e44d1aa", ...over,
  },
  title: {
    parties: [
      { role: "client", name: "المالك" }, { role: "project", name: "برج النخيل" },
      { role: "consultant", name: "مكتب الاستشارات" }, { role: "contractor", name: "شركة البناء الحديث", issuer: true },
    ],
    title: "خطة صب سقف الدور الثالث", discipline: "إنشائي", location: "القاهرة الجديدة", reference: "S-301",
  },
  revisions,
  sections: [{ orientation: "portrait", blocks }],
  colophon: { generatedAt: "2026-10-10T08:00:00+03:00", appVersion: "0.28.0", backend: "raster", profiles: ["ecp203-site@1"], unverified: 1, overridden: [], hash: "7f3a91c20b5e44d1aa", disclaimer: "" },
});

const texts = (p: DrawPage) => p.ops.filter((o): o is Extract<DrawOp, { op: "text" }> => o.op === "text").map((o) => o.text);

const bigTable = (n: number): DocBlock => ({
  k: "table", id: "els", caption: "العناصر",
  cols: [
    { key: "mark", label: "العنصر", wMm: 40, align: "start" },
    { key: "desc", label: "الوصف", wMm: 84, align: "start" },
    { key: "vol", label: "الحجم", unit: "م³", wMm: 50, align: "end", num: { dp: 3 } },
  ],
  rows: Array.from({ length: n }, (_, i) => ({ cells: { mark: `C${i + 1}`, desc: "عمود خرساني", vol: 0.125 + i / 1000 } })),
  carry: { sumCols: ["vol"] },
});

describe("layout: pages, title block, footer", () => {
  it("a short document is one page with the title block, the issuer and «صفحة 1 من 1»", () => {
    const { pages, warnings } = docLayout(spec([{ k: "heading", num: "1", text: "البيانات" }, { k: "kv", cols: 2, rows: [{ label: "العنصر", value: "سقف" }] }]), fixedMeasurer);
    expect(pages.length).toBe(1);
    expect(warnings).toEqual([]);
    const t = texts(pages[0]);
    expect(t).toContain("خطة صب سقف الدور الثالث");
    expect(t).toContain("صفحة 1 من 1");
    expect(t).toContain("1/1");
    expect(t).toContain("7F3A 91C2");
    expect(t.some((s) => s.includes("Prepared with EngSpace"))).toBe(true);
    // no old promo line
    expect(t.some((s) => s.includes("منصة المهندسين الرسمية"))).toBe(false);
  });

  it("a draft prints the draft band and no fingerprint", () => {
    const { pages } = docLayout(spec([], { status: "draft", docNo: null, hash: "" }), fixedMeasurer);
    const t = texts(pages[0]);
    expect(t.some((s) => s.startsWith("مسودة — غير صادرة"))).toBe(true);
    expect(t).not.toContain("7F3A 91C2");
  });

  it("English documents read from the left and use English labels", () => {
    const { pages } = docLayout(spec([], { lang: "en" }), fixedMeasurer);
    const t = texts(pages[0]);
    expect(t).toContain("Page 1 of 1");
    expect(t.some((s) => s.startsWith("Title ·"))).toBe(true);
  });
});

describe("layout: a 120-row table", () => {
  const { pages } = docLayout(spec([bigTable(120)]), fixedMeasurer);
  it("breaks over ≥ 3 pages, repeats the header, numbers every page x / N", () => {
    expect(pages.length).toBeGreaterThanOrEqual(3);
    pages.forEach((p, i) => {
      expect(p.n).toBe(i + 1);
      expect(p.of).toBe(pages.length);
      expect(texts(p)).toContain(`صفحة ${i + 1} من ${pages.length}`);
      if (i > 0) expect(texts(p)).toContain("الحجم (م³)");
    });
  });
  it("«يُرحّل» on each page equals «ما قبله» on the next, and both equal the rows so far", () => {
    let running = 0;
    for (let i = 0; i < pages.length; i++) {
      const t = texts(pages[i]);
      const rows = t.filter((s) => /^C\d+$/.test(s)).map((s) => Number(s.slice(1)));
      const sumRows = rows.reduce((a, n) => a + (0.125 + (n - 1) / 1000), 0);
      const bf = t.indexOf("ما قبله · Brought forward");
      if (i > 0) {
        expect(bf).toBeGreaterThan(-1);
        expect(Number(t[bf + 1])).toBeCloseTo(running, 3);
      }
      running += sumRows;
      const cf = t.indexOf("يُرحّل · Carried forward");
      const continues = i < pages.length - 1 && texts(pages[i + 1]).some((x) => /^C\d+$/.test(x));
      if (continues) {
        expect(cf).toBeGreaterThan(-1);
        expect(Number(t[cf + 1])).toBeCloseTo(running, 3);
      }
    }
    const total = Array.from({ length: 120 }, (_, i) => 0.125 + i / 1000).reduce((a, b) => a + b, 0);
    expect(running).toBeCloseTo(total, 6);
  });
  it("at least 3 body rows on every page", () => {
    pages.forEach((p) => {
      const rows = texts(p).filter((s) => /^C\d+$/.test(s));
      if (rows.length) expect(rows.length).toBeGreaterThanOrEqual(3);
    });
  });
  it("numbers are fixed decimals with Latin digits and drawn LTR", () => {
    const nums = pages[0].ops.filter((o): o is Extract<DrawOp, { op: "text" }> => o.op === "text" && /^\d+\.\d{3}$/.test(o.text));
    expect(nums.length).toBeGreaterThan(5);
    expect(nums.every((o) => o.dir === "ltr")).toBe(true);
  });
});

describe("layout: keep-together rules", () => {
  it("the signature block is never split, and a heading never ends a page", () => {
    const filler: DocBlock = bigTable(29);
    const { pages } = docLayout(spec([filler, { k: "heading", num: "3", text: "التوقيعات" }, { k: "signatures", parties: [{ role: "أعدّ" }, { role: "راجع" }, { role: "اعتمد" }], stamp: true, statusBox: "ABC" }]), fixedMeasurer);
    const where = (s: string) => pages.findIndex((p) => texts(p).includes(s));
    const roles = ["أعدّ", "راجع", "اعتمد", "الختم · Stamp"].map(where);
    expect(new Set(roles).size).toBe(1);
    expect(where("التوقيعات")).toBe(roles[0]);
  });
  it("over-wide tables are scaled and reported, never thrown", () => {
    const wide: DocBlock = { k: "table", id: "w", caption: "", cols: [{ key: "a", label: "a", wMm: 150, align: "start" }, { key: "b", label: "b", wMm: 150, align: "start" }], rows: [{ cells: { a: "x", b: "y" } }] };
    const { warnings } = docLayout(spec([wide]), fixedMeasurer);
    expect(warnings[0]).toMatch(/scaled/);
  });
  it("more than 4 revisions: the latest 4 on the title page, the rest in an appendix", () => {
    const revs = Array.from({ length: 6 }, (_, i) => ({ rev: `0${i}`, dateIso: `2026-0${i + 1}-01`, desc: `تعديل ${i}`, prepared: "أ", checked: "ب", approved: "ج" }));
    const { pages } = docLayout(spec([], {}, revs), fixedMeasurer);
    expect(texts(pages[0]).some((s) => s.startsWith("و 2 مراجعات سابقة"))).toBe(true);
    expect(texts(pages[pages.length - 1])).toContain("ملحق المراجعات");
  });
  it("the fingerprint is 4 groups of 4 hex", () => {
    expect(fingerprint("7f3a91c20b5e44d1ffff")).toBe("7F3A 91C2 0B5E 44D1");
  });
});

describe("encoder: lossless 16-colour pages", () => {
  it("palette pixels survive the round trip exactly", () => {
    const w = 37, h = 11;
    const px = new Uint8ClampedArray(w * h * 4);
    const want = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const k = (i * 7) % PALETTE.length;
      want[i] = k;
      const [r, g, b] = hexRgb(PALETTE[k]);
      px.set([r, g, b, 255], i * 4);
    }
    const img = encodeIndexed(px, w, h, PALETTE);
    expect(unpackIndexed(unzlibSync(img.data), w, h)).toEqual(want);
  });
  it("a white page compresses to almost nothing", () => {
    const w = 1984, h = 40;
    const px = new Uint8ClampedArray(w * h * 4).fill(255);
    expect(encodeIndexed(px, w, h, PALETTE).data.length).toBeLessThan(400);
  });
});

describe("PDF writer", () => {
  const ascii = (u: Uint8Array) => Array.from(u, (b) => String.fromCharCode(b)).join("");
  it("header, page tree, Lang, R2L, Info, and xref offsets that point at their objects", () => {
    const w = new PdfWriter({ title: "خطة صب · TWR-AB-PP-0007", author: "شركة البناء", creator: "EngSpace 0.28.0", lang: "ar" });
    const img = encodeIndexed(new Uint8ClampedArray(4 * 4 * 4).fill(255), 4, 4, PALETTE);
    w.addPage({ wPt: 595.28, hPt: 841.89, items: [{ img: { kind: "indexed", ...img }, x: 0, y: 0, w: 595.28, h: 841.89 }] });
    w.addPage({ wPt: 841.89, hPt: 595.28, items: [] });
    const s = ascii(w.finish());
    expect(s.startsWith("%PDF-1.6")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("/Count 2");
    expect(s).toContain("/Lang (ar)");
    expect(s).toContain("/Direction /R2L");
    expect(s).toContain("/Indexed /DeviceRGB 15");
    expect(s).toContain("/Title <FEFF");
    const xref = Number(s.match(/startxref\n(\d+)/)![1]);
    const table = s.slice(xref).split("\n").slice(3).filter((l) => / n $/.test(l)).map((l) => Number(l.slice(0, 10)));
    table.forEach((off, i) => expect(s.slice(off, off + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
  });
  it("strings: ASCII literal, everything else UTF-16BE", () => {
    expect(pdfString("TWR (A)")).toBe("(TWR \\(A\\))");
    expect(pdfString("ب")).toBe("<FEFF0628>");
  });
});

describe("hash and text helpers", () => {
  it("key order never changes the hash", async () => {
    expect(canonical({ b: 1, a: { d: [1, 2], c: "x" } })).toBe(canonical({ a: { c: "x", d: [1, 2] }, b: 1 }));
    expect(await contentHash({ b: 1, a: 2 })).toBe(await contentHash({ a: 2, b: 1 }));
    expect(await contentHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
  it("numbers: fixed decimals, separators from 10,000, a real minus", () => {
    expect(fmtNum(9876.5, 1)).toBe("9876.5");
    expect(fmtNum(12345.6, 2)).toBe("12,345.60");
    expect(fmtNum(-3.2, 2)).toBe(`${MINUS}3.20`);
    expect(fmtNum(-0.0001, 2)).toBe("0.00");
    expect(fmtNum(NaN)).toBe("—");
    expect(latinDigits("١٢٫٥")).toBe("12٫5");
  });
  it("wrapping breaks overlong words instead of overflowing", () => {
    const f = { w: 450 as const, pt: 10 };
    const ls = wrapText("x".repeat(100), 20, f, fixedMeasurer);
    expect(ls.length).toBeGreaterThan(3);
    ls.forEach((l) => expect(fixedMeasurer.width(l, f)).toBeLessThanOrEqual(20 + 1e-9));
  });
});
