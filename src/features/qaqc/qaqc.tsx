// =====================================================================
//  QA/QC inspection checklists (Feature 7) — «فحص واستلام الأعمال»
//  Pick a ready template — or build your own checklist from scratch (title, category, sections, items) for any site element —
//  fill the header (project, zone, drawing, IR number, contractor, consultant), mark each item مطابق / غير مطابق / لا ينطبق with a
//  note where needed, set the verdict, export a signed-off A4 PDF. Inspections and the member's own checklists are saved on this
//  device at once (sites often have no signal) and, on the live platform, synced to the member's own private storage.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, ClipboardCheck, ClipboardList, Copy, FileDown, ListPlus, LoaderCircle, Pencil, Plus, StickyNote, Trash2, X } from "lucide-react";
import { CATEGORIES, PHOTO_LIMITS, RESULT, TEMPLATES, VERDICT, categoryOf, cleanTemplate, customKey, isUserTemplate, itemCount, newCustom, newInspection, newTemplate, photoCount, resolveTemplate, tally, templateError } from "../../data/checklists";
import type { QcPhoto } from "../../data/checklists";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { imageError, processImage, useImagePicker } from "../../lib/media";
import { UGC, tr } from "../../i18n/i18n";
import { inspectionPdf, saveOrShare } from "../../lib/report-pdf";
import { Empty, SectionTitle, TextInput } from "../../ui/chrome";
import { Chip, FilterChip, Num, Panel, Primary, Secondary } from "../../ui/primitives";

// ---- site photos on inspection items (Phase 1.3): compressed on the device, then — on the live platform — uploaded to the
// member's private «inspections» bucket through upload-media; shown through short-lived signed links, kept in this session
const previews = new Map<string, string>();   // path → the local preview of a photo taken in this session
const signed = new Map<string, Promise<string>>();
export const photoSrc = (ph: QcPhoto): Promise<string> => {
  if (ph.src) return Promise.resolve(ph.src); const p = ph.path || ""; if (previews.has(p)) return Promise.resolve(previews.get(p)!);
  if (!signed.has(p)) signed.set(p, cloud.inspectionPhotoUrl(p).catch((e) => { signed.delete(p); throw e; }));
  return signed.get(p)!;
};
function PhotoThumb({ ph, onOpen, onRemove }: any) {
  const [src, setSrc] = useState<string>(ph.src || previews.get(ph.path) || "");
  useEffect(() => { let on = true; if (!src) photoSrc(ph).then((u) => on && setSrc(u), () => {}); return () => { on = false; }; }, [ph.id]);
  return (
    <span className="relative inline-block w-16 h-16 shrink-0">
      <button type="button" onClick={() => src && onOpen(src)} aria-label="عرض الصورة" className="press block w-16 h-16 rounded-xl overflow-hidden border border-line bg-canvas/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {src ? <img src={src} alt="" draggable={false} className="w-full h-full object-cover" /> : <span className="grid place-items-center w-full h-full text-ink-3"><Camera size={16} /></span>}
      </button>
      <button type="button" onClick={onRemove} aria-label="حذف الصورة" className="press absolute -top-1.5 -end-1.5 grid place-items-center w-6 h-6 rounded-full bg-surface border border-line text-ink-2 hover:text-bad"><X size={12} /></button>
    </span>
  );
}

// the template's own words follow the interface language; what the member wrote (their checklists, project, notes) never is translated
const say = (t: any, s: string) => (isUserTemplate(t) ? s : tr(s));

