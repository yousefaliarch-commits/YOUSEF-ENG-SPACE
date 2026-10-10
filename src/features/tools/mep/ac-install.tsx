// =====================================================================
//  فحص تركيب التكييف — AC installation check (screen + PDF). Engine: src/domain/tools/mep-calc.ts
//  · One card per unit: capacity (Btu/h; the HP label is shown, never used), the manual's limits and line sizes (never
//    defaulted), measured length / lift / installed sizes, the drain run. Live PASS / FAIL and the extra charge.
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { AC_ENGINE, TR_KW, acxCondensate, acxHpLabel, acxLineSet } from "../../../domain/tools/mep-calc";
import type { DocBlock } from "../../../doc/model";
import { iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Check, Grid2, Note, NumField, ResultHero, RowCards, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Unit = {
  tag: string; room: string; model: string; btuh: string;
  maxLen: string; maxLift: string; pre: string; gpm: string; mLiq: string; mGas: string;
  len: string; lift: string; liq: string; gas: string;
  run: string; slope: string; trap: boolean;
};
type Body = { units: Unit[] };
const N = (s: string) => numInputParse(s || "") ?? 0;
const blankUnit = (): Unit => ({ tag: "", room: "", model: "", btuh: "18000", maxLen: "", maxLift: "", pre: "", gpm: "", mLiq: "", mGas: "", len: "", lift: "", liq: "", gas: "", run: "", slope: "1", trap: true });

function check(u: Unit) {
  const tr = (N(u.btuh) / 12000);
  const c = acxCondensate({ tr, runM: N(u.run), slopePct: N(u.slope) });
  const ls = acxLineSet({ lenM: N(u.len), liftM: N(u.lift), maxLenM: N(u.maxLen), maxLiftM: N(u.maxLift), preM: N(u.pre), gPerM: N(u.gpm), liquidIn: u.liq, gasIn: u.gas, manualLiquidIn: u.mLiq, manualGasIn: u.mGas });
  const ok = ls.lenOk && ls.liftOk && ls.sizesOk && c.slopeOk && u.trap;
  return { tr, c, ls, ok };
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const res = b.units.map(check);
  const fails = res.filter((x) => !x.ok).length;
  return (
    <div className="space-y-3">
      <ResultHero label="الوحدات" value={String(b.units.length)} unit="وحدة" sub={b.units.length ? `${b.units.length - fails} مطابقة · ${fails} تحتاج تصحيح` : "أضف أول وحدة"} tone={fails ? "bad" : "accent"} />
      <RowCards<Unit>
        rows={b.units} onChange={(units) => !ro && set({ units })} blank={blankUnit} addLabel="وحدة جديدة" max={120}
        summary={(u, i) => `${u.tag || `AC-${i + 1}`} · ${u.room || "—"} · ${res[i]?.ok ? "✓" : "✗"}${res[i]?.ls.extraG ? ` · +${res[i].ls.extraG} g` : ""}`}
        render={(u, s, i) => {
          const r = res[i];
          const f = (k: keyof Unit, l: string, unit?: string) => <NumField label={l} unit={unit} value={u[k] as string} onChange={(v) => s({ ...u, [k]: v })} />;
          const t = (k: keyof Unit, l: string) => <TextField label={l} dir="ltr" value={u[k] as string} onChange={(v) => s({ ...u, [k]: v })} placeholder={'1/4"'} />;
          return (
            <>
              <Grid2>
                <TextField label="الرقم" dir="ltr" value={u.tag} onChange={(v) => s({ ...u, tag: v })} />
                <TextField label="المكان" value={u.room} onChange={(v) => s({ ...u, room: v })} />
                <TextField label="الموديل" dir="ltr" value={u.model} onChange={(v) => s({ ...u, model: v })} />
                {f("btuh", `القدرة (${acxHpLabel(N(u.btuh))})`, "Btu/h")}
              </Grid2>
              <p className="text-[12px] text-ink-2">من كتالوج الوحدة</p>
              <Grid2>
                {f("maxLen", "أقصى طول", "m")}{f("maxLift", "أقصى فرق ارتفاع", "m")}{f("pre", "الطول المشحون مسبقًا", "m")}{f("gpm", "شحنة إضافية", "g/m")}
                {t("mLiq", "قطر السائل")}{t("mGas", "قطر الغاز")}
              </Grid2>
              <p className="text-[12px] text-ink-2">المنفّذ</p>
              <Grid2>
                {f("len", "الطول المنفذ", "m")}{f("lift", "فرق الارتفاع", "m")}{t("liq", "قطر السائل")}{t("gas", "قطر الغاز")}
                {f("run", "طول خط الصرف", "m")}{f("slope", "ميل الصرف", "%")}
              </Grid2>
              <Check label="يوجد سيفون (trap)" on={u.trap} onChange={(trap) => s({ ...u, trap })} />
              <ul className="text-[12px] space-y-0.5">
                <li className={r.ls.lenOk ? "text-good" : "text-bad"}>الطول {r.ls.lenOk ? "✓" : "✗"}</li>
                <li className={r.ls.liftOk ? "text-good" : "text-bad"}>فرق الارتفاع {r.ls.liftOk ? "✓" : "✗"}</li>
                <li className={r.ls.sizesOk ? "text-good" : "text-bad"}>الأقطار مطابقة للكتالوج {r.ls.sizesOk ? "✓" : "✗"}</li>
                <li className={r.c.slopeOk ? "text-good" : "text-bad"}>ميل الصرف ≥ 1 % {r.c.slopeOk ? "✓" : "✗"} · سقوط {Math.round(r.c.fallMm)} مم · أقل قطر {r.c.minDrainIn}</li>
                <li>الشحنة الإضافية: {r.ls.extraG} g</li>
              </ul>
            </>
          );
        }}
      />
      <Note>فحص موقعي؛ بيانات المصنّع (الأقطار والأطوال والشحنة) هي المرجع الملزم. وسائط التبريد A2L (مثل R32) لها حدود شحنة ومساحة غرفة — راجع دليل المصنّع.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const res = doc.body.units.map(check);
  const blocks: DocBlock[] = [{
    k: "table", id: "ac", caption: "", grid: true,
    cols: [
      { key: "tag", label: "الرقم", wMm: 16, align: "center" }, { key: "room", label: "المكان", wMm: 30, align: "start" }, { key: "model", label: "الموديل", wMm: 26, align: "start" },
      { key: "cap", label: "Btu/h", wMm: 18, align: "end" }, { key: "sizes", label: "الأقطار منفذ / كتالوج", wMm: 36, align: "center" },
      { key: "len", label: "الطول / الأقصى", unit: "m", wMm: 22, align: "center" }, { key: "lift", label: "الارتفاع / الأقصى", unit: "m", wMm: 22, align: "center" },
      { key: "extra", label: "شحنة إضافية", unit: "g", wMm: 18, align: "end", num: { dp: 0 } }, { key: "drain", label: "الصرف", wMm: 26, align: "center" },
      { key: "trap", label: "سيفون", wMm: 14, align: "center" }, { key: "r", label: "النتيجة", wMm: 33, align: "center", mark: true },
    ],
    rows: doc.body.units.map((u, i) => ({
      cells: {
        tag: iso(u.tag), room: u.room, model: iso(u.model), cap: iso(u.btuh), sizes: iso(`${u.liq}/${u.gas} · ${u.mLiq}/${u.mGas}`),
        len: iso(`${u.len} / ${u.maxLen}`), lift: iso(`${u.lift} / ${u.maxLift}`), extra: res[i].ls.extraG,
        drain: iso(`${res[i].c.minDrainIn} · ${u.slope}%`), trap: u.trap ? "✓" : "✗",
      },
      mark: res[i].ok ? "ok" : "fail",
    })),
  }];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "siteEngineer", "consultantRep"],
    basis: { rows: [{ key: "drain", label: "أقل قطر صرف حسب القدرة", value: "IMC T307.2.2", source: "IMC", conf: "M", flagged: false }, { key: "slope", label: "أقل ميل للصرف", value: "1", unit: "%", source: "ممارسة", conf: "M", flagged: true }, { key: "tr", label: "طن تبريد", value: String(TR_KW), unit: "kW", source: "تعريف", conf: "H", flagged: false }], formulas: [] } });
}

export const module: ToolModule<Body> = {
  kind: "acInstall", v: 1, docType: "ACI", docTypeName: "فحص تركيب التكييف · AC installation check", discipline: "ميكانيكا", engine: AC_ENGINE,
  profile: { id: "ac-site@1", edition: "IMC 307.2.2 · maker manuals", values: { minSlopePct: 1 }, overridden: [], unverified: ["minSlopePct"] },
  blank: () => ({ units: [blankUnit()] }),
  defaultTitle: () => "فحص تركيب التكييف",
  Editor,
  build,
  summary: (doc) => {
    const res = doc.body.units.map(check);
    return [`فحص تركيب التكييف · ⁦${doc.body.units.length}⁩ وحدة`, `مطابقة ⁦${res.filter((r) => r.ok).length}⁩ · تحتاج تصحيح ⁦${res.filter((r) => !r.ok).length}⁩`, "راجع المستند الكامل"].join("\n");
  },
};
