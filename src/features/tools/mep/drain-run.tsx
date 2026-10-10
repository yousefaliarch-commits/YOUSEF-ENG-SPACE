// =====================================================================
//  مناسيب غرف التفتيش — drain run invert schedule + sight rails (screen + PDF with a longitudinal section).
//  Engine: src/domain/tools/mep-calc.ts
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { DRN_ENGINE, drnGradeStake, drnMinSlope, drnRun, drnSightRail, type DrainProfile } from "../../../domain/tools/mep-calc";
import type { DocBlock, VPath } from "../../../doc/model";
import { iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Reach = { mh: string; len: string; gl: string; dn: string; slope: string; drop: string };
type Body = { profile: DrainProfile; startMh: string; startIl: string; startGl: string; minCover: string; outfall: string; traveller: string; peg: string; stake: string; design: string; reaches: Reach[] };

const mm = (s: string) => {
  const v = numInputParse(s || "", { allowNegative: true });
  return v == null ? null : Math.round(v * 1000);
};
const m3 = (x: number | null | undefined) => (x == null ? "—" : (x / 1000).toFixed(3));

const blank = (): Body => ({ profile: "metric", startMh: "MH1", startIl: "", startGl: "", minCover: "0.6", outfall: "", traveller: "2.0", peg: "", stake: "", design: "", reaches: [{ mh: "MH2", len: "", gl: "", dn: "150", slope: "", drop: "" }] });

function compute(b: Body) {
  return drnRun({
    startIlMm: mm(b.startIl) ?? 0, minCoverMm: mm(b.minCover) ?? 600, profile: b.profile, outfallIlMm: mm(b.outfall),
    reaches: b.reaches.map((r) => ({ lenM: numInputParse(r.len) ?? 0, dnMm: numInputParse(r.dn) ?? 150, slopePct: numInputParse(r.slope), dropMm: mm(r.drop) ?? 0, glMm: mm(r.gl) })),
  });
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const r = compute(b);
  const last = r.nodes[r.nodes.length - 1];
  const rail = mm(b.startIl) != null ? drnSightRail(mm(b.startIl)!, mm(b.traveller) ?? 2000, mm(b.peg)) : null;
  const stake = mm(b.stake) != null && mm(b.design) != null ? drnGradeStake(mm(b.stake)!, mm(b.design)!) : null;
  return (
    <div className="space-y-3">
      <ResultHero label="منسوب آخر غرفة" value={last ? m3(last.ilOutMm) : "—"} unit="m" sub={last ? `العمق ${m3(last.depthMm)} م · الطول ${last.chainM} م` : ""} tone={r.ok ? "accent" : "bad"} />
      <Card title="البداية">
        <div className="space-y-2.5">
          <Pick label="الميول الدنيا" items={[["metric", "متري (1 % / 0.5 %) ⚑"], ["ipc", "IPC صارم"]]} value={b.profile} onChange={(v) => put({ profile: v })} />
          <Grid2>
            <TextField label="أول غرفة" dir="ltr" value={b.startMh} onChange={(v) => put({ startMh: v })} />
            <NumField label="منسوب القاع" unit="m" value={b.startIl} onChange={(v) => put({ startIl: v })} />
            <NumField label="منسوب الأرض" unit="m" value={b.startGl} onChange={(v) => put({ startGl: v })} />
            <NumField label="أقل غطاء" unit="m" value={b.minCover} onChange={(v) => put({ minCover: v })} />
            <NumField label="منسوب المجمع العمومي" unit="m" value={b.outfall} onChange={(v) => put({ outfall: v })} />
          </Grid2>
        </div>
      </Card>
      <Card title="المسافات والغرف">
        <RowCards<Reach>
          rows={b.reaches} onChange={(reaches) => put({ reaches })} max={200} addLabel="غرفة تالية"
          blank={() => ({ mh: `MH${b.reaches.length + 2}`, len: "", gl: "", dn: b.reaches[b.reaches.length - 1]?.dn || "150", slope: b.reaches[b.reaches.length - 1]?.slope || "", drop: "" })}
          summary={(x, i) => `${x.mh} · ${x.len || 0} م · IL ${m3(r.nodes[i]?.ilInMm)} · عمق ${m3(r.nodes[i]?.depthMm)}${r.nodes[i]?.checks.some((c) => c.ok === false) ? " ✗" : ""}`}
          render={(x, s, i) => (
            <>
              <Grid2>
                <TextField label="الغرفة" dir="ltr" value={x.mh} onChange={(v) => s({ ...x, mh: v })} />
                <NumField label="الطول من السابقة" unit="m" value={x.len} onChange={(v) => s({ ...x, len: v })} />
                <NumField label="منسوب الأرض" unit="m" value={x.gl} onChange={(v) => s({ ...x, gl: v })} />
                <NumField label="القطر DN" unit="mm" value={x.dn} onChange={(v) => s({ ...x, dn: v })} />
                <NumField label="الميل" unit="%" value={x.slope} onChange={(v) => s({ ...x, slope: v })} hint={`فارغ = أقل ميل ${drnMinSlope(numInputParse(x.dn) ?? 150, b.profile)} %`} />
                <NumField label="هبوط داخل الغرفة" unit="m" value={x.drop} onChange={(v) => s({ ...x, drop: v })} />
              </Grid2>
              {r.nodes[i] && <Checks items={r.nodes[i].checks} />}
            </>
          )}
        />
      </Card>
      {!r.outfallOk && <Note tone="warn">آخر منسوب أوطى من المجمع العمومي — راجع الميول أو استخدم رفع.</Note>}
      <Card title="المساطر والأوتاد">
        <Grid2>
          <NumField label="طول المسطرة المتنقلة" unit="m" value={b.traveller} onChange={(v) => put({ traveller: v })} />
          <NumField label="منسوب الوتد" unit="m" value={b.peg} onChange={(v) => put({ peg: v })} />
          <NumField label="منسوب وتد الحفر" unit="m" value={b.stake} onChange={(v) => put({ stake: v })} />
          <NumField label="المنسوب التصميمي" unit="m" value={b.design} onChange={(v) => put({ design: v })} />
        </Grid2>
        {rail && <p className="mt-2 text-[12.5px]">منسوب المسطرة عند {b.startMh}: <bdi dir="ltr" className="font-grotesk">{m3(rail.railMm)}</bdi>{rail.markAbovePegMm != null && <> · العلامة فوق الوتد <bdi dir="ltr" className="font-grotesk">{m3(rail.markAbovePegMm)}</bdi></>}</p>}
        {stake && <p className="text-[12.5px]">وتد الحفر: <bdi dir="ltr" className="font-grotesk">{stake.label}</bdi></p>}
      </Card>
      <Note>حساب مناسيب وتوقيع؛ الميول الدنيا والمسافات وأبعاد الغرف حسب الملف المختار ويجب مطابقتها بكود الصرف المصري واشتراطات شركة المياه.</Note>
    </div>
  );
}

// the longitudinal section: ground and invert, chainage across 240 mm, levels exaggerated
function profilePaths(b: Body, r: ReturnType<typeof compute>): { paths: VPath[]; w: number; h: number } {
  const pts = [{ ch: 0, gl: mm(b.startGl), il: mm(b.startIl) ?? 0, mh: b.startMh }, ...r.nodes.map((n, i) => ({ ch: n.chainM, gl: n.depthMm != null ? n.ilInMm + n.depthMm : null, il: n.ilInMm, mh: b.reaches[i].mh }))];
  const total = Math.max(1, pts[pts.length - 1].ch);
  const lv = pts.flatMap((p) => [p.il, p.gl ?? p.il]);
  const lo = Math.min(...lv), hi = Math.max(...lv);
  const W = 240, H = 50;
  const x = (ch: number) => (ch / total) * W;
  const y = (l: number) => H - ((l - lo) / Math.max(1, hi - lo)) * (H - 8) - 4;
  const line = (sel: (p: any) => number | null) => pts.filter((p) => sel(p) != null).map((p, i) => `${i ? "L" : "M"}${x(p.ch).toFixed(2)} ${y(sel(p)!).toFixed(2)}`).join(" ");
  const paths: VPath[] = [{ d: line((p) => p.gl), dash: [1.2, 0.8] }, { d: line((p) => p.il) }];
  pts.forEach((p) => paths.push({ d: `M${x(p.ch).toFixed(2)} ${y(p.il).toFixed(2)} V${y(p.gl ?? p.il).toFixed(2)}`, label: { x: x(p.ch), y: H + 3, t: `${p.mh} ${m3(p.il)}` } }));
  return { paths, w: W, h: H + 5 };
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const r = compute(b);
  const prof = profilePaths(b, r);
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الميول", value: b.profile === "ipc" ? "IPC" : "متري ⚑" }, { label: "أول غرفة", value: iso(`${b.startMh} IL ${b.startIl}`) }, { label: "المجمع العمومي", value: iso(b.outfall || "—") },
    ] },
    {
      k: "table", id: "drn", caption: "", grid: true,
      cols: [
        { key: "mh", label: "الغرفة", wMm: 18, align: "center" }, { key: "ch", label: "المسافة التراكمية", unit: "m", wMm: 22, align: "end", num: { dp: 2 } },
        { key: "gl", label: "منسوب الأرض", wMm: 20, align: "end", num: { dp: 3 } }, { key: "ilIn", label: "قاع داخل", wMm: 20, align: "end", num: { dp: 3 } },
        { key: "ilOut", label: "قاع خارج", wMm: 20, align: "end", num: { dp: 3 } }, { key: "depth", label: "العمق", wMm: 18, align: "end", num: { dp: 3 } },
        { key: "len", label: "الطول", unit: "m", wMm: 16, align: "end", num: { dp: 2 } }, { key: "s", label: "الميل %", wMm: 16, align: "end", num: { dp: 3 } },
        { key: "dn", label: "DN", wMm: 14, align: "end", num: { dp: 0 } }, { key: "size", label: "الغرفة", wMm: 18, align: "center" },
        { key: "cover", label: "الغطاء", wMm: 18, align: "end", num: { dp: 3 } }, { key: "r", label: "النتيجة", wMm: 30, align: "center", mark: true },
      ],
      rows: r.nodes.map((n, i) => ({
        cells: { mh: iso(b.reaches[i].mh), ch: n.chainM, gl: n.depthMm != null ? (n.ilInMm + n.depthMm) / 1000 : null, ilIn: n.ilInMm / 1000, ilOut: n.ilOutMm / 1000, depth: n.depthMm != null ? n.depthMm / 1000 : null, len: numInputParse(b.reaches[i].len) ?? 0, s: n.slopePct, dn: numInputParse(b.reaches[i].dn) ?? 0, size: iso(n.mhSize), cover: n.coverMm != null ? n.coverMm / 1000 : null },
        mark: n.checks.every((c) => c.ok !== false) ? "ok" : "fail",
      })),
    },
    { k: "sketch", wMm: prof.w, hMm: prof.h, paths: prof.paths, caption: "القطاع الطولي — الأرض متقطع، القاع متصل (رأسي مكبّر)" },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "siteEngineer", "consultantRep"] });
}

export const module: ToolModule<Body> = {
  kind: "drainRun", v: 1, docType: "DRN", docTypeName: "جدول مناسيب الصرف · Drain invert schedule", discipline: "صحي", engine: DRN_ENGINE,
  profile: { id: "drain-eg@1", edition: "metric / IPC", values: {}, overridden: [], unverified: ["metricSlopes", "mhSizes"] },
  blank,
  defaultTitle: () => "مناسيب غرف التفتيش",
  Editor,
  build,
  summary: (doc) => {
    const r = compute(doc.body);
    const last = r.nodes[r.nodes.length - 1];
    return [`مناسيب الصرف · ⁦${r.nodes.length}⁩ غرفة`, last ? `آخر قاع ⁦${m3(last.ilOutMm)}⁩ · عمق ⁦${m3(last.depthMm)}⁩` : "", r.ok ? "كل الفحوص مقبولة" : "توجد فحوص غير مطابقة", "راجع المستند الكامل"].filter(Boolean).join("\n");
  },
};
