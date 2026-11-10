// v0.39 kit: rows that reorder, parameters that fold away, figures that roll, and elements drawn with their dimensions.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Advanced, RowCards, moveRow } from "../src/ui/kit";
import { RollNumber, figureValue, isFigure, rollDirection } from "../src/ui/roll";
import { ISO_MAX_RATIO, ISO_MESH_MAX, ISO_VIEW, isoBox, planProportion, type Pt } from "../src/ui/draft-geometry";

const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");

type El = { $el: true; type: unknown; props: Record<string, unknown> };
const isEl = (x: unknown): x is El => !!x && typeof x === "object" && (x as El).$el === true;
// every element of a stub-React tree, components called as the plain functions they are
function all(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => all(n, out));
  else if (isEl(node)) {
    if (typeof node.type === "function") all((node.type as (p: unknown) => unknown)(node.props), out);
    else {
      out.push(node);
      all(node.props.children, out);
    }
  }
  return out;
}
const text = (node: unknown): string =>
  Array.isArray(node) ? node.map(text).join("") : isEl(node) ? (typeof node.type === "function" ? text((node.type as (p: unknown) => unknown)(node.props)) : text(node.props.children)) : node == null || node === false ? "" : String(node);

describe("rows reorder", () => {
  it("moves one row and leaves the others in order", () => {
    expect(moveRow(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveRow(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveRow(["a", "b"], 1, 0)).toEqual(["b", "a"]);
  });
  it("an impossible move changes nothing (same array back)", () => {
    const rows = ["a", "b", "c"];
    expect(moveRow(rows, 1, 1)).toBe(rows);
    expect(moveRow(rows, -1, 0)).toBe(rows);
    expect(moveRow(rows, 0, 3)).toBe(rows);
  });
  it("never mutates what it was given", () => {
    const rows = ["a", "b", "c"];
    moveRow(rows, 0, 2);
    expect(rows).toEqual(["a", "b", "c"]);
  });
  it("the open card offers «أعلى / أسفل», 44 px each, and the last row cannot go lower", () => {
    const tree = RowCards<string>({ rows: ["a", "b", "c"], onChange: () => {}, blank: () => "", render: (r) => r, summary: (r) => r });
    const els = all(tree);
    const up = els.find((e) => "data-row-up" in e.props)!;
    const down = els.find((e) => "data-row-down" in e.props)!;
    expect(up.props["aria-label"]).toBe("تحريك لأعلى");
    expect(String(up.props.className)).toContain("w-11 h-11");
    expect(up.props.disabled).toBe(false);
    expect(down.props.disabled).toBe(true);
  });
  it("a single row, or a list that opts out, shows no reorder controls", () => {
    const one = all(RowCards<string>({ rows: ["a"], onChange: () => {}, blank: () => "", render: (r) => r, summary: (r) => r }));
    expect(one.some((e) => "data-row-move" in e.props)).toBe(false);
    const off = all(RowCards<string>({ rows: ["a", "b"], onChange: () => {}, blank: () => "", render: (r) => r, summary: (r) => r, reorder: false }));
    expect(off.some((e) => "data-row-move" in e.props)).toBe(false);
  });
});

describe("advanced parameters fold away", () => {
  it("closed by default, and says how many values differ from their defaults", () => {
    const tree = Advanced({ changed: 3, children: "x" });
    const els = all(tree);
    expect(els[0].props["data-advanced"]).toBe("closed");
    expect(els.find((e) => "aria-expanded" in e.props)!.props["aria-expanded"]).toBe(false);
    expect(text(els.find((e) => "data-advanced-changed" in e.props))).toContain("3");
    expect(text(tree)).not.toContain("x");
  });
  it("no badge when nothing was changed; open when asked", () => {
    const tree = Advanced({ defaultOpen: true, children: "inside" });
    expect(all(tree).some((e) => "data-advanced-changed" in e.props)).toBe(false);
    expect(text(tree)).toContain("inside");
  });
});

describe("figures roll", () => {
  it("reads the number inside a formatted figure", () => {
    expect(figureValue("1,962,000.00")).toBe(1962000);
    expect(figureValue("−3.5")).toBe(-3.5);
    expect(figureValue("37.2")).toBe(37.2);
    expect(figureValue("—")).toBeNull();
    expect(figureValue("12 م³")).toBeNull();
  });
  it("up when it grew, down when it shrank, still when it cannot tell or nothing changed", () => {
    expect(rollDirection("9.50", "10.50")).toBe("up");
    expect(rollDirection("1,000.00", "999.99")).toBe("down");
    expect(rollDirection("10", "10")).toBe("none");
    expect(rollDirection(null, "10")).toBe("none");
    expect(rollDirection("—", "10")).toBe("none");
  });
  it("the text in the page is exactly the value — one character per box, nothing added", () => {
    expect(text(RollNumber({ value: "1,962,000.00" }))).toBe("1,962,000.00");
    const els = all(RollNumber({ value: "37.2" }));
    expect(els.filter((e) => String(e.props.className).includes("roll-d")).length).toBe(4);
  });
  it("nothing moves on the first paint", () => {
    const els = all(RollNumber({ value: "37.2" }));
    expect(els.some((e) => /roll-(up|down)/.test(String(e.props.className)))).toBe(false);
  });
  it("an Arabic word is never split into letters (they would stop joining)", () => {
    expect(isFigure("غير مطابق")).toBe(false);
    expect(isFigure("1,962,000.00")).toBe(true);
    expect(isFigure("C30/37")).toBe(true);
    const els = all(RollNumber({ value: "غير مطابق" }));
    expect(els.length).toBe(1);
    expect(text(els[0])).toBe("غير مطابق");
  });
});

describe("an element drawn as an isometric box", () => {
  const inside = (pts: Pt[], pad = 0) => pts.every(([x, y]) => x >= pad - 0.2 && x <= ISO_VIEW.w - pad + 0.2 && y >= pad - 0.2 && y <= ISO_VIEW.h - pad + 0.2);
  const cases: [number, number, number][] = [[6, 4, 0.15], [1.2, 1.2, 0.5], [40, 0.6, 0.8], [0.3, 0.6, 3.05], [12, 12, 1.2], [0.25, 5, 0.5]];
  it("every face stays inside the sheet's margins, whatever the proportions", () => {
    for (const [L, B, H] of cases) {
      const g = isoBox(L, B, H);
      expect(inside([...g.top, ...g.left, ...g.right], ISO_VIEW.pad), `${L}×${B}×${H}`).toBe(true);
      expect(g.ghost).toBe(false);
    }
  });
  it("dimension lines and their labels stay on the sheet", () => {
    for (const [L, B, H] of cases) {
      const g = isoBox(L, B, H);
      for (const d of g.dims) expect(inside([d.a, d.b, d.label, ...d.ext.flat()], 4), `${d.key} of ${L}×${B}×${H}`).toBe(true);
    }
  });
  it("three dimensions, each parallel to the edge it measures", () => {
    const g = isoBox(6, 4, 0.2);
    expect(g.dims.map((d) => d.key)).toEqual(["L", "B", "H"]);
    expect(g.dims.map((d) => d.angle)).toEqual([30, -30, -90]);
    const slope = (d: { a: Pt; b: Pt }) => (d.b[1] - d.a[1]) / (d.b[0] - d.a[0]);
    expect(slope(g.dims[0])).toBeCloseTo(Math.tan(Math.PI / 6), 1);
    expect(slope(g.dims[1])).toBeCloseTo(-Math.tan(Math.PI / 6), 1);
    expect(g.dims[2].a[0]).toBeCloseTo(g.dims[2].b[0], 5);
  });
  it("a thin slab keeps a readable thickness and a long strip is not drawn as a hairline", () => {
    const slab = isoBox(6, 4, 0.15);
    expect(slab.right[0][1] - slab.right[3][1]).toBeLessThanOrEqual(-9 + 0.2);
    expect(planProportion(40, 0.6)).toEqual([40, 40 / ISO_MAX_RATIO]);
    expect(planProportion(3, 4)).toEqual([3, 4]);
  });
  it("a longer length draws a longer box (the sketch follows the numbers)", () => {
    const len = (g: ReturnType<typeof isoBox>) => Math.hypot(g.left[1][0] - g.left[0][0], g.left[1][1] - g.left[0][1]);
    const wid = (g: ReturnType<typeof isoBox>) => Math.hypot(g.right[1][0] - g.right[0][0], g.right[1][1] - g.right[0][1]);
    const a = isoBox(4, 4, 0.2), b = isoBox(8, 4, 0.2);
    expect(len(a) / wid(a)).toBeCloseTo(1, 1);
    expect(len(b) / wid(b)).toBeCloseTo(2, 1);
  });
  it("the mesh is drawn at its spacing and thinned when it would be unreadable", () => {
    const count = (d: string) => (d.match(/M/g) || []).length;
    const coarse = isoBox(3, 2, 0.15, { mesh: { sx: 0.5, sy: 0.5 } });
    expect(count(coarse.mesh)).toBe(4 + 1 + (6 + 1));
    const dense = isoBox(20, 20, 0.2, { mesh: { sx: 0.1, sy: 0.1 } });
    expect(count(dense.mesh)).toBeLessThanOrEqual(2 * (ISO_MESH_MAX + 1));
    expect(count(dense.mesh)).toBeGreaterThan(20);
    expect(isoBox(3, 2, 0.15).mesh).toBe("");
  });
  it("missing numbers give a ghost — a friendly outline, never NaN", () => {
    for (const [L, B, H] of [[0, 0, 0], [5, 0, 0.2], [NaN, 3, 0.2], [5, 3, -1]] as [number, number, number][]) {
      const g = isoBox(L, B, H, { mesh: { sx: 0.2, sy: 0.2 } });
      expect(g.ghost).toBe(true);
      expect(g.mesh).toBe("");
      expect([...g.top, ...g.left, ...g.right, ...g.dims.flatMap((d) => [d.a, d.b, d.label])].flat().every(Number.isFinite)).toBe(true);
    }
  });
});

describe("dialogs mount inside the app's root", () => {
  const read = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
  it("the root is marked, and carries the accent colours a dialog's primary button needs", () => {
    const app = read("app/App.tsx");
    expect(app).toMatch(/data-app-root=""[^>]*style=\{vars\}/);
    expect(app).toContain('"--solid": a.solid');
  });
  it("the kit's dialogs, the issue dialog and the command palette ask ui/portal.ts — none goes to <body> on its own", () => {
    for (const f of ["ui/kit.tsx", "features/tools/doc-settings.tsx", "app/palette-panel.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("portalHost()");
      expect(src, f).not.toMatch(/createPortal\([^)]*document\.body/);
    }
    expect(read("ui/portal.ts")).toContain('document.querySelector<HTMLElement>("[data-app-root]") || document.body');
  });
});

describe("rules kept (drafting block)", () => {
  const block = css.slice(css.indexOf("Drafting (v0.39"));
  it("the rolling figure is switched off under prefers-reduced-motion", () => {
    const reduced = block.slice(block.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const cls of [".roll-up", ".roll-down"]) expect(reduced).toContain(cls);
  });
  it("moves only transform and opacity; the paper is a static background", () => {
    expect(block).not.toMatch(/transition:\s*(width|height|top|left|margin|padding)/);
    expect(block).not.toMatch(/@keyframes [\w-]+ \{[^}]*(width|height|top|margin)\s*:/);
    expect(block).not.toMatch(/animation:[^;]*infinite/);
    expect(block).not.toContain("backdrop-filter");
  });
  it("the paper is real millimetres (5 mm and 10 mm rules) in both themes", () => {
    expect(block).toContain("background-size: 10mm 10mm, 10mm 10mm, 5mm 5mm, 5mm 5mm;");
    expect(block).toMatch(/\[data-mode="light"\] \{ --grid-minor:/);
  });
});
