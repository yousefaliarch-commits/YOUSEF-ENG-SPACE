// =====================================================================
//  Document kit — the document model (pure data, no DOM, no side effects)
//  · A tool builds a DocSpec; layout.ts turns it into DrawPages (physical mm from the page's top-left, page count known up
//    front); a backend (raster now, vector later) draws those pages. The on-screen preview draws the same pages.
//  · The title block belongs to the ISSUER (the member's firm), never EngSpace; EngSpace signs one footer line.
//  · Numbers, units, codes and dates are LTR spans; Latin digits everywhere in reports.
//  See docs/TOOLS-BLUEPRINT.md §5a.
// =====================================================================

export type DocLang = "ar" | "en";
export type DocStatus = "draft" | "issued" | "superseded" | "void";

export type LogoRef = { id: string; path?: string; local?: string; w: number; h: number };
export type PhotoRef = { id: string; path?: string; local?: string; w: number; h: number; caption?: string; at: number };

export type DocMeta = {
  docType: string;          // "PP", "BBS", "LB", "DR", "TBT", "PTW", "MR", "IR", …
  docTypeName: string;      // «خطة صب · Pour plan»
  docNo: string | null;     // null → «مسودة» band, no QR
  rev: string;
  status: DocStatus;
  dateIso: string;
  lang: DocLang;
  issuer: string;           // the issuing party's name (PDF Author), never "EngSpace"
  appVersion: string;
  profileLabel: string;
  hash: string;
  qr?: string;
};

export type DocTextSpan = { t: string; dir?: "ltr" | "rtl" | "auto"; w?: 450 | 600 | 700 };
export type DocText = string | { spans: DocTextSpan[] };

export type VPath = {
  d: string;                // SVG path syntax in local mm
  fill?: boolean;
  dash?: number[];
  label?: { x: number; y: number; t: string };
};

export type DocCol = {
  key: string;
  label: string;
  unit?: string;
  wMm: number;
  align: "start" | "end" | "center";
  num?: { dp: number };
  mark?: boolean;
  sketch?: boolean;
};

export type DocRow = {
  cells: Record<string, DocText | number | null>;
  kind?: "item" | "section" | "subtotal" | "total";
  mark?: "ok" | "fail" | "na";
  sketch?: VPath[];
};

export type SignParty = { role: string; name?: string; title?: string; syndicateNo?: string };

export type DocBlock =
  | { k: "heading"; num?: string; text: string }
  | { k: "kv"; cols: 2 | 3; rows: { label: string; value: DocText; wide?: boolean }[] }
  | { k: "kpis"; items: { label: string; value: string; unit?: string; mark?: "ok" | "fail" | "warn" }[] }
  | {
      k: "table"; id: string; caption: string; cols: DocCol[]; rows: DocRow[];
      carry?: { sumCols: string[] }; totals?: DocRow; grid?: boolean; zebra?: boolean; minRowsBeforeBreak?: number;
    }
  | { k: "checks"; rows: { label: string; value: string; limit: string; clause: string; ok: boolean | null; unverified?: boolean }[] }
  | { k: "notes"; title?: string; text: DocText }
  | { k: "sketch"; wMm: number; hMm: number; paths: VPath[]; caption?: string }
  | { k: "signatures"; parties: SignParty[]; stamp: boolean; statusBox?: "ABC" }
  | { k: "photos"; items: { ref: PhotoRef; caption: string }[]; grid: "2x3" | "2x2" }
  | { k: "disclaimer"; text: string }
  | { k: "pageBreak" };

export type DocSection = { orientation: "portrait" | "landscape"; blocks: DocBlock[] };

export type TitleParty = {
  role: "client" | "project" | "consultant" | "contractor";
  name: string;
  nameEn?: string;
  logo?: LogoRef;
  issuer?: boolean;
};

export type TitleBlockData = {
  parties: TitleParty[];
  title: string;
  discipline: string;
  location: string;
  reference: string;
  scale?: string;
};

export type RevRow = { rev: string; dateIso: string; desc: string; prepared: string; checked: string; approved: string };

export type ColophonData = {
  generatedAt: string;
  appVersion: string;
  backend: string;
  profiles: string[];
  unverified: number;
  overridden: string[];
  hash: string;
  disclaimer: string;
};

export type DocSpec = { meta: DocMeta; title: TitleBlockData; revisions: RevRow[]; sections: DocSection[]; colophon: ColophonData };

// ---- what layout produces and backends draw ----
export type Ink = "ink" | "ink80" | "ink60" | "rule" | "hair" | "fill" | "wash" | "accent" | "accentTint" | "white";
export type DocFont = { w: 450 | 600 | 700; pt: number };

export type DrawOp =
  | { op: "text"; x: number; y: number; f: DocFont; ink: Ink; dir: "rtl" | "ltr"; text: string; align?: "start" | "end" | "center" }
  | { op: "rule"; x1: number; y1: number; x2: number; y2: number; pt: number; ink: Ink; dash?: number[] }
  | { op: "rect"; x: number; y: number; w: number; h: number; fill?: Ink; stroke?: Ink; pt?: number; dash?: number[] }
  | { op: "image"; ref: PhotoRef | LogoRef; x: number; y: number; w: number; h: number }
  | { op: "path"; x: number; y: number; scale: number; d: VPath[]; ink: Ink; pt: number }
  | { op: "qr"; x: number; y: number; mm: number; data: string };

export type DrawPage = { n: number; of: number; orientation: "portrait" | "landscape"; ops: DrawOp[] };

export interface DocMeasurer {
  width(text: string, f: DocFont): number;   // mm
  ascent(f: DocFont): number;                 // mm
  descent(f: DocFont): number;                // mm
}

export type DocLayoutResult = { pages: DrawPage[]; warnings: string[] };

export interface DocBackend {
  id: "raster" | "vector";
  begin(meta: DocMeta): Promise<void>;
  page(p: DrawPage): Promise<void>;
  end(): Promise<Blob>;
  abort(): void;
}

export type DocRenderResult = { status: "ok"; pdf: Blob; pages: number } | { status: "cancelled" };
