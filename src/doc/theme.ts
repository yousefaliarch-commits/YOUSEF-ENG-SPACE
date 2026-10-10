// =====================================================================
//  Document kit — page geometry, inks and type sizes (docs/TOOLS-BLUEPRINT.md §5a)
//  · Every length is in millimetres from the page's top-left; type sizes are in points.
//  · The palette is greyscale plus one accent on purpose: the raster backend stores each page as a 16-colour indexed image,
//    so rules and fills come out exact and text edges are within one grey step. PALETTE order is the PDF palette order.
// =====================================================================
import type { DocFont, Ink } from "./model";

export const MM_PER_PT = 25.4 / 72;
export const DPI = 240;
export const PX_PER_MM = DPI / 25.4;

export const PAGE = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
  top: 14,
  bottom: 16,
  side: 18,
} as const;

export const pageSize = (o: "portrait" | "landscape") => PAGE[o];

// the text block and the body area (the title block sits on page 1 above the body)
export const frame = (o: "portrait" | "landscape") => {
  const { w, h } = PAGE[o];
  return {
    left: PAGE.side,
    right: w - PAGE.side,
    width: w - 2 * PAGE.side,
    top: PAGE.top,
    bodyTop: PAGE.top + 12,            // pages 2+: under the running header (y 26 portrait)
    bodyBottom: h - PAGE.bottom,       // y 281 portrait
    footerRule: h - PAGE.bottom + 1,   // y 282
    footerBase: h - PAGE.bottom + 7,   // y 288
  };
};

export const INK: Record<Ink, string> = {
  ink: "#111111",
  ink80: "#3A3A3A",
  ink60: "#5C5C5C",
  rule: "#8A8A8A",
  hair: "#BDBDBD",
  fill: "#EBEBEB",
  wash: "#F5F5F5",
  accent: "#3F33A0",
  accentTint: "#E7E5F5",
  white: "#FFFFFF",
};

// 16 entries: the 10 named inks + a 6-step grey ramp for anti-aliased text edges
export const PALETTE: string[] = [
  INK.white, INK.ink, INK.ink80, INK.ink60, INK.rule, INK.hair, INK.fill, INK.wash, INK.accent, INK.accentTint,
  "#262626", "#4B4B4B", "#727272", "#A3A3A3", "#D4D4D4", "#7A72C0",
];

export const TYPE = {
  docTitle: { w: 700, pt: 18 } as DocFont,
  h1: { w: 600, pt: 12 } as DocFont,
  h2: { w: 600, pt: 10.5 } as DocFont,
  body: { w: 450, pt: 10 } as DocFont,
  cell: { w: 450, pt: 9 } as DocFont,
  cellBold: { w: 600, pt: 9 } as DocFont,
  head: { w: 600, pt: 8.5 } as DocFont,
  label: { w: 600, pt: 7.5 } as DocFont,
  value: { w: 450, pt: 9 } as DocFont,
  caption: { w: 450, pt: 8 } as DocFont,
  foot: { w: 450, pt: 7 } as DocFont,
  kpi: { w: 700, pt: 14 } as DocFont,
  tbTitle: { w: 700, pt: 13 } as DocFont,
};

// line height in mm for a font at a leading ratio (≥ 1.4 for Arabic)
export const lineMm = (f: DocFont, ratio = 1.45) => f.pt * ratio * MM_PER_PT;

// the canvas font for a DocFont at a given px-per-mm scale (450 has no file of its own: the 400 face draws it)
export const FONT_FAMILY = '"IBM Plex Sans Arabic", system-ui, sans-serif';
export const canvasFont = (f: DocFont, pxPerMm: number) =>
  `${f.w === 450 ? 400 : f.w} ${(f.pt * MM_PER_PT * pxPerMm).toFixed(2)}px ${FONT_FAMILY}`;
