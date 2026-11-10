// v0.39 the public page: when the address shows it (and when it must not), the hero estimator against the app's own tool,
// and the sample sheets the showcase draws with the real tools.
import { describe, expect, it } from "vitest";
import { AUTH_PARAMS, entryView } from "../src/app/entry";
import { POUR_DEFAULTS, SLAB_DEFAULT, SLAB_RANGE, clampSlab, slabEstimate } from "../src/features/landing/estimator";
import { SAMPLES, SAMPLE_PROJECT } from "../src/features/landing/samples";
import { RELEASES_URL, downloadLinks } from "../src/features/landing/Landing";
import { module as concrete } from "../src/features/tools/concrete/concrete";
import { TOOL_MODULES } from "../src/features/tools/module";
import { applyDocControls } from "../src/data/doc-controls";
import { docLayout, fixedMeasurer } from "../src/doc/layout";
import { specDocx } from "../src/doc/docx";
import { specXlsx } from "../src/doc/xlsx";
import { kgPerM } from "../src/domain/tools/bbs-calc";
import type { DocBlock, DocSpec, DrawOp } from "../src/doc/model";
import type { ToolDoc } from "../src/data/tool-docs";

describe("what the web address opens", () => {
  const at = (hash: string, search = "", signedIn = false, native = false) => entryView({ native, hash, search, signedIn });
  it("the bare address shows the public page to a visitor", () => {
    expect(at("")).toBe("landing");
    expect(at("#")).toBe("landing");
    expect(at("#/")).toBe("landing");
    expect(at("", "?lang=en")).toBe("landing");
  });
  it("a signed-in member goes straight to the app — unless they ask for the page", () => {
    expect(at("", "", true)).toBe("app");
    expect(at("#landing", "", true)).toBe("landing");
    expect(at("#landing")).toBe("landing");
  });
  it("every app and admin route is the app", () => {
    for (const h of ["#app", "#app/home", "#app/tool/concrete", "#app/tooldoc/ipc:new", "#admin", "#admin/reports", "#app/post/p1"]) expect(at(h), h).toBe("app");
  });
  it("a return from sign-in is never intercepted — whatever Supabase sends back", () => {
    for (const k of AUTH_PARAMS) expect(at("", `?${k}=x`), k).toBe("app");
    expect(at("", "?code=abc123&state=xyz")).toBe("app");
    expect(at("", "?error=access_denied&error_description=Email+link+is+invalid")).toBe("app");
    expect(at("", "?reset=1")).toBe("app");
    expect(at("#access_token=eyJ&refresh_token=x&type=recovery")).toBe("app");
    expect(at("#error=server_error")).toBe("app");
  });
  it("the phone apps have no public page", () => {
    expect(at("", "", false, true)).toBe("app");
    expect(at("#landing", "", false, true)).toBe("app");
  });
});

describe("the download buttons", () => {
  it("use the build's links when they are plain https addresses", () => {
    const apk = "https://github.com/yousefaliarch-commits/YOUSEF-ENG-SPACE/releases/download/v0.39.0-preview/app-debug.apk";
    expect(downloadLinks({ VITE_APK_URL: apk, VITE_IPA_URL: "https://example.org/files/engspace.ipa" })).toEqual({ apk, ipa: "https://example.org/files/engspace.ipa" });
  });
  it("fall back to the releases list for anything else — a missing link, another scheme, a script", () => {
    for (const bad of [undefined, "", "http://example.org/a.apk", "javascript:alert(1)", "//evil.example/a.apk", "https://example.org/a.apk?x=<script>", "data:text/html,x"]) {
      expect(downloadLinks({ VITE_APK_URL: bad, VITE_IPA_URL: bad }), String(bad)).toEqual({ apk: RELEASES_URL, ipa: RELEASES_URL });
    }
  });
});

