// =====================================================================
//  Drafting geometry — an element drawn as an isometric box with its dimension lines (pure numbers, no DOM).
//  · A sketch, not a scaled drawing («بدون مقياس رسم»): proportions follow the dimensions, but a 0.15 m slab under a 6 m span
//    keeps a readable thickness and a 40 m strip footing is not drawn 80× longer than it is wide — every clamp is here, in
//    one place, and the dimension labels always carry the true figures.
//  · Axes: X (length) runs right-down at 30°, Y (width) left-down at 30°, Z up. The three faces a viewer in front sees are
//    the top, the face at X = L and the face at Y = B; dimension lines sit outside them, parallel to their edge.
//  ui/drafting.tsx draws it (and animates between two states by recomputing this for the values in between).
// =====================================================================

export type Pt = [number, number];
export type IsoView = { w: number; h: number; pad: number };
export type IsoDim = { key: "L" | "B" | "H"; a: Pt; b: Pt; ext: [Pt, Pt][]; label: Pt; angle: number };
export type IsoGeom = {
  top: Pt[];
  right: Pt[];
  left: Pt[];
  mesh: string;
  dims: IsoDim[];
  level: Pt;
  ghost: boolean;
};

export const ISO_VIEW: IsoView = { w: 360, h: 236, pad: 40 };

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ok = (x: number) => Number.isFinite(x) && x > 0;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// the longest plan side may be at most this many times the shortest on the sketch
export const ISO_MAX_RATIO = 5;
// lines of a mesh drawn in one direction, at most (a 20 m slab at 100 mm would be 200 lines of noise)
export const ISO_MESH_MAX = 26;

// plan dimensions as drawn: real proportions, the short side never thinner than 1 / ISO_MAX_RATIO of the long one
export function planProportion(L: number, B: number): [number, number] {
  const long = Math.max(L, B);
  const floor = long / ISO_MAX_RATIO;
  return [Math.max(L, floor), Math.max(B, floor)];
}

export const pathOf = (pts: Pt[]) => pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(" ");

export function isoBox(Lm: number, Bm: number, Hm: number, opts: { view?: IsoView; mesh?: { sx: number; sy: number } | null } = {}): IsoGeom {
  const view = opts.view || ISO_VIEW;
  const ghost = !(ok(Lm) && ok(Bm) && ok(Hm));
  // a ghost keeps friendly proportions until the numbers arrive
  const [L, B] = planProportion(ok(Lm) ? Lm : ok(Bm) ? Bm * 1.4 : 5, ok(Bm) ? Bm : ok(Lm) ? Lm * 0.7 : 3.5);
  const H = ok(Hm) ? Hm : 0;
  const availW = view.w - 2 * view.pad;
  const availH = view.h - 2 * view.pad;
  const sum = L + B;
  const hCap = availH * 0.5;
  const hFloor = 9;
  // plan scale first (the height takes what is left), then the height at that scale inside its floor and cap
  let s = Math.min(availW / (COS * sum), (availH - hFloor) / (SIN * sum));
  let h = clamp(H * s, hFloor, hCap);
  s = Math.min(availW / (COS * sum), (availH - h) / (SIN * sum));
  h = clamp(H * s, hFloor, hCap);
  const l = L * s;
  const b = B * s;

  // project, then centre in the view
  const raw = (X: number, Y: number, Z: number): Pt => [COS * (X - Y), SIN * (X + Y) - Z];
  const minX = -COS * b, maxX = COS * l;
  const minY = -h, maxY = SIN * (l + b);
  const ox = (view.w - (maxX - minX)) / 2 - minX;
  const oy = (view.h - (maxY - minY)) / 2 - minY;
  const p = (X: number, Y: number, Z: number): Pt => {
    const q = raw(X, Y, Z);
    return [r1(q[0] + ox), r1(q[1] + oy)];
  };

  const top: Pt[] = [p(0, 0, h), p(l, 0, h), p(l, b, h), p(0, b, h)];
  const right: Pt[] = [p(l, 0, h), p(l, b, h), p(l, b, 0), p(l, 0, 0)];
  const left: Pt[] = [p(0, b, h), p(l, b, h), p(l, b, 0), p(0, b, 0)];

  // the reinforcement mesh on the top face: bars at their spacing, thinned evenly when there would be too many to read
  let mesh = "";
  const m = opts.mesh;
  if (m && !ghost && ok(m.sx) && ok(m.sy) && ok(Lm) && ok(Bm)) {
    const seg: string[] = [];
    const lines = (count: number) => {
      const n = Math.max(1, Math.floor(count));
      const step = Math.ceil(n / ISO_MESH_MAX);
      return { n, step };
    };
    // bars running along X, spaced along Y (spacing sy over the real width), and the other way round
    const alongX = lines(Bm / m.sy);
    for (let k = 0; k <= alongX.n; k += alongX.step) {
      const y = (b * k) / alongX.n;
      const a = p(0, y, h), z = p(l, y, h);
      seg.push(`M${a[0]} ${a[1]}L${z[0]} ${z[1]}`);
    }
    const alongY = lines(Lm / m.sx);
    for (let k = 0; k <= alongY.n; k += alongY.step) {
      const x = (l * k) / alongY.n;
      const a = p(x, 0, h), z = p(x, b, h);
      seg.push(`M${a[0]} ${a[1]}L${z[0]} ${z[1]}`);
    }
    mesh = seg.join("");
  }

  // dimension lines: offset outward from the edge they measure, with short extension lines back to its ends
  const OFF = 15, EXT = 5, TXT = 11;
  const shift = (q: Pt, d: Pt, k: number): Pt => [r1(q[0] + d[0] * k), r1(q[1] + d[1] * k)];
  const dim = (key: IsoDim["key"], a0: Pt, b0: Pt, out: Pt, angle: number): IsoDim => {
    const a = shift(a0, out, OFF), bb = shift(b0, out, OFF);
    return {
      key, a, b: bb,
      ext: [[shift(a0, out, 3), shift(a0, out, OFF + EXT)], [shift(b0, out, 3), shift(b0, out, OFF + EXT)]],
      label: shift([(a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2], out, TXT),
      angle,
    };
  };
  const dims: IsoDim[] = [
    dim("L", p(0, b, 0), p(l, b, 0), [-SIN, COS], 30),
    dim("B", p(l, 0, 0), p(l, b, 0), [SIN, COS], -30),
    dim("H", p(l, 0, 0), p(l, 0, h), [1, 0], -90),
  ];
  return { top, right, left, mesh, dims, level: p(0, 0, h), ghost };
}
