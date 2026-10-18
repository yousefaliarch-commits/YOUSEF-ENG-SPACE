// =====================================================================
//  CV review — the rebuilt CV as an editable Word document (v25), built on the device
//  A minimal, valid WordprocessingML package (OOXML) zipped with fflate: styles for the name, the title line, headings,
//  role lines and bullets (a real Word bullet list), A4 with 2 cm margins, right-to-left paragraphs and runs for Arabic.
//  White-label like the PDF: the engineer is the author; there is no app name in the text, the properties or the
//  package (no docProps/app.xml, which would name the producing application).
// =====================================================================
import { strToU8, zipSync } from "fflate";
import type { CVDraft } from "./rebuild";

const ACCENT = "3F33A0";
const INK2 = "52525B";
const RULE = "C9C9D1";

const esc = (s: string) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function headingOf(d: CVDraft) {
  return d.lang === "ar" ? "الملخص المهني" : "Professional Summary";
}

// one paragraph; rtl documents mark both the paragraph (bidi) and its run (rtl)
function para(text: string, style: string, rtl: boolean, extra = "") {
  const pPr = `<w:pPr><w:pStyle w:val="${style}"/>${rtl ? "<w:bidi/>" : ""}${extra}</w:pPr>`;
  const rPr = rtl ? "<w:rPr><w:rtl/></w:rPr>" : "";
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

const bullet = (text: string, rtl: boolean) => para(text, "CVBullet", rtl, `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`);

export function documentXml(d: CVDraft): string {
  const rtl = d.lang === "ar";
  const body: string[] = [];
  body.push(para(d.name, "CVName", rtl));
  if (d.headline) body.push(para(d.headline, "CVTitle", rtl));
  const meta = [d.contact, d.lead, d.personal.join(" · ")].filter(Boolean);
  meta.forEach((m, i) => {
    // the accent rule under the last contact line closes the letterhead, as in the PDF
    const rule = i === meta.length - 1 ? `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="${ACCENT}"/></w:pBdr>` : "";
    body.push(para(m, "CVMeta", rtl, rule));
  });
  if (d.summary) {
    body.push(para(headingOf(d), "Heading1", rtl));
    body.push(para(d.summary, "CVBody", rtl));
  }
  d.sections.forEach((s) => {
    body.push(para(s.title, "Heading1", rtl));
    s.items.forEach((it) => {
      if (it.head) body.push(para(it.head, "CVRole", rtl));
      it.lines.forEach((l) => body.push(it.head ? bullet(l, rtl) : para(l, "CVBody", rtl)));
    });
  });
  const sect =
    `<w:sectPr>${rtl ? "<w:bidi/>" : ""}<w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${body.join("")}${sect}</w:body></w:document>`
  );
}

function stylesXml(d: CVDraft): string {
  const rtl = d.lang === "ar";
  const lang = rtl ? `<w:lang w:val="ar-EG" w:bidi="ar-EG"/>` : `<w:lang w:val="en-GB" w:bidi="ar-EG"/>`;
  const font = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial" w:eastAsia="Calibri"/>`;
  const st = (id: string, name: string, ppr: string, rpr: string, extra = "") =>
    `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${extra}<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="20"/><w:szCs w:val="20"/>${lang}</w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    st("CVName", "CV Name", `<w:spacing w:after="40"/>`, `<w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/>`) +
    st("CVTitle", "CV Title", `<w:spacing w:after="60"/>`, `<w:b/><w:bCs/><w:color w:val="${ACCENT}"/><w:sz w:val="24"/><w:szCs w:val="24"/>`) +
    st("CVMeta", "CV Contact", `<w:spacing w:after="20"/>`, `<w:color w:val="${INK2}"/><w:sz w:val="18"/><w:szCs w:val="18"/>`) +
    `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="CVBody"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${RULE}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr>` +
    `<w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>` +
    st("CVBody", "CV Body", `<w:spacing w:after="80"/>`, `<w:sz w:val="20"/><w:szCs w:val="20"/>`) +
    st("CVRole", "CV Role", `<w:keepNext/><w:spacing w:before="120" w:after="40"/>`, `<w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/>`) +
    st("CVBullet", "CV Bullet", `<w:spacing w:after="40"/><w:ind w:left="360" w:hanging="240"/>`, `<w:sz w:val="19"/><w:szCs w:val="19"/>`) +
    `</w:styles>`
  );
}

const NUMBERING =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>` +
  `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>` +
  `<w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr><w:rPr><w:color w:val="${ACCENT}"/></w:rPr></w:lvl></w:abstractNum>` +
  `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
  `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
  `</Relationships>`;

const DOC_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
  `</Relationships>`;

function coreXml(d: CVDraft, now: Date): string {
  const who = esc(d.name.replace(/\[[^\]]*\]/g, "").trim());
  const title = esc(`${d.name.replace(/\[[^\]]*\]/g, "").trim() || ""}${d.name ? " — " : ""}${d.lang === "ar" ? "السيرة الذاتية" : "Curriculum Vitae"}`);
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${title}</dc:title><dc:creator>${who}</dc:creator><cp:lastModifiedBy>${who}</cp:lastModifiedBy><dc:language>${d.lang === "ar" ? "ar-EG" : "en-GB"}</dc:language>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    `</cp:coreProperties>`
  );
}

// the .docx bytes (a zip of the parts above)
export function draftDocx(d: CVDraft, now = new Date()): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "word/document.xml": strToU8(documentXml(d)),
    "word/styles.xml": strToU8(stylesXml(d)),
    "word/numbering.xml": strToU8(NUMBERING),
    "word/_rels/document.xml.rels": strToU8(DOC_RELS),
    "docProps/core.xml": strToU8(coreXml(d, now)),
  }, { level: 6 });
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