export function ChecklistsScreen({ app, id, kind }: any) {
  if (kind === "qcbuilder") return <Builder app={app} id={id} />;
  if (id) return <Inspection app={app} id={id} />;
  const mine = app.qcTemplates || [];
  const list = [...(app.inspections || [])].sort((a, b) => b.at - a.at);
  return (
    <div className="py-4 space-y-4">
      <div className="px-1"><h1 className="text-[22px] font-medium">فحص واستلام الأعمال</h1><p className="text-[12px] text-ink-2">قوائم QA/QC للموقع والمكتب الفني — جاهزة أو من تصميمك، تُحفظ على جهازك فورًا وتُصدَّر تقرير PDF رسميًا للتوقيع.</p></div>
      {/* build one's own checklist: the first thing on the screen, because no template fits every site element */}
      <button type="button" data-qc-new onClick={() => app.push({ type: "qcbuilder", id: "new" })} className="press w-full flex items-center gap-3 p-4 rounded-2xl border border-accent/30 bg-wash text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-accent text-white"><ListPlus size={20} /></span>
        <span className="min-w-0"><span className="block text-[14.5px] font-medium">قائمة فحص مخصصة من الصفر</span><span className="block mt-0.5 text-[11.5px] text-ink-2 leading-snug">عنوانك وفئتك وأقسامك وبنودك — لأي عنصر في الموقع، تُحفظ لتستخدمها كل مرة.</span></span>
      </button>
      {mine.length > 0 && <section><SectionTitle>قوائمي المخصصة</SectionTitle>
        <div className="space-y-2">{mine.map((t: any) => (
          <Panel key={t.id} className="p-3.5">
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => app.push({ type: "inspection", id: "new:" + t.id })} className="press flex-1 min-w-0 text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span {...UGC} className="block text-[13.5px] font-medium leading-snug">{t.title}</span>
                <span className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-ink-2">{t.category && <Chip className="h-6 px-2 text-[10.5px]"><bdi {...UGC}>{t.category}</bdi></Chip>}<span><Num>{itemCount(t)}</Num> بندًا · <Num>{t.sections.length}</Num> قسم</span></span>
              </button>
              <button type="button" aria-label="تعديل القائمة" onClick={() => app.push({ type: "qcbuilder", id: t.id })} className="press shrink-0 grid place-items-center w-9 h-9 rounded-full text-ink-2 hover:text-ink"><Pencil size={15} /></button>
            </div>
            <Secondary onClick={() => app.push({ type: "inspection", id: "new:" + t.id })} className="mt-2.5 w-full h-10 press"><ClipboardCheck size={15} /> ابدأ فحصًا بهذه القائمة</Secondary>
          </Panel>))}</div>
      </section>}
      <section><SectionTitle>قوالب جاهزة</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">{TEMPLATES.map((t) => <button key={t.id} type="button" onClick={() => app.push({ type: "inspection", id: "new:" + t.id })} className="press p-3.5 rounded-2xl bg-surface border border-line text-start hover:border-accent/40 transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-wash text-accent"><Plus size={17} /></span>
          <span className="block mt-2 text-[13.5px] font-medium leading-snug">{t.title}</span><span className="block mt-0.5 text-[11px] text-ink-2 leading-snug">{t.scope}</span></button>)}</div>
      </section>
      <section><SectionTitle>فحوصاتي</SectionTitle>
        {list.length === 0 ? <Empty icon={ClipboardCheck} title="لا فحوصات محفوظة بعد" body="ابدأ من قائمتك أو من قالب جاهز — يُحفظ الفحص تلقائيًا أثناء الملء." /> :
          <div className="space-y-2">{list.map((x) => { const t = resolveTemplate(x, mine); const c = tally(t, x.marks, x.custom); return (
            <button key={x.id} type="button" onClick={() => app.push({ type: "inspection", id: x.id })} className="press w-full p-3.5 rounded-2xl bg-surface border border-line text-start">
              <div className="flex items-center justify-between gap-2"><span {...(isUserTemplate(t) ? UGC : {})} className="min-w-0 truncate text-[13.5px] font-medium">{t.title}</span>{x.verdict ? <Chip tone={x.verdict === "accepted" ? "verified" : x.verdict === "rejected" ? "warn" : "info"} className="h-6 px-2 text-[10.5px]">{VERDICT[x.verdict]}</Chip> : <span className="text-[11px] text-ink-3">مسودة</span>}</div>
              <p className="mt-1 text-[11.5px] text-ink-2"><bdi {...UGC}>{[x.project, x.zone, x.date].filter(Boolean).join(" · ") || "—"}</bdi> · <Num>{c.pass + c.fail + c.na}</Num>/<Num>{c.total}</Num></p>
            </button>); })}</div>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- the builder
function Builder({ app, id }: any) {
  const existing = id !== "new" ? (app.qcTemplates || []).find((t: any) => t.id === id) : null;
  const [t, setT] = useState<any>(() => existing ? { ...existing, sections: existing.sections.map(([h, items]: any) => [h, [...items]]) } : newTemplate());
  const [err, setErr] = useState<any>(null); const [confirmDel, setConfirmDel] = useState(false);
  if (id !== "new" && !existing) return <Empty icon={ClipboardList} title="القائمة غير موجودة" body="ربما حُذفت من جهاز آخر." action="رجوع" onAction={app.pop} />;
  const set = (patch: any) => { setErr(null); setT((x: any) => ({ ...x, ...patch })); };
  const secs: [string, string[]][] = t.sections;
  const setSec = (s: number, f: (sec: [string, string[]]) => [string, string[]]) => set({ sections: secs.map((x, i) => (i === s ? f(x) : x)) });
  const move = <T,>(arr: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; };
  const save = (thenStart = false) => {
    const e = templateError(t); if (e) { setErr(e); app.toast(e); return; }
    const clean = cleanTemplate(t); app.saveTemplate(clean); app.toast("حُفظت القائمة");
    if (thenStart) app.push({ type: "inspection", id: "new:" + clean.id }); else app.pop();
  };
  const isNew = !existing; const inputCls = "h-11 w-full px-3 rounded-xl bg-surface border border-line-2 text-[13.5px]";
  return (
    <div className="py-4 space-y-4" data-qc-builder>
      <div className="px-1"><h1 className="text-[21px] font-medium">{isNew ? "قائمة فحص جديدة" : "تعديل القائمة"}</h1><p className="text-[12px] text-ink-2">صمّم قائمتك: العنوان والفئة، ثم الأقسام وبنود كل قسم. عند الفحص تختار لكل بند مطابق / غير مطابق / لا ينطبق مع ملاحظة.</p></div>
      {isNew && <section><SectionTitle>ابدأ من الصفر أو من نسخة قالب جاهز</SectionTitle>
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{TEMPLATES.map((x) => <button key={x.id} type="button" onClick={() => setT(newTemplate(x))} className="press shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-line bg-surface text-[12px] text-ink-2 hover:text-ink"><Copy size={13} /> {x.title}</button>)}</div>
      </section>}
      <Panel className="p-4 space-y-3">
        <label className="block"><span className="text-[11.5px] text-ink-2">عنوان القائمة *</span><TextInput {...UGC} value={t.title} onChange={(v: string) => set({ title: v.slice(0, 120) })} placeholder="مثال: استلام عزل الأسطح المائي" aria-label="عنوان القائمة" className={`mt-1 ${inputCls} ${err && !String(t.title).trim() ? "border-bad" : ""}`} /></label>
        <div><span className="text-[11.5px] text-ink-2">الفئة</span>
          <div className="mt-1.5 flex gap-1.5 flex-wrap">{CATEGORIES.map((c) => <FilterChip key={c} on={t.category === c} onClick={() => set({ category: t.category === c ? "" : c })}>{c}</FilterChip>)}</div>
        </div>
        <label className="block"><span className="text-[11.5px] text-ink-2">نطاق القائمة (اختياري)</span><TextInput {...UGC} value={t.scope} onChange={(v: string) => set({ scope: v.slice(0, 200) })} placeholder="مثال: قبل اختبار الغمر — أسطح الأدوار المتكررة" className={`mt-1 ${inputCls}`} /></label>
      </Panel>
      {secs.map(([h, items], s) => (
        <Panel key={s} className="p-3.5" data-qc-section={s}>
          <div className="flex items-center gap-1.5">
            <TextInput {...UGC} value={h} onChange={(v: string) => setSec(s, ([, it]) => [v.slice(0, 120), it])} placeholder={`عنوان القسم ${s + 1} — مثال: المواد`} aria-label={`عنوان القسم ${s + 1}`} className="flex-1 h-10 px-3 rounded-xl bg-canvas/60 border border-line-2 text-[13px] font-medium" />
            <button type="button" aria-label="نقل القسم لأعلى" disabled={s === 0} onClick={() => set({ sections: move(secs, s, -1) })} className="press shrink-0 grid place-items-center w-8 h-8 rounded-full text-ink-3 hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" aria-label="نقل القسم لأسفل" disabled={s === secs.length - 1} onClick={() => set({ sections: move(secs, s, 1) })} className="press shrink-0 grid place-items-center w-8 h-8 rounded-full text-ink-3 hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
            <button type="button" aria-label="حذف القسم" onClick={() => set({ sections: secs.length > 1 ? secs.filter((_, i) => i !== s) : [["البنود", [""]]] })} className="press shrink-0 grid place-items-center w-8 h-8 rounded-full text-ink-3 hover:text-bad"><Trash2 size={14} /></button>
          </div>
          <div className="mt-2.5 space-y-1.5">{items.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="shrink-0 w-6 text-center text-[11px] text-ink-3"><Num>{i + 1}</Num></span>
              <TextInput {...UGC} value={it} onChange={(v: string) => setSec(s, ([hh, xs]) => [hh, xs.map((y, k) => (k === i ? v.slice(0, 300) : y))])} placeholder="اكتب البند — مثال: الميول نحو الصفايات محققة" aria-label={`البند ${i + 1}`} className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-canvas/60 border border-line-2 text-[13px]" />
              <button type="button" aria-label="نقل البند لأعلى" disabled={i === 0} onClick={() => setSec(s, ([hh, xs]) => [hh, move(xs, i, -1)])} className="press shrink-0 grid place-items-center w-7 h-8 text-ink-3 hover:text-ink disabled:opacity-30"><ArrowUp size={13} /></button>
              <button type="button" aria-label="حذف البند" onClick={() => setSec(s, ([hh, xs]) => [hh, xs.length > 1 ? xs.filter((_, k) => k !== i) : [""]])} className="press shrink-0 grid place-items-center w-7 h-8 text-ink-3 hover:text-bad"><Trash2 size={13} /></button>
            </div>))}</div>
          <button type="button" onClick={() => setSec(s, ([hh, xs]) => [hh, [...xs, ""]])} className="press mt-2 w-full h-9 rounded-xl border border-dashed border-line-3 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center justify-center gap-1.5"><Plus size={14} /> إضافة بند</button>
        </Panel>))}
      <Secondary onClick={() => set({ sections: [...secs, ["", [""]]] })} className="w-full h-11 press border-dashed"><Plus size={16} /> إضافة قسم جديد</Secondary>
      {err && <p role="alert" className="text-[12px] text-bad px-1">{err}</p>}
      <div className="flex gap-2">
        <Primary onClick={() => save(true)} className="flex-1 h-12 press"><ClipboardCheck size={16} /> حفظ وبدء الفحص</Primary>
        <Secondary onClick={() => save(false)} className="h-12 px-4 press">حفظ</Secondary>
      </div>
      {!isNew && (!confirmDel ? <button type="button" onClick={() => setConfirmDel(true)} className="press w-full h-10 text-[12.5px] text-bad/80 hover:text-bad inline-flex items-center justify-center gap-1.5"><Trash2 size={14} /> حذف هذه القائمة</button>
        : <div role="alertdialog" aria-label="تأكيد حذف القائمة"><Panel className="p-3.5 border-bad/30"><p className="text-[12.5px] text-ink-2">تُحذف القائمة من قوائمك. الفحوصات التي أجريتها بها تبقى كما هي وتقاريرها تعمل.</p>
          <div className="mt-2.5 flex gap-2"><Primary onClick={() => { app.deleteTemplate(existing.id); app.toast("حُذفت القائمة"); app.pop(); }} className="flex-1 h-10 !bg-bad !text-white"><Trash2 size={14} /> احذف القائمة</Primary><Secondary onClick={() => setConfirmDel(false)} className="h-10 px-4">إلغاء</Secondary></div></Panel></div>)}
    </div>
  );
}

