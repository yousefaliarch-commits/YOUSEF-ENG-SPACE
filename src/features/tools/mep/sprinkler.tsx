// =====================================================================
//  توزيع وفحص الرشاشات — sprinkler count & spacing check (screen + PDF with a grid sketch per room).
//  Engine: src/domain/tools/mep-calc.ts. Spacings and counts only — not a hydraulic calculation (NFPA 13 ch. 28).
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { SPK_ENGINE, spkLayout, spkLimits, spkSiteCheck, type SpkCeiling, type SpkHazard, type SpkSystem } from "../../../domain/tools/mep-calc";
import type { DocBlock, VPath } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Room = { name: string; l: string; w: string; hazard: SpkHazard; system: SpkSystem; ceiling: SpkCeiling; member: string; mode: "design" | "site"; sx: string; sy: string; wx: string; wy: string; hmin: string };
type Body = { rooms: Room[] };
const N = (s: string) => numInputParse(s || "") ?? 0;
const blankRoom = (): Room => ({ name: "", l: "", w: "", hazard: "OH1", system: "hydraulic", ceiling: "nc-unobstructed", member: "", mode: "design", sx: "", sy: "", wx: "", wy: "", hmin: "" });

function check(r: Room) {
  const lim = spkLimits(r.hazard, r.system, r.ceiling, numInputParse(r.member) ?? undefined);
  const lay = N(r.l) && N(r.w) ? spkLayout(N(r.l), N(r.w), lim) : null;
  const site = r.mode === "site" ? spkSiteCheck({ sxM: N(r.sx), syM: N(r.sy), wallXM: N(r.wx), wallYM: N(r.wy), headMinM: N(r.hmin) || Math.min(N(r.sx), N(r.sy)) }, lim) : null;
  return { lim, lay, site };
}

const HAZ: [SpkHazard, string][] = [["LH", "خفيفة"], ["OH1", "عادية 1"], ["OH2", "عادية 2"], ["EH1", "شديدة 1"], ["EH2", "شديدة 2"]];

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const res = b.rooms.map(check);
  const heads = res.reduce((a, x) => a + (x.lay ? x.lay.n : 0), 0);
  const fails = res.filter((x) => x.site && !x.site.ok).length;
  return (
    <div className="space-y-3">
      <ResultHero label="عدد الرشاشات (التصميم)" value={String(heads)} unit="رشاش" sub={fails ? `${fails} غرفة لا تطابق في الموقع` : `${b.rooms.length} غرفة`} tone={fails ? "bad" : "accent"} />
      <RowCards<Room>
        rows={b.rooms} onChange={(rooms) => !ctx.readOnly && set({ rooms })} blank={blankRoom} addLabel="غرفة جديدة" max={150}
        summary={(r, i) => `${r.name || `غرفة ${i + 1}`} · ${res[i].lay ? `${res[i].lay!.n} رشاش` : "—"}${res[i].site ? (res[i].site!.ok ? " · ✓" : " · ✗") : ""}`}
        render={(r, s, i) => {
          const x = res[i];
          return (
            <>
              <TextField label="الغرفة" value={r.name} onChange={(v) => s({ ...r, name: v })} />
              <Grid2>
                <NumField label="الطول" unit="m" value={r.l} onChange={(v) => s({ ...r, l: v })} />
                <NumField label="العرض" unit="m" value={r.w} onChange={(v) => s({ ...r, w: v })} />
              </Grid2>
              <Pick label="درجة الخطورة" items={HAZ} value={r.hazard} onChange={(hazard) => s({ ...r, hazard })} />
              <Pick label="النظام" items={[["hydraulic", "حسابات هيدروليكية"], ["pipeSchedule", "جداول المواسير"]]} value={r.system} onChange={(system) => s({ ...r, system })} />
              {r.hazard === "LH" && <Pick label="السقف" items={[["nc-unobstructed", "غير قابل للاحتراق"], ["comb-obstructed", "قابل للاحتراق بعوائق"]]} value={r.ceiling} onChange={(ceiling) => s({ ...r, ceiling })} />}
              {x.lay && <p className="text-[12.5px]"><bdi dir="ltr" className="font-grotesk">{x.lay.nx} × {x.lay.ny} = {x.lay.n} · {fmtNum(x.lay.sx, 2)} × {fmtNum(x.lay.sy, 2)} m · {fmtNum(x.lay.areaM2, 2)} m²</bdi> (الحد {x.lim.areaM2} م² / {x.lim.sM} م)</p>}
              <Pick items={[["design", "تصميم"], ["site", "فحص موقع"]]} value={r.mode} onChange={(mode) => s({ ...r, mode })} />
              {r.mode === "site" && (
                <>
                  <Grid2>
                    <NumField label="المسافة X" unit="m" value={r.sx} onChange={(v) => s({ ...r, sx: v })} />
                    <NumField label="المسافة Y" unit="m" value={r.sy} onChange={(v) => s({ ...r, sy: v })} />
                    <NumField label="البعد عن الحائط X" unit="m" value={r.wx} onChange={(v) => s({ ...r, wx: v })} />
                    <NumField label="البعد عن الحائط Y" unit="m" value={r.wy} onChange={(v) => s({ ...r, wy: v })} />
                    <NumField label="أقل مسافة بين رشاشين" unit="m" value={r.hmin} onChange={(v) => s({ ...r, hmin: v })} />
                  </Grid2>
                  {x.site && <Checks items={x.site.checks} />}
                </>
              )}
            </>
          );
        }}
      />
      <Note>فحص مسافات وأعداد فقط — ليست حسابات هيدروليكية وفق NFPA 13 الفصل 28؛ تصنيف الخطورة والتصميم لمهندس مرخّص واعتماد الحماية المدنية.</Note>
    </div>
  );
}

