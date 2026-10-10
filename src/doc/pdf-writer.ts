// =====================================================================
//  Document kit — the PDF writer (pure, no library)
//  · Pages are written as they arrive and their bytes released; the catalog, page tree and info close the file.
//  · Images: 4-bit /Indexed pages (Flate, PNG predictor) and /DCTDecode photos placed over their frames.
//  · Real metadata: Title, Author = the issuer, Subject, Creator, Producer, CreationDate; /Lang and, for Arabic,
//    /ViewerPreferences << /Direction /R2L >>. Text strings go out as UTF-16BE so Arabic titles survive.
// =====================================================================

export type PdfImage =
  | { kind: "indexed"; w: number; h: number; data: Uint8Array; palette: string[] }
  | { kind: "dct"; w: number; h: number; data: Uint8Array; gray?: boolean };

// placements in PDF points from the page's bottom-left
export type PdfPlacement = { img: PdfImage; x: number; y: number; w: number; h: number };
export type PdfPage = { wPt: number; hPt: number; items: PdfPlacement[] };
export type PdfInfo = { title: string; author: string; subject?: string; creator: string; lang: "ar" | "en"; created?: Date };

const enc = new TextEncoder();

export function pdfString(s: string) {
  // ASCII stays a literal; anything else becomes <FEFF…> UTF-16BE
  if (/^[\x20-\x7E]*$/.test(s)) return `(${s.replace(/([\\()])/g, "\\$1")})`;
  let hex = "FEFF";
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

export const pdfDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
};

const num = (n: number) => (Math.round(n * 1000) / 1000).toString();

export class PdfWriter {
  private parts: Uint8Array[] = [];
  private len = 0;
  private offsets: number[] = [];
  private next = 4; // 1 catalog · 2 pages · 3 info
  private kids: number[] = [];

  constructor(private info: PdfInfo) {
    this.push("%PDF-1.6\n%\xE2\xE3\xCF\xD3\n");
  }

  private push(b: Uint8Array | string) {
    const u = typeof b === "string" ? (/^[\x00-\x7F]*$/.test(b) ? enc.encode(b) : Uint8Array.from(b, (c) => c.charCodeAt(0) & 255)) : b;
    this.parts.push(u);
    this.len += u.length;
  }

  private obj(n: number, body: () => void) {
    this.offsets[n] = this.len;
    this.push(`${n} 0 obj\n`);
    body();
    this.push("\nendobj\n");
  }

  private stream(n: number, dict: string, data: Uint8Array) {
    this.obj(n, () => {
      this.push(`<< ${dict} /Length ${data.length} >>\nstream\n`);
      this.push(data);
      this.push("\nendstream");
    });
  }

  private image(img: PdfImage): number {
    const n = this.next++;
    if (img.kind === "indexed") {
      const pal = img.palette.map((h) => h.slice(1).toUpperCase()).join("");
      const hival = img.palette.length - 1;
      this.stream(n,
        `/Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace [/Indexed /DeviceRGB ${hival} <${pal}>] ` +
        `/BitsPerComponent 4 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 4 /Columns ${img.w} >>`,
        img.data);
    } else {
      this.stream(n,
        `/Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /${img.gray ? "DeviceGray" : "DeviceRGB"} ` +
        `/BitsPerComponent 8 /Filter /DCTDecode`,
        img.data);
    }
    return n;
  }

  addPage(page: PdfPage) {
    const names: string[] = [];
    const draws: string[] = [];
    page.items.forEach((it, i) => {
      const n = this.image(it.img);
      names.push(`/Im${i} ${n} 0 R`);
      draws.push(`q ${num(it.w)} 0 0 ${num(it.h)} ${num(it.x)} ${num(it.y)} cm /Im${i} Do Q`);
    });
    const content = enc.encode(draws.join("\n"));
    const cn = this.next++;
    this.stream(cn, "", content);
    const pn = this.next++;
    this.obj(pn, () =>
      this.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.wPt)} ${num(page.hPt)}] /Resources << /XObject << ${names.join(" ")} >> >> /Contents ${cn} 0 R >>`));
    this.kids.push(pn);
  }

  get pageCount() {
    return this.kids.length;
  }

  finish(): Uint8Array {
    const i = this.info;
    const rtl = i.lang === "ar" ? " /ViewerPreferences << /Direction /R2L >>" : "";
    this.obj(1, () => this.push(`<< /Type /Catalog /Pages 2 0 R /Lang ${pdfString(i.lang)}${rtl} >>`));
    this.obj(2, () => this.push(`<< /Type /Pages /Kids [${this.kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${this.kids.length} >>`));
    this.obj(3, () =>
      this.push(`<< /Title ${pdfString(i.title)} /Author ${pdfString(i.author)}${i.subject ? ` /Subject ${pdfString(i.subject)}` : ""}` +
        ` /Creator ${pdfString(i.creator)} /Producer (EngSpace doc kit 1) /CreationDate (${pdfDate(i.created || new Date())}) >>`));
    const xref = this.len;
    const count = this.next;
    let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let n = 1; n < count; n++) x += `${String(this.offsets[n] ?? 0).padStart(10, "0")} 00000 n \n`;
    this.push(x);
    this.push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(this.len);
    let o = 0;
    for (const p of this.parts) {
      out.set(p, o);
      o += p.length;
    }
    this.parts = [];
    return out;
  }
}
