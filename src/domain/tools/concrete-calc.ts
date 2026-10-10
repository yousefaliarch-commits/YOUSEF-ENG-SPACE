// =====================================================================
//  Concrete take-off & pour planner — engine (pure, versioned). docs/TOOLS-BLUEPRINT.md §3.2
//  · Precedence prevents double counting: lean → footing/raft → neck → tie beam → column (to the slab soffit) →
//    beam (the drop below the slab only) → slab → stairs. Waste is applied once, per element.
//  · Pour planner (Caltrans method): the slowest of pump, plant and crew governs; trucks, arrival interval, cycle, fleet,
//    duration, the cold-joint guard, cube sets and the striking / curing / cube calendar.
//  · Code values are the profile's ([L]/[M] defaults, editable, printed with ⚑ in the basis block).
// =====================================================================
import { addDays, r, type Check, type TraceStep } from "./common";

export const CONC_ENGINE = "concrete@1.0.0";

export type ConcKind =
  | "blinding" | "footing" | "footingSloped" | "raft" | "tieBeam" | "neck" | "column" | "columnRound" | "beam" | "slab"
  | "hourdi" | "stair" | "wall";

export type ConcElement = {
  id: string;
  kind: ConcKind;
  label: string;
  n: number;
  dims: Record<string, number | null>;
  wastePct?: number | null;
  againstSoil?: boolean;
};

export const CONC_PROFILE = {
  id: "ecp203-site@1",
  edition: "ECP 203-2020 · site practice",
  waste: { blinding: 5, footing: 3, footingSloped: 3, raft: 3, tieBeam: 3, neck: 3, column: 3, columnRound: 3, beam: 3, slab: 2, hourdi: 3, stair: 5, wall: 3 } as Record<ConcKind, number>,
  blindingProjection: 0.1,
  mixes: {
    rc: { id: "rc", name: "خرسانة مسلحة", cementKg: 350, sandM3: 0.4, gravelM3: 0.8, waterL: 175 },
    plain: { id: "plain", name: "خرسانة عادية", cementKg: 250, sandM3: 0.4, gravelM3: 0.8, waterL: 140 },
    lean: { id: "lean", name: "خرسانة نظافة", cementKg: 200, sandM3: 0.45, gravelM3: 0.8, waterL: 135 },
  },
  bulkKgM3: 1600,
  sg: 2650,
  airPct: 1.5,
  bagKg: 50,
  hourdi: { ribMin: 0.1, clearMax: 0.7, toppingMin: 0.05 },
  tCover: (airC: number) => (airC <= 25 ? 120 : airC <= 32 ? 90 : 75),
  dischargeMin: (airC: number) => (airC > 32 ? 60 : 90),
};

export type ConcMix = { id: string; name: string; cementKg: number; sandM3: number; gravelM3: number; waterL: number };

const MIX_OF: Partial<Record<ConcKind, keyof typeof CONC_PROFILE.mixes>> = { blinding: "lean" };
export const mixFor = (k: ConcKind): ConcMix => CONC_PROFILE.mixes[MIX_OF[k] || "rc"];

