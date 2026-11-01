// =====================================================================
//  BOQ in, measured quantities out (W8) — the two screens around domain/tools/boq.ts:
//  · BoqImportCard (in the payment certificate): an .xlsx / .csv / .tsv file or a paste → a preview with every problem named
//    (errors block the import until the file is fixed) → «استبدال البنود» keeps what was already certified for items whose code
//    is unchanged, or «إضافة للبنود».
//  · SendToIpc (in the take-off; engineers and owners only — the certificate is a money tool): the measured quantities per BOQ
//    item go into a draft certificate of the same project as this period's quantities (current = measured − previous); a
//    different unit, an unknown item or a line with no item code is listed, never applied.
// =====================================================================
import { useEffect, useState } from "react";
import { FileUp, Send } from "lucide-react";
import { applyMeasured, importBoq, measuredByItem, parseDelimited, type BoqMapping, type BoqRow } from "../../../domain/tools/boq";
import { readXlsx, type ReadSheet } from "../../../doc/xlsx-read";
import { fmtNum } from "../../../doc/text";
import type { ToolDoc, ToolHeader } from "../../../data/tool-docs";
import { AreaField, Card, Note, Pick } from "../../../ui/kit";
import { Num } from "../../../ui/primitives";

const FIELDS: [keyof BoqMapping, string][] = [["ref", "رقم البند"], ["desc", "البيان"], ["unit", "الوحدة"], ["qty", "الكمية"], ["rate", "الفئة"], ["amount", "القيمة"]];

// UTF-8 first; an Arabic CSV saved by older Excel is Windows-1256
export function decodeText(buf: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(buf);
    } catch {
      return new TextDecoder().decode(buf);
    }
  }
}