describe("the hero estimator is the app's own arithmetic", () => {
  const kpi = (s: DocSpec, label: string) => {
    for (const sec of s.sections) for (const b of sec.blocks) if (b.k === "kpis") for (const it of b.items) if (it.label === label) return it.value;
    return undefined;
  };
  const concreteDoc = (L: string, B: string, t: string): ToolDoc<ReturnType<typeof concrete.blank>> => ({
    id: "d", kind: "concrete", v: concrete.v, at: 1, createdAt: 1, projectId: null, title: "x", dateIso: "2026-11-10", docNo: null, rev: "00", status: "draft",
    profile: concrete.profile, photos: {}, log: [],
    body: { ...concrete.blank(), scope: "pour", rows: [{ kind: "slab", label: "", n: "1", dims: { L, B, t, open: "" }, waste: "" }] },
  });
  it("order and trucks equal the pour tool's document for the same slab", () => {
    for (const [L, B, tCm] of [[6, 4, 15], [12, 8.5, 20], [14, 10, 40], [2, 2, 10], [7.25, 5.75, 18]] as [number, number, number][]) {
      const e = slabEstimate({ ...SLAB_DEFAULT, L, B, tCm });
      const s = concrete.build(concreteDoc(String(L), String(B), String(tCm / 100)), null);
      expect(e.orderM3.toFixed(1), `${L}×${B}×${tCm}`).toBe(kpi(s, "كمية الطلب"));
      expect(String(e.trucks)).toBe(kpi(s, "عدد الخلاطات"));
    }
  });
  it("its pour defaults are the tool's blank document's", () => {
    const o = (concrete.blank() as { order: Record<string, string> }).order;
    expect({ primingM3: Number(o.priming), loadM3: Number(o.load), pumpM3h: Number(o.pump), plantM3h: Number(o.plant), crewM3h: Number(o.crew), travelMin: Number(o.travel), loadMin: Number(o.loadMin), washMin: Number(o.wash), setupMin: Number(o.setup), cleanupMin: Number(o.cleanup) })
      .toEqual({ ...POUR_DEFAULTS, start: undefined });
    expect(POUR_DEFAULTS.start).toBe((concrete.blank() as { start: string }).start);
  });
  it("6 × 4 × 0.15 with Ø12 @ 150 — by hand", () => {
    const e = slabEstimate(SLAB_DEFAULT);
    expect(e.netM3).toBeCloseTo(3.6, 9);
    expect(e.wastePct).toBe(2);
    expect(e.orderM3).toBeCloseTo(3.6 * 1.02 + 0.5, 9);
    expect(e.trucks).toBe(1);
    // bars along L across 4 m: ⌈(4 − 0.05) / 0.15⌉ + 1 = 28; along B across 6 m: ⌈5.95 / 0.15⌉ + 1 = 41
    expect(e.bars).toEqual({ alongL: 28, alongB: 41 });
    expect(e.steelKg).toBeCloseTo((28 * 6 + 41 * 4) * kgPerM(12), 6);
    expect(e.kgPerM3).toBeCloseTo(e.steelKg / 3.6, 9);
    expect(e.steps).toHaveLength(5);
    expect(e.steps[2].value).toBe("1");
  });
  it("more steel when the bars are closer or thicker; more concrete when the slab is thicker", () => {
    const base = slabEstimate(SLAB_DEFAULT);
    expect(slabEstimate({ ...SLAB_DEFAULT, spacingMm: 100 }).steelKg).toBeGreaterThan(base.steelKg);
    expect(slabEstimate({ ...SLAB_DEFAULT, d: 16 }).steelKg).toBeGreaterThan(base.steelKg);
    expect(slabEstimate({ ...SLAB_DEFAULT, tCm: 25 }).netM3).toBeGreaterThan(base.netM3);
  });
  it("whatever arrives, the inputs stay inside the sliders' range and the result is a number", () => {
    const wild = clampSlab({ L: 9999, B: -3, tCm: NaN, d: 7, spacingMm: 1 });
    expect(wild).toEqual({ L: SLAB_RANGE.L.max, B: SLAB_RANGE.B.min, tCm: SLAB_RANGE.tCm.min, d: SLAB_DEFAULT.d, spacingMm: SLAB_DEFAULT.spacingMm });
    const e = slabEstimate({ L: Infinity, B: NaN, tCm: -1, d: 0, spacingMm: 0 });
    for (const v of [e.netM3, e.orderM3, e.trucks, e.steelKg, e.kgPerM3]) expect(Number.isFinite(v)).toBe(true);
  });
});