// the fields each kind asks for (m unless noted), in the order the screen shows them
export const CONC_KINDS: { kind: ConcKind; name: string; fields: [string, string][]; hint?: string }[] = [
  { kind: "blinding", name: "خرسانة نظافة", fields: [["L", "الطول"], ["B", "العرض"], ["t", "السمك"]], hint: "تُزاد 10 سم من كل جانب حول القاعدة" },
  { kind: "footing", name: "قاعدة منفصلة", fields: [["L", "الطول"], ["B", "العرض"], ["H", "الارتفاع"]] },
  { kind: "footingSloped", name: "قاعدة مشطوفة", fields: [["L", "الطول"], ["B", "العرض"], ["h1", "الجزء الرأسي"], ["h2", "الجزء المائل"], ["a", "طول الوجه العلوي"], ["b", "عرض الوجه العلوي"]] },
  { kind: "raft", name: "لبشة", fields: [["A", "المساحة (م²)"], ["P", "المحيط"], ["t", "السمك"]] },
  { kind: "tieBeam", name: "سملات", fields: [["L", "الطول الصافي"], ["b", "العرض"], ["h", "العمق"]] },
  { kind: "neck", name: "رقاب أعمدة", fields: [["a", "العرض"], ["b", "الطول"], ["h", "الارتفاع"]], hint: "من سطح القاعدة حتى سطح السملات" },
  { kind: "column", name: "عمود", fields: [["a", "العرض"], ["b", "الطول"], ["hFF", "ارتفاع الدور"], ["ts", "سمك البلاطة"]], hint: "الأعمدة حتى بطنية البلاطة" },
  { kind: "columnRound", name: "عمود دائري", fields: [["d", "القطر"], ["hFF", "ارتفاع الدور"], ["ts", "سمك البلاطة"]], hint: "الأعمدة حتى بطنية البلاطة" },
  { kind: "beam", name: "كمرة", fields: [["b", "العرض"], ["h", "العمق الكلي"], ["ts", "سمك البلاطة"], ["L", "البحر الصافي"]], hint: "الجزء الساقط تحت البلاطة فقط" },
  { kind: "slab", name: "بلاطة مصمتة", fields: [["L", "الطول"], ["B", "العرض"], ["t", "السمك"], ["open", "فتحات (م²)"]] },
  { kind: "hourdi", name: "بلاطة هوردي", fields: [["A", "المساحة (م²)"], ["ts", "سمك التغطية"], ["hb", "ارتفاع البلوك"], ["bRib", "عرض العصب"], ["wBlock", "عرض البلوك"], ["lBlock", "طول البلوك"]] },
  { kind: "stair", name: "سلم (قلبة)", fields: [["nSteps", "عدد الدرجات"], ["R", "القائمة"], ["G", "النائمة"], ["w", "عرض السلم"], ["t", "سمك البلاطة"]] },
  { kind: "wall", name: "حائط خرساني", fields: [["L", "الطول"], ["t", "السمك"], ["H", "الارتفاع"]] },
];

export const kindName = (k: ConcKind) => (CONC_KINDS.find((x) => x.kind === k) || { name: k }).name;

const v = (e: ConcElement, k: string) => {
  const x = e.dims[k];
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
};

