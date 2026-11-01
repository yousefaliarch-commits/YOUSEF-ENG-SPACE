// =====================================================================
//  Quantity take-off (حصر الكميات) — the pure engine. No React, no DOM; tests/tools-qto.test.ts holds its vectors.
//  · One line = one measured item (WBS location, description, kind) with its count and dimensions; the gross quantity comes from
//    the kind's geometry, and openings are deducted only as the chosen measurement rules allow — every deduction says which
//    rule applied, so the engineer can defend each figure in front of the consultant.
//  · Measurement rules differ between methods of measurement and contracts (thresholds of 0.1 · 0.5 · 1 · 3 m² are all in use),
//    so they are a profile: IS 1200 (published thresholds), «deduct every opening», or the contract's own values. No profile is
//    presented as an Egyptian code clause.
//  Kinds and their geometry (n = count):
//    excavation · backfill · concrete · fill     m³  n × L × W × H
//    masonry                                     m³  n × L × H × t   (or m² = n × L × H when measured by area)
//    plaster · paint                             m²  n × L × H × faces (wall faces) — ceilings: L × W with faces = 1
//    tiles · screed                              m²  n × L × W
//    waterproof                                  m²  n × (L × W + 2 (L + W) × upturn)
//    skirting                                    m   n × L (perimeter), less door widths
//    other                                       as typed: n × L × W × H with blank dimensions read as 1
// =====================================================================

export const QTO_ENGINE = "qto@1.0.0";

export type QtoKind = "excavation" | "backfill" | "fill" | "concrete" | "masonry" | "plaster" | "paint" | "tiles" | "screed" | "waterproof" | "skirting" | "other";
export type QtoOpening = { id: string; label: string; n: number; w: number; h: number };
export type QtoItem = {
  id: string; kind: QtoKind; wbs: string; desc: string;
  n: number; L: number; W: number; H: number; t: number;     // t: masonry thickness (m)
  faces: 1 | 2;                                             // plaster / paint: faces of the wall measured
  byArea: boolean;                                          // masonry measured in m² instead of m³
  upturn: number;                                           // waterproofing upturn height (m)
  ceiling: boolean;                                         // plaster / paint on a ceiling: L × W
  openings: QtoOpening[];
};
export type QtoRules = {
  id: "is1200" | "all" | "contract";
  masonryMin: number;       // openings ≤ this (m²) are not deducted from masonry
  finishMin: number;        // plaster / paint: openings ≤ this are not deducted
  finishOneFace: number;    // plaster / paint on two faces: openings ≤ this are deducted from one face only
  tilesMin: number;         // tiles / screed / waterproofing
};
export const RULES: Record<"is1200" | "all", QtoRules> = {
  // IS 1200: masonry openings > 0.1 m² deducted; plaster openings ≤ 0.5 m² not deducted, 0.5–3 m² one face, > 3 m² both faces
  is1200: { id: "is1200", masonryMin: 0.1, finishMin: 0.5, finishOneFace: 3, tilesMin: 0.1 },
  all: { id: "all", masonryMin: 0, finishMin: 0, finishOneFace: 0, tilesMin: 0 },
};

export const UNIT: Record<QtoKind, string> = {
  excavation: "م³", backfill: "م³", fill: "م³", concrete: "م³", masonry: "م³", plaster: "م²", paint: "م²", tiles: "م²", screed: "م²", waterproof: "م²", skirting: "م.ط", other: "",
};
export const unitOf = (it: Pick<QtoItem, "kind" | "byArea">) => (it.kind === "masonry" && it.byArea ? "م²" : UNIT[it.kind]);

export type QtoDeduct = { label: string; n: number; w: number; h: number; area: number; faces: number; qty: number; rule: string };
export type QtoLine = { id: string; gross: number; deduct: number; net: number; unit: string; expr: string; deductions: QtoDeduct[]; issues: string[] };
export type QtoTotal = { kind: QtoKind; unit: string; net: number; lines: number };
export type QtoResult = { lines: QtoLine[]; totals: QtoTotal[]; issues: { id: string; text: string }[] };

const f3 = (x: number) => x.toFixed(3).replace(/\.?0+$/, "") || "0";
const pos = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

function grossOf(it: QtoItem): { q: number; expr: string } {
  const n = pos(it.n) || 1, L = pos(it.L), W = pos(it.W), H = pos(it.H);
  switch (it.kind) {
    case "masonry":
      return it.byArea ? { q: n * L * H, expr: `${n} × ${f3(L)} × ${f3(H)}` } : { q: n * L * H * pos(it.t), expr: `${n} × ${f3(L)} × ${f3(H)} × ${f3(pos(it.t))}` };
    case "plaster":
    case "paint":
      return it.ceiling ? { q: n * L * W, expr: `${n} × ${f3(L)} × ${f3(W)}` } : { q: n * L * H * it.faces, expr: `${n} × ${f3(L)} × ${f3(H)} × ${it.faces} وجه` };
    case "tiles":
    case "screed":
      return { q: n * L * W, expr: `${n} × ${f3(L)} × ${f3(W)}` };
    case "waterproof": {
      const up = pos(it.upturn);
      return { q: n * (L * W + 2 * (L + W) * up), expr: `${n} × (${f3(L)} × ${f3(W)} + 2 × (${f3(L)} + ${f3(W)}) × ${f3(up)})` };
    }
    case "skirting":
      return { q: n * L, expr: `${n} × ${f3(L)}` };
    case "other": {
      const d = [L, W, H].map((x) => x || 1);
      return { q: n * d[0] * d[1] * d[2], expr: `${n} × ${d.map(f3).join(" × ")}` };
    }
    default:
      return { q: n * L * W * H, expr: `${n} × ${f3(L)} × ${f3(W)} × ${f3(H)}` };
  }
}

