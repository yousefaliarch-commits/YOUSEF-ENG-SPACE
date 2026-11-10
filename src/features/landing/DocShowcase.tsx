// =====================================================================
//  The public page's document showcase: real first pages, drawn in the visitor's browser by the app's own tools and
//  document kit from sample data (./samples.ts) — not screenshots. What a firm would print is what is shown.
//  · Nothing is loaded until the strip scrolls into view (the tools, the layout engine and the fonts are their own
//    chunks); a sheet that cannot be drawn keeps its paper-coloured placeholder — the page never breaks over a sample.
//  · A native horizontal scroller with snap points; the two buttons only scroll it.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DrawPage } from "../../doc/model";
import type { ToolDoc } from "../../data/tool-docs";
import { SAMPLES, SAMPLE_PROJECT } from "./samples";

type Sheet = { page: DrawPage; pages: number } | null;

async function drawSamples(): Promise<Sheet[]> {
  const [{ TOOL_MODULES }, { docLayout }, { canvasMeasurer, loadDocFonts }, { applyDocControls }] = await Promise.all([
    import("../tools/module"), import("../../doc/layout"), import("../../doc/render"), import("../../data/doc-controls"),
  ]);
  await loadDocFonts();
  return Promise.all(SAMPLES.map(async (s, i): Promise<Sheet> => {
    try {
      const mod = await TOOL_MODULES[s.kind]();
      const doc: ToolDoc = {
        id: `sample${i}`, kind: s.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: s.title, dateIso: "2026-11-05", docNo: s.docNo, rev: s.rev,
        status: "issued", profile: mod.profile, body: s.body(mod.blank() as Record<string, unknown>), photos: {}, log: [], wbs: s.wbs, revs: s.revs,
      };
      const pages = docLayout(applyDocControls(mod.build(doc, SAMPLE_PROJECT), doc), canvasMeasurer).pages;
      return pages.length ? { page: pages[0], pages: pages.length } : null;
    } catch {
      return null;
    }
  }));
}

function SheetCanvas({ sheet, landscape }: { sheet: Sheet; landscape: boolean }) {
  const box = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = canvas.current, b = box.current;
    if (!c || !b || !sheet) return;
    let live = true;
    void import("../../doc/draw").then(({ drawPage }) => {
      if (!live) return;
      const wMm = landscape ? 297 : 210, hMm = landscape ? 210 : 297;
      const cssW = b.clientWidth || 360;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const s = (cssW * dpr) / wMm;
      c.width = Math.round(wMm * s);
      c.height = Math.round(hMm * s);
      const ctx = c.getContext("2d");
      if (ctx) drawPage(ctx, sheet.page, s);
    });
    return () => {
      live = false;
      c.width = c.height = 0;
    };
  }, [sheet, landscape]);
  return (
    <div ref={box} className={`relative w-full overflow-hidden rounded-md bg-white border border-line-2 shadow-card ${landscape ? "aspect-[297/210]" : "aspect-[210/297]"}`}>
      {!sheet && <div className="absolute inset-0 skeleton opacity-40" aria-hidden="true" />}
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" data-sample-page={sheet ? "drawn" : "pending"} />
    </div>
  );
}

export function DocShowcase() {
  const [sheets, setSheets] = useState<Sheet[]>(() => SAMPLES.map(() => null));
  const strip = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let live = true;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void drawSamples().then((s) => live && setSheets(s)).catch(() => {});
    };
    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) {
        start();
        io.disconnect();
      }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, []);
  // «next» is toward the end of the line: left in Arabic, right in English
  const move = (dir: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.min(el.clientWidth * 0.8, 520), behavior: "smooth" });
  };
  const landscape = (i: number) => (sheets[i] ? sheets[i]!.page.orientation === "landscape" : SAMPLES[i].kind !== "concrete");
  return (
    <div data-doc-showcase>
      <div ref={strip} className="land-strip -mx-4 px-4 sm:-mx-8 sm:px-8 flex gap-5 overflow-x-auto no-scrollbar pb-2">
        {SAMPLES.map((s, i) => (
          <figure key={s.docNo} className={`land-snap shrink-0 ${landscape(i) ? "w-[min(86vw,560px)]" : "w-[min(70vw,360px)]"}`}>
            <SheetCanvas sheet={sheets[i]} landscape={landscape(i)} />
            <figcaption className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-medium">{s.caption}</span>
              <span className="text-[11.5px] text-ink-3">نموذج · <bdi dir="ltr" className="font-grotesk">PDF · Word · Excel</bdi></span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 hidden sm:flex items-center gap-2">
        <button type="button" aria-label="السابق" onClick={() => move(-1)} className="press grid place-items-center w-11 h-11 rounded-full bg-surface border border-line-2 text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronRight size={18} className="ltr:-scale-x-100" /></button>
        <button type="button" aria-label="التالي" onClick={() => move(1)} className="press grid place-items-center w-11 h-11 rounded-full bg-surface border border-line-2 text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronLeft size={18} className="ltr:-scale-x-100" /></button>
      </div>
    </div>
  );
}