// one element: net m³ and formwork m² (for all n), with its checks and working
export function concVolume(e: ConcElement): { netM3: number; formworkM2: number; checks: Check[]; trace: TraceStep[]; blocks?: number } {
  const n = Math.max(0, e.n || 0);
  const checks: Check[] = [];
  const trace: TraceStep[] = [];
  let vol = 0, fw = 0, blocks: number | undefined;
  switch (e.kind) {
    case "blinding": {
      const p = CONC_PROFILE.blindingProjection;
      vol = (v(e, "L") + 2 * p) * (v(e, "B") + 2 * p) * v(e, "t");
      fw = 2 * (v(e, "L") + v(e, "B") + 4 * p) * v(e, "t");
      trace.push({ label: "نظافة", expr: `(L+2×${p})(B+2×${p})·t`, value: r(vol) });
      break;
    }
    case "footing":
      vol = v(e, "L") * v(e, "B") * v(e, "H");
      fw = 2 * (v(e, "L") + v(e, "B")) * v(e, "H");
      trace.push({ label: "قاعدة", expr: "L·B·H", value: r(vol) });
      break;
    case "footingSloped": {
      const L = v(e, "L"), B = v(e, "B"), h1 = v(e, "h1"), h2 = v(e, "h2"), a = v(e, "a"), b = v(e, "b");
      const A1 = L * B, A2 = a * b, Am = ((L + a) / 2) * ((B + b) / 2);
      const sloped = (h2 / 6) * (A1 + A2 + 4 * Am);
      vol = A1 * h1 + sloped;
      fw = 2 * (L + B) * h1;
      trace.push({ label: "الجزء المائل (منشوري)", expr: "h₂/6·(A₁+A₂+4A_m)", value: r(sloped, 4) });
      if (a > L || b > B) checks.push({ id: "conc.slopedTop", label: "الوجه العلوي أكبر من القاعدة", value: `${r(a, 2)}×${r(b, 2)}`, limit: `≤ ${r(L, 2)}×${r(B, 2)}`, ok: false, level: "error" });
      break;
    }
    case "raft":
      vol = v(e, "A") * v(e, "t");
      fw = v(e, "P") * v(e, "t");
      trace.push({ label: "لبشة", expr: "A·t", value: r(vol) });
      break;
    case "tieBeam":
      vol = v(e, "L") * v(e, "b") * v(e, "h");
      fw = e.againstSoil ? 0 : 2 * v(e, "h") * v(e, "L");
      trace.push({ label: "سملات", expr: "L·b·h", value: r(vol) });
      break;
    case "neck":
      vol = v(e, "a") * v(e, "b") * v(e, "h");
      fw = 2 * (v(e, "a") + v(e, "b")) * v(e, "h");
      break;
    case "column":
    case "columnRound": {
      const h = v(e, "hFF") - v(e, "ts");
      if (e.kind === "column") {
        vol = v(e, "a") * v(e, "b") * h;
        fw = 2 * (v(e, "a") + v(e, "b")) * h;
      } else {
        vol = (Math.PI * v(e, "d") ** 2) / 4 * h;
        fw = Math.PI * v(e, "d") * h;
      }
      trace.push({ label: "ارتفاع العمود حتى بطنية البلاطة", expr: "h_FF − t_s", value: r(h, 2) });
      if (h > 0 && (h < 2 || h > 6)) checks.push({ id: "conc.colHeight", label: "ارتفاع العمود خارج المعتاد", value: `${r(h, 2)} m`, limit: "2–6 m", ok: false, level: "warn" });
      if (h <= 0) checks.push({ id: "conc.colHeight", label: "ارتفاع العمود غير صحيح", value: `${r(h, 2)} m`, limit: "> 0", ok: false, level: "error" });
      break;
    }
    case "beam": {
      const drop = v(e, "h") - v(e, "ts");
      if (drop < 0) {
        checks.push({ id: "conc.beamDrop", label: "عمق الكمرة أقل من سمك البلاطة", value: `${r(drop, 2)} m`, limit: "≥ 0", ok: false, level: "error" });
        break;
      }
      vol = v(e, "b") * drop * v(e, "L");
      fw = (2 * drop + v(e, "b")) * v(e, "L");
      trace.push({ label: "الساقط تحت البلاطة", expr: "h − t_s", value: r(drop, 2) });
      break;
    }
    case "slab": {
      const A = v(e, "L") * v(e, "B") - v(e, "open");
      vol = A * v(e, "t");
      fw = A + 2 * (v(e, "L") + v(e, "B")) * v(e, "t");
      trace.push({ label: "بلاطة", expr: "(L·B − فتحات)·t", value: r(vol) });
      break;
    }
    case "hourdi": {
      const A = v(e, "A"), ts = v(e, "ts"), hb = v(e, "hb"), bRib = v(e, "bRib"), wB = v(e, "wBlock"), lB = v(e, "lBlock");
      const s = wB + bRib;
      const c = s > 0 ? ts + (hb * bRib) / s : 0;
      vol = A * c;
      fw = A;
      blocks = s > 0 && lB > 0 ? Math.ceil((A / (s * lB)) * n) : 0;
      trace.push({ label: "خرسانة لكل م²", expr: "t_s + h_b·b_rib/s", value: r(c, 3) });
      trace.push({ label: "بلوك لكل م²", expr: "1/(s·l_block)", value: r(s > 0 && lB > 0 ? 1 / (s * lB) : 0, 2) });
      const H = CONC_PROFILE.hourdi;
      if (bRib && bRib < H.ribMin) checks.push({ id: "conc.hourdiRib", label: "عرض العصب", value: `${r(bRib * 100, 0)} cm`, limit: `≥ ${H.ribMin * 100} cm`, ok: false, level: "warn", unverified: true });
      if (wB > H.clearMax) checks.push({ id: "conc.hourdiClear", label: "المسافة الصافية بين الأعصاب", value: `${r(wB * 100, 0)} cm`, limit: `≤ ${H.clearMax * 100} cm`, ok: false, level: "warn", unverified: true });
      const tMin = Math.max(H.toppingMin, wB / 10);
      if (ts && ts < tMin - 1e-9) checks.push({ id: "conc.hourdiTopping", label: "سمك التغطية", value: `${r(ts * 100, 0)} cm`, limit: `≥ ${r(tMin * 100, 1)} cm`, ok: false, level: "warn", unverified: true });
      break;
    }
    case "stair": {
      const ns = v(e, "nSteps"), R = v(e, "R"), G = v(e, "G"), w = v(e, "w"), t = v(e, "t");
      const Li = ns * Math.sqrt(R * R + G * G);
      const waist = w * t * Li, steps = (ns * R * G) / 2 * w;
      vol = waist + steps;
      fw = Li * w + ns * R * w + 2 * Li * (t + R / 2);
      trace.push({ label: "الطول المائل", expr: "n·√(R²+G²)", value: r(Li, 3) });
      trace.push({ label: "البلاطة المائلة + الدرج", expr: "w·t·L + n·R·G/2·w", value: `${r(waist)} + ${r(steps)}` });
      if (R && G && (2 * R + G < 0.6 || 2 * R + G > 0.66)) checks.push({ id: "conc.stairRule", label: "قاعدة الخطوة 2R + G", value: `${r((2 * R + G) * 100, 1)} cm`, limit: "60–66 cm", ok: false, level: "warn" });
      break;
    }
    case "wall":
      vol = v(e, "L") * v(e, "t") * v(e, "H");
      fw = 2 * v(e, "L") * v(e, "H");
      break;
  }
  return { netM3: vol * n, formworkM2: fw * n, checks, trace, blocks };
}