function deductionsOf(it: QtoItem, r: QtoRules): QtoDeduct[] {
  const out: QtoDeduct[] = [];
  const n = pos(it.n) || 1;
  for (const o of it.openings || []) {
    const k = (pos(o.n) || 1) * n, w = pos(o.w), h = pos(o.h), a = w * h;
    if (!w) continue;
    if (it.kind === "skirting") {
      out.push({ label: o.label, n: k, w, h: 1, area: w, faces: 1, qty: k * w, rule: "يُخصم عرض الباب من الوزرة" });
    } else if (it.kind === "masonry") {
      const ok = a > r.masonryMin;
      out.push({ label: o.label, n: k, w, h, area: a, faces: ok ? 1 : 0, qty: ok ? k * a * (it.byArea ? 1 : pos(it.t)) : 0, rule: ok ? `${f3(a)} م² > ${f3(r.masonryMin)} م² ← يُخصم` : `${f3(a)} م² ≤ ${f3(r.masonryMin)} م² ← لا يُخصم` });
    } else if (it.kind === "plaster" || it.kind === "paint") {
      if (it.ceiling) {
        const ok = a > r.finishMin;
        out.push({ label: o.label, n: k, w, h, area: a, faces: ok ? 1 : 0, qty: ok ? k * a : 0, rule: ok ? `${f3(a)} م² > ${f3(r.finishMin)} م² ← يُخصم` : `${f3(a)} م² ≤ ${f3(r.finishMin)} م² ← لا يُخصم` });
        continue;
      }
      let faces = 0;
      let rule: string;
      if (a <= r.finishMin && r.finishMin > 0) rule = `${f3(a)} م² ≤ ${f3(r.finishMin)} م² ← لا يُخصم`;
      else if (it.faces === 2 && a <= r.finishOneFace) { faces = 1; rule = `${f3(r.finishMin)} < ${f3(a)} م² ≤ ${f3(r.finishOneFace)} م² ← يُخصم من وجه واحد`; }
      else { faces = it.faces; rule = it.faces === 2 ? `${f3(a)} م² > ${f3(r.finishOneFace)} م² ← يُخصم من الوجهين` : `${f3(a)} م² > ${f3(r.finishMin)} م² ← يُخصم`; }
      out.push({ label: o.label, n: k, w, h, area: a, faces, qty: k * a * faces, rule });
    } else if (it.kind === "tiles" || it.kind === "screed" || it.kind === "waterproof") {
      const ok = a > r.tilesMin;
      out.push({ label: o.label, n: k, w, h, area: a, faces: ok ? 1 : 0, qty: ok ? k * a : 0, rule: ok ? `${f3(a)} م² > ${f3(r.tilesMin)} م² ← يُخصم` : `${f3(a)} م² ≤ ${f3(r.tilesMin)} م² ← لا يُخصم` });
    } else {
      // volumes (excavation, concrete…): an opening is a void through the element: deducted in full
      const ok = a > 0;
      const depth = it.kind === "other" ? 1 : pos(it.H) || 1;
      out.push({ label: o.label, n: k, w, h, area: a, faces: 1, qty: ok ? k * a * depth : 0, rule: "فراغ داخل العنصر ← يُخصم" });
    }
  }
  return out;
}

export function computeQto(items: QtoItem[], rules: QtoRules): QtoResult {
  const issues: { id: string; text: string }[] = [];
  const lines: QtoLine[] = items.map((it) => {
    const g = grossOf(it);
    const ds = deductionsOf(it, rules);
    const deduct = ds.reduce((a, d) => a + d.qty, 0);
    const li: string[] = [];
    if (g.q <= 0) li.push("أبعاد ناقصة — الكمية صفر");
    if (deduct > g.q + 1e-9) li.push(`الخصومات (${f3(deduct)}) أكبر من الإجمالي (${f3(g.q)}) — راجع أبعاد الفتحات`);
    for (const o of it.openings || []) {
      if (it.kind !== "skirting" && pos(o.h) && pos(it.H) && pos(o.h) > pos(it.H) + 1e-9 && !it.ceiling) li.push(`ارتفاع «${o.label || "فتحة"}» (${f3(pos(o.h))} م) أكبر من ارتفاع الحائط (${f3(pos(it.H))} م)`);
    }
    li.forEach((text) => issues.push({ id: it.id, text: `${it.desc || it.wbs || "بند"}: ${text}` }));
    return { id: it.id, gross: g.q, deduct, net: Math.max(0, g.q - deduct), unit: unitOf(it), expr: g.expr, deductions: ds, issues: li };
  });
  const map = new Map<string, QtoTotal>();
  items.forEach((it, i) => {
    const k = `${it.kind}|${lines[i].unit}`;
    const t = map.get(k) || { kind: it.kind, unit: lines[i].unit, net: 0, lines: 0 };
    t.net += lines[i].net;
    t.lines += 1;
    map.set(k, t);
  });
  return { lines, totals: [...map.values()], issues };
}