// ---------------------------------------------------------------- one inspection
function Inspection({ app, id }: any) {
  const isNew = String(id).startsWith("new:"); const mine = app.qcTemplatesAll || app.qcTemplates || [];
  const [x, setX] = useState<any>(() => {
    if (!isNew) return (app.inspections || []).find((i: any) => i.id === id);
    const tid = String(id).slice(4); const t = TEMPLATES.find((y) => y.id === tid) || mine.find((y: any) => y.id === tid && !y.deleted);
    return t ? newInspection(t, app.profile && app.profile.name) : null;
  });
  const [busy, setBusy] = useState(false); const [focusId, setFocusId] = useState<any>(null); const [noteOpen, setNoteOpen] = useState<any>({}); const [shooting, setShooting] = useState<string | null>(null);
  // the photo picker (camera / gallery chooser in the phone apps) — hooks before the early return below; the item it serves is
  // read when the photo arrives, which may be minutes later (the camera app)
  const [shootKey, setShootKey] = useState<string | null>(null); const onShot = useRef<any>(null);
  // the latest inspection, for a photo that finishes after other edits (never save from inside a state updater: that would
  // update AppView while this screen renders)
  const latest = useRef<any>(x); latest.current = x;
  const [photoInput, pickPhoto] = useImagePicker((f: Blob) => { if (onShot.current) onShot.current(f); }, { title: "صورة للبند" });
  if (!x) return <Empty icon={ClipboardCheck} title="القائمة غير موجودة" body="ربما حُذفت من جهاز آخر." action="رجوع" onAction={app.pop} />;
  const t = resolveTemplate(x, mine); const user = isUserTemplate(t); const custom = x.custom || []; const c = tally(t, x.marks, custom);
  // every change is saved at once (a dropped signal or a closed app never loses a half-filled inspection)
  const up = (patch?: any) => { const n = { ...x, ...patch, at: Date.now() }; setX(n); app.saveInspection(n); };
  const mark = (k?: any, m?: any) => up({ marks: { ...x.marks, [k]: x.marks[k] === m ? "" : m } });
  const photos = (k: string): QcPhoto[] => (x.photos && x.photos[k]) || [];
  const addPhoto = async (k: string, file: Blob) => {
    if (photos(k).length >= PHOTO_LIMITS.perItem) { app.toast(`حتى ${PHOTO_LIMITS.perItem} صور لكل بند`); return; }
    if (photoCount(x) >= PHOTO_LIMITS.perInspection) { app.toast(`حتى ${PHOTO_LIMITS.perInspection} صورة في الفحص الواحد`); return; }
    setShooting(k);
    try {
      const im = await processImage(file); const id = "ph-" + Date.now().toString(36);
      let ph: QcPhoto;
      if (isCloud()) { const u = await cloud.uploadMedia("inspection", im.blob); previews.set(u.path, im.src); ph = { id, path: u.path, w: u.w, h: u.h }; }
      else ph = { id, src: im.src, w: im.w, h: im.h };
      const cur = latest.current; const n = { ...cur, photos: { ...(cur.photos || {}), [k]: [...((cur.photos || {})[k] || []), ph] }, at: Date.now() };
      latest.current = n; setX(n); app.saveInspection(n);
    } catch (e: any) { app.toast(e && e.message && !["big", "small", "decode", "none"].includes(e.message) ? e.message : imageError(e)); }
    setShooting(null);
  };
  const removePhoto = (k: string, ph: QcPhoto) => {
    up({ photos: { ...(x.photos || {}), [k]: photos(k).filter((p) => p.id !== ph.id) } });
    if (ph.path) { previews.delete(ph.path); cloud.removeMedia([ph.path]); }
  };
  onShot.current = (f: Blob) => { if (shootKey) addPhoto(shootKey, f); };
  const exportPdf = async () => {
    setBusy(true);
    try {
      const rows: any[] = []; const shots: { k: string; n: number; text: string; mark: string }[] = []; let n = 0;
      const row = (k: string, text: string) => { n++; rows.push({ text, mark: x.marks[k] || "", note: x.notes[k] || "" }); if (photos(k).length) shots.push({ k, n, text, mark: x.marks[k] || "" }); };
      t.sections.forEach(([title, items], s) => { rows.push({ section: say(t, title) }); items.forEach((text, i) => row(`${s}.${i}`, say(t, text))); });
      // the engineer's own extra items go in as typed (never translated), with the same marks and notes
      const filled = custom.filter((it: any) => it.text.trim()); if (filled.length) { rows.push({ section: tr("بنود إضافية") }); filled.forEach((it: any) => row(customKey(it), it.text)); }
      // the photos, loaded as pixels (a blob URL keeps the canvas exportable)
      const pics: any[] = [];
      for (const s of shots) for (const ph of photos(s.k)) {
        try { const b = await (await fetch(await photoSrc(ph))).blob(); const image = await createImageBitmap(b); pics.push({ n: s.n, caption: s.text, mark: s.mark, image, w: image.width, h: image.height }); }
        catch (e) { /* a photo that cannot be loaded now is left out of this export */ }
      }
      const head: [string, string][] = [["المشروع", x.project], ["المنطقة / الدور", x.zone], ["مرجع اللوحة", x.ref], ["رقم طلب الاستلام", x.irNo], ["المقاول", x.contractor], ["الاستشاري / الإشراف", x.consultant], ["المهندس المستلم", x.inspector], ["تاريخ الفحص", x.date]];
      const bytes = await inspectionPdf({
        title: say(t, t.title), scope: say(t, t.scope || ""), category: say(t, categoryOf(t) || ""), docNo: x.irNo || `QC-${String(x.id).replace(/^qc-/, "").toUpperCase()}`,
        head: head.map(([k, v]) => [tr(k), v || ""]), rows, general: x.general || "",
        verdict: x.verdict || "", verdictLabel: VERDICT[x.verdict] ? tr(VERDICT[x.verdict]) : "", counts: { pass: c.pass, fail: c.fail, na: c.na, open: c.open, total: c.total },
        names: { contractor: x.contractor || "", consultant: x.consultant || "", inspector: x.inspector || "" }, photos: pics,
      });
      pics.forEach((p) => p.image.close && p.image.close());
      await saveOrShare(bytes, `QC-${(x.irNo || t.id).replace(/[^\w.-]+/g, "_")}-${x.date}.pdf`, t.title);
    } catch (e) { app.toast("تعذّر إنشاء التقرير — أعد المحاولة"); }
    setBusy(false);
  };
  // one checklist row: the template's items, the member's own checklist items and extra items look and behave the same
  const item = (k: string, text: any, remove?: () => void) => { const m = x.marks[k] || ""; const showNote = m === "fail" || !!x.notes[k] || !!noteOpen[k]; return (
    <Panel key={k} className={`p-3.5 ${m === "fail" ? "border-bad/40" : ""}`}>
      <div className="flex items-start gap-2"><div className="flex-1 min-w-0 text-[13px] leading-relaxed">{text}</div>{remove && <button type="button" aria-label="حذف البند" onClick={remove} className="press shrink-0 grid place-items-center w-8 h-8 -mt-1 rounded-full text-ink-3 hover:text-bad"><Trash2 size={14} /></button>}</div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">{(["pass", "fail", "na"] as const).map((r) => <FilterChip key={r} on={m === r} onClick={() => mark(k, r)}>{RESULT[r]}</FilterChip>)}
        <span className="ms-auto inline-flex items-center">
          <button type="button" data-qc-photo onClick={() => { setShootKey(k); pickPhoto(); }} disabled={shooting === k} className="press inline-flex items-center gap-1 h-8 px-2 text-[11.5px] text-ink-3 hover:text-ink">{shooting === k ? <LoaderCircle size={13} /> : <Camera size={13} />} صورة</button>
          {!showNote && <button type="button" onClick={() => setNoteOpen((o: any) => ({ ...o, [k]: true }))} className="press inline-flex items-center gap-1 h-8 px-2 text-[11.5px] text-ink-3 hover:text-ink"><StickyNote size={13} /> ملاحظة</button>}
        </span></div>
      {photos(k).length > 0 && <div className="mt-2 flex gap-2 flex-wrap" data-qc-photos>{photos(k).map((ph) => <PhotoThumb key={ph.id} ph={ph} onOpen={(src: string) => app.viewImage({ src, w: ph.w, h: ph.h, alt: "" })} onRemove={() => removePhoto(k, ph)} />)}</div>}
      {showNote && <TextInput {...UGC} value={x.notes[k] || ""} autoFocus={!!noteOpen[k] && !x.notes[k]} onChange={(v: string) => up({ notes: { ...x.notes, [k]: v.slice(0, 400) } })} placeholder={m === "fail" ? "ما المطلوب تصحيحه؟" : "ملاحظة"} className="mt-2 h-10 w-full px-3 rounded-xl bg-canvas/60 border border-line-2 text-[12.5px]" />}
    </Panel>); };
  const field = (k?: any, label?: any, ph?: any, wide = false) => <label className={`block ${wide ? "col-span-2" : ""}`}><span className="text-[11.5px] text-ink-2">{label}</span><TextInput {...UGC} value={x[k] || ""} onChange={(v: string) => up({ [k]: v.slice(0, 120) })} placeholder={ph} className="mt-1 h-11 w-full px-3 rounded-xl bg-surface border border-line-2 text-[13.5px]" /></label>;
  const txt = (s: string) => (user ? <bdi {...UGC}>{s}</bdi> : s);
  return (
    <div className="py-4 space-y-4" data-qc-inspection>{photoInput}
      <div className="px-1"><h1 className="text-[21px] font-medium">{txt(t.title)}</h1><p className="text-[12px] text-ink-2">{[categoryOf(t), t.scope].filter(Boolean).map((s, i) => <span key={i}>{i ? " · " : ""}{txt(s)}</span>)}</p></div>
      <Panel className="p-4 grid grid-cols-2 gap-3">{field("project", "المشروع", "اسم المشروع", true)}{field("zone", "المنطقة / الدور", "مثال: الدور الثالث — محور B")}{field("ref", "مرجع اللوحة", "S-103 Rev.2")}{field("irNo", "رقم طلب الاستلام", "IR-0142")}{field("date", "التاريخ", "")}{field("contractor", "المقاول", "اسم شركة المقاولات")}{field("consultant", "الاستشاري / الإشراف", "اسم الاستشاري")}{field("inspector", "المهندس المستلم", "", true)}</Panel>
      {t.sections.map(([title, items], s) => <section key={s}><SectionTitle>{txt(title)}</SectionTitle><div className="space-y-2">{items.map((text, i) => item(`${s}.${i}`, txt(text)))}</div></section>)}
      {/* items added to this inspection only: the button adds an editable row at once (same marks and notes; saved and printed as typed) */}
      <section><SectionTitle>بنود إضافية لهذا الفحص</SectionTitle>
        {custom.length > 0 && <div className="space-y-2 mb-2">{custom.map((it: any) => item(customKey(it), <TextInput {...UGC} value={it.text} autoFocus={focusId === it.id} onChange={(v: string) => up({ custom: custom.map((y: any) => (y.id === it.id ? { ...y, text: v.slice(0, 300) } : y)) })} placeholder="اكتب البند — مثال: نظافة فتحات الصرف" className="w-full h-10 px-3 rounded-xl bg-canvas/60 border border-line-2 text-[13px]" />, () => up({ custom: custom.filter((y: any) => y.id !== it.id), marks: { ...x.marks, [customKey(it)]: undefined }, notes: { ...x.notes, [customKey(it)]: undefined } })))}</div>}
        <Secondary onClick={() => { const n = newCustom(""); setFocusId(n.id); up({ custom: [...custom, n] }); }} className="w-full h-11 press border-dashed"><Plus size={16} /> إضافة بند</Secondary>
      </section>
      <Panel className="p-4">
        <label className="block"><span className="text-[12px] text-ink-2">ملاحظات عامة والإجراءات التصحيحية</span>
          <textarea {...UGC} value={x.general || ""} onChange={(e) => up({ general: e.target.value.slice(0, 1500) })} rows={3} placeholder="مثال: يعاد الاستلام بعد تصحيح الغطاء الخرساني في المحور C" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-canvas/60 border border-line-2 text-[13px] leading-relaxed" /></label>
      </Panel>
      <Panel className="p-4">
        <p className="text-[12.5px] text-ink-2"><Num className="text-ink">{c.pass}</Num> مطابق · <Num className="text-bad">{c.fail}</Num> غير مطابق · <Num>{c.na}</Num> لا ينطبق · <Num>{c.open}</Num> لم يُفحص</p>
        <div className="mt-3 flex gap-1.5 flex-wrap">{Object.entries(VERDICT).map(([k, l]) => <FilterChip key={k} on={x.verdict === k} onClick={() => up({ verdict: x.verdict === k ? "" : k })}>{l}{c.suggested === k && x.verdict !== k ? " ← مقترح" : ""}</FilterChip>)}</div>
      </Panel>
      <div className="flex gap-2"><Primary data-qc-export onClick={exportPdf} disabled={busy} className="flex-1 h-12 press"><FileDown size={16} /> {busy ? "جارٍ إنشاء التقرير…" : "تصدير تقرير PDF"}</Primary>
        <Secondary onClick={() => { app.deleteInspection(x.id); app.pop(); }} aria-label="حذف الفحص" className="h-12 px-4 text-bad"><Trash2 size={16} /></Secondary></div>
    </div>
  );
}