export type ConcRow = { id: string; netM3: number; wastePct: number; orderM3: number; formworkM2: number; blocks?: number; checks: Check[] };

export function concTakeoff(els: ConcElement[], extraWastePct = 0) {
  const rows: ConcRow[] = els.map((e) => {
    const x = concVolume(e);
    const w = e.wastePct != null && Number.isFinite(e.wastePct) ? e.wastePct : CONC_PROFILE.waste[e.kind];
    return { id: e.id, netM3: x.netM3, wastePct: w, orderM3: x.netM3 * (1 + w / 100), formworkM2: x.formworkM2, blocks: x.blocks, checks: x.checks };
  });
  const sum = (k: "netM3" | "orderM3" | "formworkM2") => rows.reduce((a, x) => a + x[k], 0);
  const checks: Check[] = rows.flatMap((x) => x.checks);
  if (extraWastePct > 0)
    checks.push({ id: "conc.doubleWaste", label: "هالك إضافي فوق هالك العناصر", value: `${extraWastePct} %`, limit: "يُطبَّق الهالك مرة واحدة لكل عنصر", ok: false, level: "error" });
  return { rows, netM3: sum("netM3"), orderM3: sum("orderM3"), formworkM2: sum("formworkM2"), blocks: rows.reduce((a, x) => a + (x.blocks || 0), 0), checks };
}

export function concMaterials(orderM3: number, mix: ConcMix, bagKg = CONC_PROFILE.bagKg) {
  const cementKg = orderM3 * mix.cementKg;
  return { cementKg, bags: Math.ceil(cementKg / bagKg - 1e-9), sandM3: orderM3 * mix.sandM3, gravelM3: orderM3 * mix.gravelM3, waterM3: (orderM3 * mix.waterL) / 1000 };
}

// absolute-volume yield of 1 m³ of the mix (warn outside 1 ± 5 %)
export function concMixYield(mix: ConcMix, d = { bulkKgM3: CONC_PROFILE.bulkKgM3, sg: CONC_PROFILE.sg, airPct: CONC_PROFILE.airPct }) {
  return mix.cementKg / 3150 + mix.waterL / 1000 + ((mix.sandM3 + mix.gravelM3) * d.bulkKgM3) / d.sg + d.airPct / 100;
}

export type PourInput = {
  orderM3: number; primingM3: number; loadM3: number; pumpM3h: number; plantM3h: number; crewM3h: number;
  travelMin: number; loadMin: number; washMin: number; setupMin: number; cleanupMin: number; start: string; // "07:00"
};

