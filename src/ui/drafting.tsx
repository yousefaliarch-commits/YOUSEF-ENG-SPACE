// =====================================================================
//  Drafting pieces — the drawing-board language of the tools and the public page:
//  · DraftSheet: a sheet of real millimetre paper (CSS mm units: 5 mm and 10 mm rules) with drawing-sheet corner ticks.
//  · LevelMark: the surveyor's level symbol with its figure («▽ +3.20»).
//  · IsoBox: an element as an isometric box with live dimension lines; when a dimension changes the box moves to its new
//    shape on a real spring (ui/motion.ts, the same physics as the CSS tokens) — the frame writes SVG attributes directly,
//    React state never changes per frame. No animation under prefers-reduced-motion; geometry in ui/draft-geometry.ts.
//  A sketch is never to scale: it says «بدون مقياس رسم» and the labels carry the true dimensions.
// =====================================================================
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ISO_VIEW, isoBox, pathOf, type IsoGeom, type IsoView } from "./draft-geometry";
import { SPRINGS, settleTime, springAt } from "./motion";

export function DraftSheet({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`draft-sheet relative overflow-hidden rounded-2xl border border-line-2 ${className}`}>
      <span aria-hidden="true" className="draft-tick draft-tick-a" />
      <span aria-hidden="true" className="draft-tick draft-tick-b" />
      {label && <span className="absolute top-2 end-3 text-[10px] tracking-[0.08em] uppercase text-ink-3 font-grotesk" dir="ltr">{label}</span>}
      {children}
    </div>
  );
}

export function LevelMark({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-ink-2 ${className}`} data-level-mark>
      <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" className="shrink-0">
        <path d="M2 2h12L8 11z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M0 12.6h16" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <bdi dir="ltr" className="font-grotesk tabular-nums text-[12px]">{value}</bdi>
    </span>
  );
}

const reduced = () => {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

type Els = {
  top: SVGPolygonElement | null; right: SVGPolygonElement | null; left: SVGPolygonElement | null;
  mesh: SVGPathElement | null; dims: SVGPathElement | null; level: SVGGElement | null;
  labels: Partial<Record<"L" | "B" | "H", SVGTextElement | null>>;
};

// write one geometry into the SVG (attributes only — no layout outside the SVG box)
function paint(el: Els, g: IsoGeom) {
  el.top?.setAttribute("points", pathOf(g.top));
  el.right?.setAttribute("points", pathOf(g.right));
  el.left?.setAttribute("points", pathOf(g.left));
  el.mesh?.setAttribute("d", g.mesh);
  const d: string[] = [];
  for (const m of g.dims) {
    d.push(`M${m.a[0]} ${m.a[1]}L${m.b[0]} ${m.b[1]}`);
    for (const [p, q] of m.ext) d.push(`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`);
    // the draughtsman's 45° tick at each end
    for (const e of [m.a, m.b]) d.push(`M${e[0] - 2.6} ${e[1] + 2.6}L${e[0] + 2.6} ${e[1] - 2.6}`);
    el.labels[m.key]?.setAttribute("transform", `translate(${m.label[0]} ${m.label[1]}) rotate(${m.angle})`);
  }
  el.dims?.setAttribute("d", d.join(""));
  el.level?.setAttribute("transform", `translate(${g.level[0]} ${g.level[1]})`);
}

export type IsoLabels = Partial<Record<"L" | "B" | "H", string>>;

export function IsoBox({ L, B, H, labels = {}, mesh = null, level, view = ISO_VIEW, className = "", title }: {
  L: number; B: number; H: number; labels?: IsoLabels; mesh?: { sx: number; sy: number } | null; level?: string;
  view?: IsoView; className?: string; title?: string;
}) {
  const el = useRef<Els>({ top: null, right: null, left: null, mesh: null, dims: null, level: null, labels: {} });
  const shown = useRef<number[] | null>(null);
  const frame = useRef(0);
  const target = [L, B, H, mesh ? mesh.sx : 0, mesh ? mesh.sy : 0];
  const draw = (v: number[]) => paint(el.current, isoBox(v[0], v[1], v[2], { view, mesh: v[3] > 0 && v[4] > 0 ? { sx: v[3], sy: v[4] } : null }));

  useLayoutEffect(() => {
    const from = shown.current;
    cancelAnimationFrame(frame.current);
    // first paint, a ghost on either side, or reduced motion: no travel — the box is simply there
    const usable = (v: number[]) => v[0] > 0 && v[1] > 0 && v[2] > 0;
    if (!from || !usable(from) || !usable(target) || reduced() || typeof requestAnimationFrame !== "function") {
      shown.current = target;
      draw(target);
      return;
    }
    const spring = SPRINGS.soft;
    const total = settleTime(spring);
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const k = t >= total ? 1 : springAt(spring, t);
      const cur = target.map((to, i) => from[i] + (to - from[i]) * k);
      shown.current = cur;
      draw(cur);
      if (t < total) frame.current = requestAnimationFrame(step);
      else shown.current = target;
    };
    frame.current = requestAnimationFrame(step);
  }, target);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const ghost = !(L > 0 && B > 0 && H > 0);
  const text = (k: "L" | "B" | "H") => (
    <text
      ref={(n) => {
        el.current.labels[k] = n;
      }}
      textAnchor="middle"
      dominantBaseline="middle"
      className="draft-label"
    >
      {labels[k] || ""}
    </text>
  );
  return (
    <svg
      viewBox={`0 0 ${view.w} ${view.h}`}
      role="img"
      aria-label={title || "رسم توضيحي بالأبعاد"}
      className={`draft-iso block w-full h-auto ${ghost ? "is-ghost" : ""} ${className}`}
      data-iso={ghost ? "ghost" : "live"}
      direction="ltr"
    >
      <polygon ref={(n) => { el.current.left = n; }} className="draft-face draft-face-left" />
      <polygon ref={(n) => { el.current.right = n; }} className="draft-face draft-face-right" />
      <polygon ref={(n) => { el.current.top = n; }} className="draft-face draft-face-top" />
      <path ref={(n) => { el.current.mesh = n; }} className="draft-mesh" fill="none" />
      <path ref={(n) => { el.current.dims = n; }} className="draft-dim" fill="none" />
      {text("L")}
      {text("B")}
      {text("H")}
      <g ref={(n) => { el.current.level = n; }} className={level ? "" : "hidden"}>
        <path d="M-5 -11h10L0 -3z M-9 -1.6h18" className="draft-dim" fill="none" />
        <text x="12" y="-7" textAnchor="start" dominantBaseline="middle" className="draft-label">{level || ""}</text>
      </g>
    </svg>
  );
}