function grid(l: number, w: number, nx: number, ny: number): VPath[] {
  const k = Math.min(80 / l, 40 / w);
  const W = l * k, H = w * k;
  const out: VPath[] = [{ d: `M0 0 H${W.toFixed(2)} V${H.toFixed(2)} H0 Z` }];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x = ((i + 0.5) * W) / nx, y = ((j + 0.5) * H) / ny;
    out.push({ d: `M${(x - 0.8).toFixed(2)} ${y.toFixed(2)} a0.8 0.8 0 1 0 1.6 0 a0.8 0.8 0 1 0 -1.6 0`, fill: true });
  }
  return out;
}

function build(doc: ToolDoc<Body>, project: any) {
  const res = doc.body.rooms.map(check);
  const blocks: DocBlock[] = [
    { k: "notes", text: "ليست حسابات هيدروليكية — فحص مسافات وأعداد حسب NFPA 13-2022 جدول 10.2.4.2.1 (رشاشات قياسية)." },
    {
      k: "table", id: "spk", caption: "", grid: true,
      cols: [
        { key: "room", label: "الغرفة", wMm: 32, align: "start" }, { key: "dim", label: "الأبعاد", unit: "m", wMm: 22, align: "center" },
        { key: "haz", label: "الخطورة", wMm: 18, align: "center" }, { key: "n", label: "العدد", wMm: 22, align: "center" },
        { key: "s", label: "المسافات", unit: "m", wMm: 24, align: "center" }, { key: "a", label: "م²/رشاش", wMm: 18, align: "end", num: { dp: 2 } },
        { key: "lim", label: "الحد", wMm: 18, align: "center" }, { key: "r", label: "الموقع", wMm: 20, align: "center", mark: true },
      ],
      rows: doc.body.rooms.map((r, i) => {
        const x = res[i];
        return {
          cells: { room: r.name, dim: iso(`${r.l} × ${r.w}`), haz: iso(r.hazard), n: x.lay ? iso(`${x.lay.nx}×${x.lay.ny} = ${x.lay.n}`) : "—", s: x.lay ? iso(`${fmtNum(x.lay.sx, 2)} × ${fmtNum(x.lay.sy, 2)}`) : "—", a: x.site ? x.site.areaM2 : x.lay ? x.lay.areaM2 : null, lim: iso(`${x.lim.areaM2} / ${x.lim.sM}`) },
          mark: x.site ? (x.site.ok ? "ok" : "fail") : "na",
        };
      }),
    },
  ];
  doc.body.rooms.forEach((r, i) => {
    const x = res[i];
    if (x.lay) blocks.push({ k: "sketch", wMm: Math.min(80, (N(r.l) / N(r.w)) * 40), hMm: Math.min(40, (N(r.w) / N(r.l)) * 80), paths: grid(N(r.l), N(r.w), x.lay.nx, x.lay.ny), caption: `${r.name} — ${x.lay.nx} × ${x.lay.ny}` });
  });
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["prepared", "siteEngineer", "consultantRep"] });
}

export const module: ToolModule<Body> = {
  kind: "sprinklerCheck", v: 1, docType: "SPK", docTypeName: "فحص توزيع الرشاشات · Sprinkler spacing check", discipline: "حريق", engine: SPK_ENGINE,
  profile: { id: "nfpa13-2022@1", edition: "NFPA 13-2022", values: {}, overridden: [], unverified: [] },
  blank: () => ({ rooms: [blankRoom()] }),
  defaultTitle: () => "فحص توزيع الرشاشات",
  Editor,
  build,
  summary: (doc) => {
    const res = doc.body.rooms.map(check);
    return [`فحص الرشاشات · ⁦${doc.body.rooms.length}⁩ غرفة`, `التصميم ⁦${res.reduce((a, x) => a + (x.lay ? x.lay.n : 0), 0)}⁩ رشاش`, "ليست حسابات هيدروليكية", "راجع المستند الكامل"].join("\n");
  },
};