export function BoqImportCard({ ro, onApply }: { ro: boolean; onApply: (rows: BoqRow[], mode: "replace" | "append") => void }) {
  const [open, setOpen] = useState(false);
  const [sheets, setSheets] = useState<ReadSheet[]>([]);
  const [sheet, setSheet] = useState(0);
  const [paste, setPaste] = useState("");
  const [manual, setManual] = useState<{ header: number; mapping: BoqMapping } | null>(null);
  const [err, setErr] = useState("");
  if (ro) return null;
  const rows = sheets[sheet]?.rows || [];
  const res = rows.length ? (manual ? importBoq(rows, manual.mapping, manual.header) : importBoq(rows)) : null;
  const errors = res ? res.issues.filter((i) => i.level === "error") : [];
  const warns = res ? res.issues.filter((i) => i.level === "warn") : [];
  const header = res ? (manual ? manual.header : res.header) : -1;
  const titles = header >= 0 ? rows[header] || [] : rows[0] || [];
  const cols = Math.max(0, ...rows.slice(0, 20).map((r) => r.length));
  const load = async (f: File | undefined) => {
    setErr("");
    setManual(null);
    if (!f) return;
    const buf = await f.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const zip = u8[0] === 0x50 && u8[1] === 0x4b;
    const got = zip ? readXlsx(u8) : [{ name: f.name, rows: parseDelimited(decodeText(buf)) }];
    if (!got.length || !got.some((s) => s.rows.length)) setErr(zip ? "تعذّرت قراءة ملف Excel — احفظه بصيغة .xlsx أو CSV وأعد المحاولة." : "الملف فارغ.");
    setSheets(got);
    setSheet(Math.max(0, got.findIndex((s) => s.rows.length > 1)));
  };
  return (
    <Card title="استيراد جدول الكميات (المقايسة)">
      {!open ? (
        <button type="button" data-boq-open onClick={() => setOpen(true)} className="press w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-3 text-[13.5px] text-accent">
          <FileUp size={17} /> من Excel أو CSV أو لصق من جدول
        </button>
      ) : (
        <div className="space-y-3" data-boq>
          <label className="block">
            <span className="block text-[12px] text-ink-2 mb-1">الملف</span>
            <input type="file" accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-boq-file
              onChange={(e) => void load(e.target.files?.[0])} className="block w-full text-[13px] file:me-3 file:min-h-11 file:px-4 file:rounded-xl file:border-0 file:bg-wash file:text-accent" />
          </label>
          <AreaField label="أو الصق الصفوف من Excel (مع صف العناوين)" value={paste} rows={3} onChange={(v) => {
            setPaste(v);
            setManual(null);
            setErr("");
            setSheets(v.trim() ? [{ name: "لصق", rows: parseDelimited(v) }] : []);
            setSheet(0);
          }} />
          {sheets.length > 1 && <Pick label="الورقة" items={sheets.map((s, i) => [String(i), s.name] as [string, string])} value={String(sheet)} onChange={(v) => { setSheet(Number(v)); setManual(null); }} />}
          {err && <Note tone="warn">{err}</Note>}
          {res && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center" data-boq-summary>
                <div className="p-2.5 rounded-xl bg-canvas border border-line"><p className="text-[11px] text-ink-2">بنود</p><p className="text-[18px] font-semibold"><Num>{res.items.length}</Num></p></div>
                <div className={`p-2.5 rounded-xl border ${errors.length ? "border-bad/40 bg-bad/5" : "border-line bg-canvas"}`}><p className="text-[11px] text-ink-2">أخطاء</p><p className={`text-[18px] font-semibold ${errors.length ? "text-bad" : ""}`} data-boq-errors={errors.length}><Num>{errors.length}</Num></p></div>
                <div className="p-2.5 rounded-xl bg-canvas border border-line"><p className="text-[11px] text-ink-2">تنبيهات</p><p className="text-[18px] font-semibold"><Num>{warns.length}</Num></p></div>
              </div>
              <details className="rounded-xl border border-line bg-canvas" open={!!errors.length || res.items.length === 0}>
                <summary className="min-h-11 px-3 flex items-center text-[12.5px] cursor-pointer">الأعمدة المستخدمة {res.items.length ? "" : "— اخترها يدويًا"}</summary>
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  <label className="block col-span-2 text-[12px] text-ink-2">صف العناوين
                    <input type="number" min={1} value={header + 1} onChange={(e) => setManual({ header: Math.max(0, Number(e.target.value) - 1), mapping: manual?.mapping || res.mapping })} className="mt-1 w-full h-11 px-3 rounded-xl bg-surface border border-line-2 font-grotesk" />
                  </label>
                  {FIELDS.map(([f, label]) => (
                    <label key={f} className="block text-[12px] text-ink-2">{label}
                      <select value={(manual?.mapping || res.mapping)[f] ?? ""} data-boq-col={f}
                        onChange={(e) => setManual({ header: header < 0 ? 0 : header, mapping: { ...(manual?.mapping || res.mapping), [f]: e.target.value === "" ? undefined : Number(e.target.value) } })}
                        className="mt-1 w-full h-11 px-2 rounded-xl bg-surface border border-line-2 text-[13px]">
                        <option value="">—</option>
                        {Array.from({ length: cols }, (_, c) => <option key={c} value={c}>{String.fromCharCode(65 + (c % 26))}{c >= 26 ? Math.floor(c / 26) : ""} · {String(titles[c] || "").slice(0, 24)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
              {res.issues.length > 0 && (
                <ul className="space-y-1 text-[12px]" data-boq-issues>
                  {res.issues.slice(0, 8).map((i, k) => <li key={k} className={i.level === "error" ? "text-bad" : "text-warn"}>{i.text}</li>)}
                  {res.issues.length > 8 && <li className="text-ink-3">و <Num>{res.issues.length - 8}</Num> ملاحظات أخرى</li>}
                </ul>
              )}
              {res.items.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-[12px]">
                    <thead className="bg-surface"><tr>{["البند", "البيان", "الوحدة", "الكمية", "الفئة"].map((h) => <th key={h} className="px-2 py-1.5 text-start font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {res.items.slice(0, 6).map((x) => (
                        <tr key={x.row} className="border-t border-line">
                          <td className="px-2 py-1.5"><bdi dir="ltr">{x.ref || "—"}</bdi></td>
                          <td className="px-2 py-1.5 max-w-[14rem] truncate" dir="auto">{x.desc}</td>
                          <td className="px-2 py-1.5">{x.unit || "—"}</td>
                          <td className="px-2 py-1.5"><Num>{fmtNum(x.qty, 3)}</Num></td>
                          <td className="px-2 py-1.5"><Num>{fmtNum(x.rate, 2)}</Num></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.length > 0 && <Note tone="warn">صحّح الأخطاء في الملف ثم أعد الاستيراد — لا يُحفظ شيء قبل ذلك.</Note>}
              <div className="flex gap-2">
                <button type="button" data-boq-replace disabled={!!errors.length || !res.items.length} onClick={() => { onApply(res.items, "replace"); setOpen(false); setSheets([]); setPaste(""); }}
                  className="press flex-1 min-h-12 rounded-xl btn-primary text-[13.5px] font-medium disabled:opacity-50">استبدال البنود</button>
                <button type="button" data-boq-append disabled={!!errors.length || !res.items.length} onClick={() => { onApply(res.items, "append"); setOpen(false); setSheets([]); setPaste(""); }}
                  className="press flex-1 min-h-12 rounded-xl border border-line-2 bg-surface text-[13.5px] disabled:opacity-50">إضافة للبنود</button>
              </div>
              <p className="text-[11.5px] text-ink-3 leading-relaxed">الاستبدال يحتفظ بالكميات السابقة وكميات الفترة للبنود التي لم يتغير رقمها.</p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

type IpcDoc = ToolDoc<{ items: { id: string; ref: string; unit: string; qp: string; qq: string }[] }>;

export function SendToIpc({ app, projectId, lines }: { app: any; projectId: string | null; lines: { boq?: string; unit: string; net: number }[] }) {
  const [targets, setTargets] = useState<ToolHeader[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof applyMeasured> | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const { measured, unassigned } = measuredByItem(lines);
  const drafts = (app.toolIndex || []).filter((h: ToolHeader) => h.kind === "ipc" && !h.deleted && h.status === "draft" && (h.projectId || null) === projectId);
  const sig = drafts.map((h: ToolHeader) => h.id).join();
  useEffect(() => setTargets(drafts), [sig]);
  useEffect(() => {
    if (!pick) return setPreview(null);
    let live = true;
    app.toolStore().then((s: any) => {
      const d: IpcDoc | null = s.get(pick);
      if (live && d) setPreview(applyMeasured(d.body.items, measured));
    });
    return () => {
      live = false;
    };
  }, [pick, lines]);
  const send = async () => {
    if (!pick || busy) return;
    setBusy(true);
    try {
      const s = await app.toolStore();
      const d: IpcDoc | null = s.get(pick);
      if (!d) throw new Error("gone");
      const r = applyMeasured(d.body.items, measured);
      const res = await s.save({ ...d, body: { ...d.body, items: r.items } }, "edit");
      if (res.status === "failed") throw new Error("save");
      setDone(pick);
      app.toast(`حُدِّث المستخلص — ${r.applied.length} بند`);
    } catch {
      app.toast("تعذّر تحديث المستخلص");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="أرسل للمستخلص">
      <p className="text-[12.5px] text-ink-2 leading-relaxed">الكمية المقاسة لكل بند مقايسة تصبح الكمية التراكمية في مستخلص مسودة لنفس المشروع: كمية الفترة = المقاس − السابق.</p>
      <p className="mt-1.5 text-[12px] text-ink-3"><Num>{measured.length}</Num> بند مقايسة{unassigned ? <> · <Num>{unassigned}</Num> سطر بدون رقم بند</> : null}</p>
      {!measured.length && <Note>اكتب «بند المقايسة» في سطور الحصر أولًا.</Note>}
      {measured.length > 0 && targets && !targets.length && <Note>لا يوجد مستخلص مسودة في هذا المشروع — أنشئ مستخلصًا من أداة المستخلص الجاري ثم عد هنا.</Note>}
      {measured.length > 0 && targets && targets.length > 0 && (
        <div className="mt-2 space-y-2" data-send-ipc>
          <Pick label="المستخلص" items={targets.map((h) => [h.id, `${h.title} · ${h.dateIso}`] as [string, string])} value={pick || ""} onChange={(v) => { setPick(v); setDone(null); }} />
          {preview && (
            <ul className="text-[12px] space-y-1" data-send-preview>
              {preview.applied.map((a) => <li key={a.ref}><bdi dir="ltr" className="font-grotesk">{a.ref}</bdi>: المقاس <Num>{fmtNum(a.measured, 3)}</Num> − السابق <Num>{fmtNum(a.previous, 3)}</Num> = <Num>{fmtNum(a.current, 3)}</Num>{a.current < 0 ? " (تصحيح)" : ""}</li>)}
              {preview.unitConflicts.map((c) => <li key={`u${c.ref}`} className="text-bad"><bdi dir="ltr">{c.ref}</bdi>: الوحدة في المستخلص {c.boqUnit} وفي الحصر {c.measuredUnit} — لن يُرسل</li>)}
              {preview.unmatched.map((m) => <li key={`x${m.ref}`} className="text-warn"><bdi dir="ltr">{m.ref}</bdi>: غير موجود في المستخلص — لن يُرسل</li>)}
            </ul>
          )}
          <div className="flex gap-2">
            <button type="button" data-send-go disabled={!preview || !preview.applied.length || busy} onClick={() => void send()} className="press flex-1 min-h-12 inline-flex items-center justify-center gap-2 rounded-xl btn-primary text-[13.5px] font-medium disabled:opacity-50">
              <Send size={16} /> {busy ? "جارٍ…" : "حدّث المستخلص"}
            </button>
            {done && <button type="button" data-send-open onClick={() => app.push({ type: "tooldoc", id: `ipc:${done}` })} className="press flex-1 min-h-12 rounded-xl border border-line-2 bg-surface text-[13.5px]">افتح المستخلص</button>}
          </div>
        </div>
      )}
    </Card>
  );
}