describe("the showcase's sample sheets are drawn by the real tools", () => {
  const texts = (s: DocSpec) => docLayout(s, fixedMeasurer).pages.flatMap((p) => p.ops.filter((o): o is Extract<DrawOp, { op: "text" }> => o.op === "text").map((o) => o.text));
  const docOf = async (i: number) => {
    const sample = SAMPLES[i];
    const mod = await TOOL_MODULES[sample.kind]();
    const doc: ToolDoc = {
      id: `sample${i}`, kind: sample.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: sample.title, dateIso: "2026-11-05", docNo: sample.docNo, rev: sample.rev,
      status: "issued", profile: mod.profile, body: sample.body(mod.blank() as Record<string, unknown>), photos: {}, log: [], wbs: sample.wbs, revs: sample.revs,
    };
    return { mod, doc, spec: applyDocControls(mod.build(doc, SAMPLE_PROJECT), doc) };
  };
  it("every sample has an editor, builds, lays out and exports to Word and Excel", async () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < SAMPLES.length; i++) {
      const { mod, doc, spec } = await docOf(i);
      const layout = docLayout(spec, fixedMeasurer);
      expect(layout.pages.length, SAMPLES[i].kind).toBeGreaterThanOrEqual(1);
      expect(layout.warnings, SAMPLES[i].kind).toEqual([]);
      expect(specDocx(spec).length).toBeGreaterThan(1000);
      expect(specXlsx(spec, new Date("2026-11-05T00:00:00Z")).length).toBeGreaterThan(1000);
      expect(typeof mod.summary(doc)).toBe("string");
    }
  });
  it("the sheet is the firm's own: «شركتك هنا» issues it, the app's name is nowhere on it", async () => {
    for (let i = 0; i < SAMPLES.length; i++) {
      const { spec } = await docOf(i);
      const t = texts(spec);
      expect(t.some((x) => x.includes("شركتك هنا")), SAMPLES[i].kind).toBe(true);
      expect(t.join("\n")).not.toMatch(/engspace/i);
      expect(spec.meta.issuer).toBe("شركتك هنا");
    }
  });
  it("the pour plan shows its revision table and where the work is; no sample check fails", async () => {
    const { spec } = await docOf(0);
    const t = texts(spec);
    expect(t).toContain("تعديل موعد الصب وإضافة الكمرات");
    expect(spec.title.location.startsWith("برج A · الدور 03 · بلاطة S-301")).toBe(true);
    // a long location takes two lines in its cell: the whole WBS path is on the sheet, not cut after the building
    const loc = t.filter((x) => x.includes("برج A") || x.includes("S-301"));
    expect(loc.join(" ")).toContain("برج A");
    expect(loc.join(" ")).toContain("S-301");
    for (let i = 0; i < SAMPLES.length; i++) {
      const s = (await docOf(i)).spec;
      const checks = s.sections.flatMap((x) => x.blocks).filter((b): b is Extract<DocBlock, { k: "checks" }> => b.k === "checks").flatMap((b) => b.rows);
      expect(checks.filter((c) => c.ok === false).map((c) => c.label), SAMPLES[i].kind).toEqual([]);
    }
  });
  it("the certificate's sample numbers reconcile (no warning notes on the sheet)", async () => {
    const { spec } = await docOf(1);
    const notes = spec.sections.flatMap((x) => x.blocks).filter((b): b is Extract<DocBlock, { k: "notes" }> => b.k === "notes");
    expect(notes.map((n) => (typeof n.text === "string" ? n.text : "")).join("")).not.toMatch(/تتجاوز|سالب|لا توجد فئة/);
  });
});