const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const minOf = (t: string) => {
  const [h, m] = (t || "07:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function concPour(i: PourInput) {
  const opts: ["pump" | "plant" | "crew", number][] = [["pump", i.pumpM3h], ["plant", i.plantM3h], ["crew", i.crewM3h]];
  const valid = opts.filter(([, q]) => q > 0);
  const [governs, qEff] = valid.length ? valid.reduce((a, b) => (b[1] < a[1] ? b : a)) : (["pump", 0] as ["pump", number]);
  const vOrder = i.orderM3 + i.primingM3;
  const trucks = i.loadM3 > 0 ? Math.ceil(vOrder / i.loadM3 - 1e-9) : 0;
  const interval = qEff > 0 ? (i.loadM3 / qEff) * 60 : 0;
  const cycle = i.loadMin + 2 * i.travelMin + interval + i.washMin;
  const fleet = interval > 0 ? Math.ceil(cycle / interval - 1e-9) + 1 : 0;
  const duration = qEff > 0 ? i.setupMin + (vOrder / qEff) * 60 + i.cleanupMin : 0;
  const start = minOf(i.start);
  const schedule = Array.from({ length: Math.min(trucks, 200) }, (_, k) => ({
    n: k + 1,
    at: hhmm(start + i.setupMin + k * interval),
    cumM3: Math.min(vOrder, (k + 1) * i.loadM3),
  }));
  const trace: TraceStep[] = [
    { label: "معدل الصب الفعلي (الأبطأ يحكم)", expr: `min(${i.pumpM3h}, ${i.plantM3h}, ${i.crewM3h})`, value: `${r(qEff, 1)} m³/h` },
    { label: "كمية الطلب", expr: "Σ V_net·(1+w) + فاقد التحضير", value: `${r(vOrder, 1)} m³` },
    { label: "عدد الخلاطات", expr: "⌈V_order / حمولة⌉", value: String(trucks) },
    { label: "الفاصل بين الخلاطات", expr: "حمولة / Q · 60", value: `${r(interval, 1)} min` },
    { label: "زمن الدورة", expr: "تحميل + 2·مشوار + فاصل + غسيل", value: `${r(cycle, 1)} min` },
    { label: "الخلاطات على الطريق", expr: "⌈دورة / فاصل⌉ + 1", value: String(fleet) },
    { label: "مدة الصب", expr: "تجهيز + V/Q·60 + تنظيف", value: `${r(duration, 1)} min` },
  ];
  return { vOrderM3: vOrder, qEff, governs, trucks, intervalMin: interval, cycleMin: cycle, fleet, durationMin: duration, startAt: hhmm(start), endAt: hhmm(start + duration), schedule, trace };
}

export function concColdJoint(qEffM3h: number, tCoverMin: number, layerM: number, stripAreaM2: number, stripLenM = 0) {
  const aMax = layerM > 0 ? (qEffM3h * tCoverMin) / 60 / layerM : 0;
  return { aMaxM2: aMax, ok: !stripAreaM2 || stripAreaM2 <= aMax + 1e-9, maxWidthM: stripLenM > 0 ? aMax / stripLenM : null };
}

export type ConcCubeRule = { rule: "perVolume" | "first50then100"; volPerSet: number; minSets: number; perSet: number; spares: boolean };
export const CUBES_DEFAULT: ConcCubeRule = { rule: "perVolume", volPerSet: 50, minSets: 1, perSet: 6, spares: true };

export function concCubes(vOrderM3: number, c: ConcCubeRule) {
  const sets = c.rule === "first50then100"
    ? 1 + Math.ceil(Math.max(0, vOrderM3 - 50) / 100 - 1e-9)
    : Math.max(c.minSets, Math.ceil(vOrderM3 / c.volPerSet - 1e-9));
  const spares = c.spares ? 3 * sets : 0;
  return { sets, cubes: sets * c.perSet + spares, spares };
}

export function concCalendar(pourIso: string, i: { slabSpanM?: number | null; beamSpanM?: number | null; airC: number; cement: "opc" | "blended" }) {
  const out: { item: string; dateIso: string; basis: string }[] = [];
  out.push({ item: "فك الجوانب الرأسية", dateIso: addDays(pourIso, i.airC >= 21 ? 2 : 3), basis: i.airC >= 21 ? "48 h ≥ 21 °C" : "72 h < 21 °C" });
  out.push({ item: "فك جوانب البلاطات", dateIso: addDays(pourIso, 3), basis: "3 d" });
  out.push({ item: "فك بطنيات الكمرات", dateIso: addDays(pourIso, 7), basis: "7 d" });
  if (i.slabSpanM) out.push({ item: "فك قوائم البلاطات", dateIso: addDays(pourIso, i.slabSpanM <= 4.5 ? 7 : 14), basis: i.slabSpanM <= 4.5 ? "7 d (≤ 4.5 m)" : "14 d (> 4.5 m)" });
  if (i.beamSpanM) out.push({ item: "فك قوائم الكمرات", dateIso: addDays(pourIso, i.beamSpanM <= 6 ? 14 : 21), basis: i.beamSpanM <= 6 ? "14 d (≤ 6 m)" : "21 d (> 6 m)" });
  out.push({ item: "نهاية المعالجة", dateIso: addDays(pourIso, i.cement === "opc" ? 7 : 10), basis: i.cement === "opc" ? "OPC 7 d" : "blended 10 d" });
  out.push({ item: "كسر مكعبات 7 أيام", dateIso: addDays(pourIso, 7), basis: "7 d" });
  out.push({ item: "كسر مكعبات 28 يومًا", dateIso: addDays(pourIso, 28), basis: "28 d" });
  return out;
}
