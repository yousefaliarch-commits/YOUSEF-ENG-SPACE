// =====================================================================
//  The screens every document tool shares
//  · ToolScreen  (#app/tool/<id>):        the tool's home — the active project, «جديد», its saved documents.
//  · ToolDocScreen (#app/tooldoc/<kind>:<docId|new>): one document — the tool's editor, issue / new revision, preview,
//    PDF and a WhatsApp-ready summary. A new document gets its id on the first edit (replaceTop, no animation), so a
//    reload reopens the same document.
//  · ProjectEditor: the project profile typed once and reused by every title block (no money fields by design).
//  Saves are debounced (400 ms) and flushed when the screen closes; the store syncs on its own.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Eye, FilePlus2, FolderOpen, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toolById } from "../../tools/registry";
import { toolAllowed, toolRole } from "../../tools/gate";
import { newDocId, wbsPath, type DocWbs, type ToolDoc, type ToolHeader } from "../../data/tool-docs";
import { searchDocs, zonesOf } from "../../tools/doc-search";
import { PROJECT_CODE, blankProject, type ToolProject } from "../../data/tool-projects";
import { contentHash } from "../../doc/hash";
import { docLayout } from "../../doc/layout";
import { drawPage } from "../../doc/draw";
import { canvasMeasurer, loadDocFonts, renderDoc } from "../../doc/render";
import type { DrawPage } from "../../doc/model";
import { saveOrShare } from "../../lib/report-pdf";
import { ToolTipCard } from "../ai/ToolTip";
import { Card, ConfirmDialog, DocPreview, ExportBar, Grid2, Pick, RowCards, TextField } from "../../ui/kit";
import { Empty } from "../../ui/chrome";
import { Num } from "../../ui/primitives";
import { TOOL_ICONS } from "./icons";
import { TOOL_MODULES, type ToolModule } from "./module";
import { nextDocNo, projectFor, snapOf } from "./spec";

const today = () => new Date().toISOString().slice(0, 10);

function useModule(kind: string) {
  const [mod, setMod] = useState<ToolModule | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    const load = TOOL_MODULES[kind];
    if (!load) {
      setErr("missing");
      return;
    }
    load().then((m) => live && setMod(m)).catch((e) => live && setErr(String(e?.message || e)));
    return () => {
      live = false;
    };
  }, [kind]);
  return { mod, err };
}

const STATUS: Record<string, string> = { draft: "مسودة", issued: "صادر", superseded: "مُستبدَل", void: "ملغى" };

// ---------------------------------------------------------------------
//  The tool's home
// ---------------------------------------------------------------------
export function ToolScreen({ app, id }: { app: any; id: string }) {
  const t = toolById(id);
  const [editing, setEditing] = useState<ToolProject | null>(null);
  const [del, setDel] = useState<ToolHeader | null>(null);
  const [q, setQ] = useState("");
  const [zone, setZone] = useState<string | null>(null);
  if (!t || !toolAllowed(toolRole(app.profile), t.id)) return <div className="pt-4"><Empty title="غير متاح" body="هذه الأداة غير متاحة لنوع حسابك." action="رجوع" onAction={app.pop} /></div>;
  const Icon = TOOL_ICONS[t.icon] || FolderOpen;
  const projects: ToolProject[] = (app.toolProjects || []).filter((p: ToolProject) => !p.deleted && !p.archived);
  const active = projects.find((p) => p.id === app.activeProject) || null;
  const all: ToolHeader[] = searchDocs(app.toolIndex || [], "", { kinds: t.docKinds || [], projectId: active?.id || null });
  const zones = zonesOf(all);
  const docs: ToolHeader[] = searchDocs(all, q, { zone: zone && zones.includes(zone) ? zone : null });
  if (editing) return <ProjectEditor app={app} project={editing} onDone={() => setEditing(null)} />;
  return (
    <div className="py-4 space-y-4" data-tool={t.id}>
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-accent text-on-accent"><Icon size={22} /></span>
        <div className="min-w-0">
          <h1 className="text-[19px] font-medium leading-snug">{t.name}</h1>
          <p className="text-[12.5px] text-ink-2 leading-snug">{t.desc}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-ink-2">المشروع</span>
          <button type="button" onClick={() => setEditing(active || blankProject(newDocId()))} className="press inline-flex items-center gap-1 min-h-9 text-[12.5px] text-accent">
            {active ? <><Pencil size={14} /> بيانات المشروع</> : <><Plus size={14} /> مشروع جديد</>}
          </button>
        </div>
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => app.setActiveProject(null)} aria-pressed={!active} className={`shrink-0 h-9 px-3.5 rounded-full border text-[12.5px] ${!active ? "bg-wash border-accent/40" : "bg-surface border-line-2 text-ink-2"}`}>كل المستندات</button>
          {projects.map((p) => (
            <button key={p.id} type="button" onClick={() => app.setActiveProject(p.id)} aria-pressed={active?.id === p.id} className={`shrink-0 h-9 px-3.5 rounded-full border text-[12.5px] ${active?.id === p.id ? "bg-wash border-accent/40" : "bg-surface border-line-2 text-ink-2"}`}>
              <bdi dir="ltr" className="font-grotesk me-1">{p.code}</bdi>{p.name}
            </button>
          ))}
          {active && <button type="button" onClick={() => setEditing(blankProject(newDocId()))} className="shrink-0 h-9 px-3 rounded-full border border-dashed border-line-3 text-[12.5px] text-accent"><Plus size={14} className="inline" /></button>}
        </div>
      </div>

      <button type="button" data-tool-new onClick={() => app.push({ type: "tooldoc", id: `${(t.docKinds || [t.id])[0]}:new` })} className="press w-full min-h-14 inline-flex items-center justify-center gap-2 rounded-2xl btn-primary text-[15px] font-medium">
        <FilePlus2 size={19} /> مستند جديد
      </button>

      <section>
        <h2 className="text-[13px] text-ink-2 mb-2">المستندات المحفوظة {all.length > 0 && <Num>({docs.length === all.length ? all.length : `${docs.length} / ${all.length}`})</Num>}</h2>
        {all.length > 3 && (
          <label className="mb-2 flex items-center gap-2 h-11 px-3.5 rounded-xl bg-surface border border-line-2 focus-within:ring-2 focus-within:ring-accent">
            <Search size={16} className="text-ink-3 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} data-doc-search placeholder="ابحث: عنوان، رقم، مبنى، دور، عنصر…" className="w-full min-w-0 bg-transparent text-[14px] focus:outline-none" />
          </label>
        )}
        {zones.length > 0 && (
          <div className="-mx-4 px-4 mb-2 flex gap-2 overflow-x-auto no-scrollbar">
            <button type="button" onClick={() => setZone(null)} aria-pressed={!zone} className={`shrink-0 h-9 px-3.5 rounded-full border text-[12.5px] ${!zone ? "bg-wash border-accent/40" : "bg-surface border-line-2 text-ink-2"}`}>كل المواقع</button>
            {zones.map((z) => (
              <button key={z} type="button" data-zone={z} onClick={() => setZone(zone === z ? null : z)} aria-pressed={zone === z} className={`shrink-0 h-9 px-3.5 rounded-full border text-[12.5px] ${zone === z ? "bg-wash border-accent/40" : "bg-surface border-line-2 text-ink-2"}`}>
                <MapPin size={13} className="inline me-1" />{z}
              </button>
            ))}
          </div>
        )}
        {!!all.length && !docs.length && <p className="p-4 rounded-2xl border border-dashed border-line-2 text-[12.5px] text-ink-3 text-center">لا مستند يطابق البحث.</p>}
        {!all.length && <p className="p-4 rounded-2xl border border-dashed border-line-2 text-[12.5px] text-ink-3 text-center leading-relaxed">لا مستندات بعد. كل ما تكتبه يُحفظ على هذا الجهاز أولًا، ثم في حسابك.</p>}
        <ul className="desk-grid space-y-2" data-doc-list>
          {docs.map((h) => (
            <li key={h.id} className="flex items-center rounded-2xl bg-surface border border-line">
              <button type="button" onClick={() => app.push({ type: "tooldoc", id: `${h.kind}:${h.id}` })} className="press min-w-0 flex-1 min-h-14 px-3.5 py-2 text-start">
                <span className="block text-[14px] leading-snug truncate" dir="auto">{h.title || "بلا عنوان"}</span>
                {wbsPath(h.wbs) && <span className="block text-[11.5px] text-ink-2 truncate" dir="auto" data-doc-wbs><MapPin size={11} className="inline me-1" />{wbsPath(h.wbs)}</span>}
                <span className="block mt-0.5 text-[11.5px] text-ink-3">
                  {h.docNo ? <bdi dir="ltr" className="font-grotesk">{h.docNo} · Rev {h.rev}</bdi> : STATUS[h.status]} · <bdi dir="ltr" className="font-grotesk">{h.dateIso}</bdi>
                </span>
              </button>
              <button type="button" aria-label="حذف المستند" onClick={() => setDel(h)} className="press grid place-items-center w-11 h-11 me-1 text-ink-3 hover:text-bad"><Trash2 size={16} /></button>
              <ChevronLeft size={16} className="me-2 text-ink-4 rtl:rotate-0 ltr:rotate-180" />
            </li>
          ))}
        </ul>
      </section>
      {del && (
        <ConfirmDialog
          title="حذف المستند"
          body="يُحذف المستند من هذا الجهاز ومن حسابك على كل الأجهزة. لا يمكن التراجع."
          yes="احذف"
          onNo={() => setDel(null)}
          onYes={async () => {
            const d = del;
            setDel(null);
            const s = await app.toolStore();
            const r = await s.remove(d.id);
            app.toast(r.status === "ok" ? "حُذف المستند" : "تعذّر الحذف — حاول مرة أخرى");
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  The live A4 preview (W5): a document in a wide desktop pane draws its own PDF pages beside the editor, a moment after the
//  last edit (the same layout and drawing as «معاينة» and the exported file). Only on a desktop — a phone never pays for it.
// ---------------------------------------------------------------------
function usePaneWide(ref: { current: HTMLElement | null }, min: number, ready: boolean) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const pane = ref.current && (ref.current.closest(".desk-col") as HTMLElement | null);
    if (!pane || typeof ResizeObserver === "undefined") {
      setWide(false);
      return;
    }
    const ro = new ResizeObserver(() => setWide(pane.clientWidth >= min));
    ro.observe(pane);
    setWide(pane.clientWidth >= min);
    return () => ro.disconnect();
  }, [ready, min]);
  return wide;
}

const LIVE_PAGES = 8;

function LivePreview({ make, dep, project }: { make: () => any; dep: unknown; project: unknown }) {
  const [pages, setPages] = useState<DrawPage[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      try {
        await loadDocFonts();
        if (!live) return;
        setPages(docLayout(make(), canvasMeasurer).pages);
        setFailed(false);
      } catch {
        if (live) setFailed(true);
      }
    }, 600);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [dep, project]);
  return (
    <div data-live-preview className="sticky top-4 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-4 space-y-3">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-2">
        <Eye size={14} /> معاينة حية {pages && <span>· <Num>{pages.length}</Num> صفحة</span>}
      </p>
      {failed && <p className="text-[12px] text-warn">تعذّرت المعاينة — تُحدَّث مع التعديل التالي.</p>}
      {!pages && !failed && <div className="skeleton aspect-[210/297] w-full rounded-sm" />}
      {pages && pages.slice(0, LIVE_PAGES).map((p, i) => <PageCanvas key={i} page={p} />)}
      {pages && pages.length > LIVE_PAGES && <p className="text-[12px] text-ink-3 text-center">والصفحات الباقية في ملف PDF</p>}
    </div>
  );
}

function PageCanvas({ page }: { page: DrawPage }) {
  const box = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current, b = box.current;
    if (!c || !b) return;
    const land = page.orientation === "landscape";
    const wMm = land ? 297 : 210, hMm = land ? 210 : 297;
    const cssW = b.clientWidth || 480;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = (cssW * dpr) / wMm;
    c.width = Math.round(wMm * s);
    c.height = Math.round(hMm * s);
    c.style.width = `${cssW}px`;
    c.style.height = `${(cssW * hMm) / wMm}px`;
    const ctx = c.getContext("2d");
    if (ctx) drawPage(ctx, page, s);
    return () => {
      c.width = c.height = 0;
    };
  }, [page]);
  return (
    <div ref={box} className="w-full">
      <canvas ref={ref} data-live-page className="block bg-white rounded-sm border border-line shadow-card" />
    </div>
  );
}

// ---------------------------------------------------------------------
//  Where a document belongs (W3): zone / building · level · element. The project's breakdown and the names already used in
//  its documents are suggested; anything can be typed (a site rarely matches the drawings' breakdown exactly).
// ---------------------------------------------------------------------
const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

function WbsCard({ app, doc, project, readOnly, onChange }: { app: any; doc: ToolDoc; project: ToolProject | null; readOnly: boolean; onChange: (w: DocWbs) => void }) {
  const w = doc.wbs || {};
  const siblings: ToolHeader[] = (app.toolIndex || []).filter((h: ToolHeader) => h.projectId === doc.projectId && h.id !== doc.id);
  const pz = project?.wbs?.zones || [];
  const zones = uniq([...pz.map((z) => z.name), ...zonesOf(siblings)]);
  const levels = uniq([...(pz.find((z) => z.name === w.zone)?.levels || []), ...siblings.filter((h) => h.wbs?.zone === w.zone).map((h) => h.wbs?.level || "")]);
  const elements = uniq(siblings.filter((h) => h.wbs?.zone === w.zone && h.wbs?.level === w.level).map((h) => h.wbs?.element || ""));
  const set = (patch: DocWbs) => !readOnly && onChange({ ...w, ...patch });
  const id = `wbs-${doc.id}`;
  return (
    <Card title="الموقع في المشروع (WBS)">
      <Grid2>
        <TextField label="المنطقة / المبنى" list={`${id}-z`} value={w.zone || ""} onChange={(v) => set({ zone: v })} readOnly={readOnly} placeholder="برج A" data-wbs="zone" />
        <TextField label="الدور / المنسوب" list={`${id}-l`} value={w.level || ""} onChange={(v) => set({ level: v })} readOnly={readOnly} placeholder="الدور 02" data-wbs="level" />
      </Grid2>
      <div className="mt-2.5">
        <TextField label="العنصر" list={`${id}-e`} value={w.element || ""} onChange={(v) => set({ element: v })} readOnly={readOnly} placeholder="بلاطة S-04، عمود C12، شقة 3…" data-wbs="element" />
      </div>
      <datalist id={`${id}-z`}>{zones.map((z) => <option key={z} value={z} />)}</datalist>
      <datalist id={`${id}-l`}>{levels.map((z) => <option key={z} value={z} />)}</datalist>
      <datalist id={`${id}-e`}>{elements.map((z) => <option key={z} value={z} />)}</datalist>
    </Card>
  );
}

// the project's breakdown, typed once: each zone / building with its levels («B1، الأرضي، 01، 02، السطح»)
function WbsEditor({ value, onChange }: { value: { name: string; levels: string[] }[]; onChange: (v: { name: string; levels: string[] }[]) => void }) {
  const split = (s: string) => s.split(/[,،;\n]+/).map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, 80);
  return (
    <RowCards<{ name: string; levels: string[] }>
      rows={value} onChange={onChange} max={60} addLabel="منطقة / مبنى"
      blank={() => ({ name: "", levels: [] })}
      summary={(z) => `${z.name || "منطقة"}${z.levels.length ? ` — ${z.levels.length} دور` : ""}`}
      render={(z, setZ) => (
        <>
          <TextField label="اسم المنطقة / المبنى" value={z.name} onChange={(v) => setZ({ ...z, name: v })} placeholder="برج A، المبنى الإداري، المرحلة 2" />
          <TextField label="الأدوار (افصل بفاصلة)" value={z.levels.join("، ")} onChange={(v) => setZ({ ...z, levels: split(v) })} placeholder="B1، الأرضي، 01، 02، السطح" />
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
//  One document
// ---------------------------------------------------------------------
export function ToolDocScreen({ app, id }: { app: any; id: string }) {
  const [kind, docId] = String(id || "").split(":");
  const { mod, err } = useModule(kind);
  const [doc, setDoc] = useState<ToolDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pages, setPages] = useState<DrawPage[] | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const saved = useRef<ToolDoc | null>(null);
  const timer = useRef<any>(null);
  const role = toolRole(app.profile);
  const t = toolById(kind);
  // a desktop pane wide enough (focus mode) shows the PDF beside the editor
  const rootEl = useRef<HTMLDivElement | null>(null);
  const wide = usePaneWide(rootEl, 1100, !!mod && !!doc);

  useEffect(() => {
    if (!mod) return;
    let live = true;
    (async () => {
      if (docId === "new") {
        const body = mod.blank();
        const d: ToolDoc = {
          id: newDocId(), kind, v: mod.v, at: 0, createdAt: Date.now(), projectId: app.activeProject || null, title: mod.defaultTitle(body),
          dateIso: today(), docNo: null, rev: "00", status: "draft", profile: mod.profile, body, photos: {}, log: [],
        };
        if (live) setDoc(d);
        return;
      }
      const s = await app.toolStore();
      const d = s.get(docId);
      if (!live) return;
      if (d) {
        setDoc(d);
        saved.current = d;
      } else setMissing(true);
    })();
    return () => {
      live = false;
    };
  }, [mod, docId]);

  const flush = async (d: ToolDoc | null) => {
    clearTimeout(timer.current);
    if (!d || d === saved.current) return;
    const s = await app.toolStore();
    const r = await s.save(d);
    if (r.status === "failed") {
      app.toast("تعذّر الحفظ على الجهاز — المساحة ممتلئة؟");
      return;
    }
    if (r.status === "tooBig") app.toast("المستند كبير: محفوظ على هذا الجهاز فقط");
    saved.current = r.doc;
    // nothing typed since: hold the stored copy, so a later edit from another device can be recognised as newer
    if (latest.current === d) setDoc(r.doc);
    if (docId === "new") app.replaceTop({ type: "tooldoc", id: `${kind}:${r.doc.id}` });
  };
  const latest = useRef<ToolDoc | null>(null);
  latest.current = doc;
  useEffect(() => () => void flush(latest.current), []);

  // live sync (W5): the same document saved on another device (the phone, engspace.org on a desktop) appears here at once —
  // but only while this screen holds no unsaved edit of its own; deleted elsewhere → «المستند غير موجود»
  const loaded = !!doc;
  useEffect(() => {
    if (!loaded || docId === "new") return;
    let off = () => {};
    let live = true;
    app.toolStore().then((s: any) => {
      if (!live) return;
      off = s.subscribe(() => {
        const base = saved.current;
        if (!base) return;
        const remote: ToolDoc | null = s.get(base.id);
        if (!remote) {
          setMissing(true);
          return;
        }
        if (latest.current === base && remote.at > base.at) {
          saved.current = remote;
          setDoc(remote);
          app.toast("وصل تعديل من جهاز آخر");
        }
      });
    });
    return () => {
      live = false;
      off();
    };
  }, [loaded, docId]);

  const update = (next: ToolDoc) => {
    setDoc(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(next), 400);
  };

  if (err) return <div className="pt-4"><Empty title="تعذّر فتح الأداة" body="تحقق من الاتصال ثم حاول مرة أخرى." action="رجوع" onAction={app.pop} /></div>;
  if (!t || !toolAllowed(role, kind)) return <div className="pt-4"><Empty title="غير متاح" body="هذه الأداة غير متاحة لنوع حسابك." action="رجوع" onAction={app.pop} /></div>;
  if (missing) return <div className="pt-4"><Empty title="المستند غير موجود" body="ربما حُذف من جهاز آخر." action="رجوع" onAction={app.pop} /></div>;
  if (!mod || !doc) return <div className="py-16 text-center text-[13px] text-ink-3">جارٍ التحميل…</div>;

  const projects: ToolProject[] = app.toolProjects || [];
  const project = projects.find((p) => p.id === doc.projectId && !p.deleted) || null;
  const readOnly = doc.status !== "draft" || doc.v > mod.v;
  const setBody = (body: any) => !readOnly && update({ ...doc, body });
  const spec = () => mod.build(doc, projectFor(doc, projects));

  const preview = async () => {
    setBusy("جارٍ التحضير…");
    try {
      await loadDocFonts();
      setPages(docLayout(spec(), canvasMeasurer).pages);
    } catch {
      app.toast("تعذّرت المعاينة");
    } finally {
      setBusy(null);
    }
  };
  const pdf = async () => {
    setBusy("جارٍ إنشاء التقرير…");
    try {
      const r = await renderDoc(spec(), { onPage: (n, of) => setBusy(`صفحة ${n} من ${of}…`) });
      if (r.status !== "ok") {
        app.toast(r.status === "cancelled" ? "أُلغي التصدير" : "تعذّر إنشاء التقرير");
        return;
      }
      const bytes = new Uint8Array(await r.pdf.arrayBuffer());
      const name = `${(doc.docNo || `${mod.docType}-draft`).replace(/[^\w.-]+/g, "_")}-Rev${doc.rev}.pdf`;
      await saveOrShare(bytes, name, doc.title);
    } catch {
      app.toast("تعذّر حفظ التقرير أو مشاركته");
    } finally {
      setBusy(null);
    }
  };
  // the same document as an editable Word file; the writer is loaded only when asked, so the tool chunks stay small
  const docx = async () => {
    setBusy("جارٍ إنشاء ملف Word…");
    try {
      const { specDocx, DOCX_MIME } = await import("../../doc/docx");
      const bytes = specDocx(spec());
      const name = `${(doc.docNo || `${mod.docType}-draft`).replace(/[^\w.-]+/g, "_")}-Rev${doc.rev}.docx`;
      await saveOrShare(bytes, name, doc.title, DOCX_MIME);
    } catch {
      app.toast("تعذّر إنشاء ملف Word");
    } finally {
      setBusy(null);
    }
  };
  // a new document of this kind in the same project, saved and opened (the next payment certificate from this one…)
  const spawn = async (body: any, title: string) => {
    const s = await app.toolStore();
    const d: ToolDoc = {
      id: newDocId(), kind, v: mod.v, at: 0, createdAt: Date.now(), projectId: doc.projectId, title,
      dateIso: today(), docNo: null, rev: "00", status: "draft", profile: mod.profile, body, photos: {}, log: [],
    };
    const r = await s.save(d);
    if (r.status === "failed") {
      app.toast("تعذّر الحفظ على الجهاز — المساحة ممتلئة؟");
      return;
    }
    app.push({ type: "tooldoc", id: `${kind}:${r.doc.id}` });
  };
  const xlsx = async () => {
    setBusy("جارٍ إنشاء ملف Excel…");
    try {
      const { specXlsx, workbookXlsx, XLSX_MIME } = await import("../../doc/xlsx");
      const bytes = mod.workbook ? workbookXlsx(mod.workbook(doc, projectFor(doc, projects))) : specXlsx(spec());
      const name = `${(doc.docNo || `${mod.docType}-draft`).replace(/[^\w.-]+/g, "_")}-Rev${doc.rev}.xlsx`;
      await saveOrShare(bytes, name, doc.title, XLSX_MIME);
    } catch {
      app.toast("تعذّر إنشاء ملف Excel");
    } finally {
      setBusy(null);
    }
  };
  const share = async () => {
    const text = mod.summary(doc);
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: doc.title, text });
      else {
        await navigator.clipboard.writeText(text);
        app.toast("نُسخ الملخص");
      }
    } catch (e: any) {
      if (!/abort|cancel/i.test(String(e?.name || e?.message || e))) {
        try {
          await navigator.clipboard.writeText(text);
          app.toast("نُسخ الملخص");
        } catch {
          app.toast("تعذّرت المشاركة");
        }
      }
    }
  };
  const issue = async () => {
    setConfirmIssue(false);
    const { docNo, n } = doc.docNo ? { docNo: doc.docNo, n: 0 } : nextDocNo(project, mod.docType);
    const snap = project ? snapOf(project) : undefined;
    const frozen = { ...doc, docNo, status: "issued" as const, issuedAt: Date.now(), project: snap };
    const hash = await contentHash({ kind: frozen.kind, v: frozen.v, body: frozen.body, profile: frozen.profile, project: snap || null, docNo, rev: frozen.rev, engine: mod.engine });
    const next = { ...frozen, hash, log: [...doc.log, { at: Date.now(), what: "issue", note: `${docNo} Rev ${doc.rev}` }].slice(-50) };
    if (project && n) app.saveToolProject({ ...project, at: Date.now(), numbering: { ...project.numbering, counters: { ...project.numbering.counters, [mod.docType]: n } } });
    setDoc(next);
    await flush(next);
    app.toast(`صدر المستند ${docNo}`);
  };
  const revise = () => {
    const r = String(Number(doc.rev || "0") + 1).padStart(2, "0");
    update({ ...doc, rev: r, status: "draft", issuedAt: undefined, hash: undefined, project: undefined, log: [...doc.log, { at: Date.now(), what: "revise", note: `Rev ${r}` }].slice(-50) });
  };

  const Editor = mod.Editor;
  return (
    <div ref={rootEl} className="pt-3 flex flex-col min-h-full" data-tool={kind}>
      <div className="doc-split">
      <div className="space-y-3 pb-4 min-w-0">
        <TextField label="عنوان المستند" value={doc.title} onChange={(v) => !readOnly && update({ ...doc, title: v })} readOnly={readOnly} />
        <WbsCard app={app} doc={doc} project={project} readOnly={readOnly} onChange={(wbs) => update({ ...doc, wbs })} />
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="block text-[12px] text-ink-2 mb-1">التاريخ</span>
            <input type="date" dir="ltr" value={doc.dateIso} readOnly={readOnly} onChange={(e) => !readOnly && update({ ...doc, dateIso: e.target.value || today() })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" />
          </label>
          <label className="block">
            <span className="block text-[12px] text-ink-2 mb-1">المشروع</span>
            <select value={doc.projectId || ""} disabled={readOnly} onChange={(e) => update({ ...doc, projectId: e.target.value || null })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 text-[14px]">
              <option value="">بدون مشروع (GEN)</option>
              {projects.filter((p) => !p.deleted).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface border border-line">
          <span className="text-[12.5px]">
            {doc.docNo ? <bdi dir="ltr" className="font-grotesk">{doc.docNo} · Rev {doc.rev}</bdi> : "رقم المستند يُعطى عند الإصدار"} · <span className={doc.status === "issued" ? "text-good" : "text-ink-2"}>{STATUS[doc.status]}</span>
          </span>
          {doc.status === "draft"
            ? <button type="button" onClick={() => setConfirmIssue(true)} className="press shrink-0 min-h-10 px-3.5 rounded-lg bg-accent text-on-accent text-[12.5px] font-medium">إصدار</button>
            : <button type="button" onClick={revise} className="press shrink-0 min-h-10 px-3.5 rounded-lg bg-surface border border-line-2 text-[12.5px]">مراجعة جديدة</button>}
        </div>
        {doc.v > mod.v && <p className="text-[12px] text-warn">هذا المستند من إصدار أحدث من التطبيق — يُعرض للقراءة فقط. حدّث التطبيق لتعديله.</p>}
        <Editor body={doc.body} set={setBody} ctx={{ app, project, role, readOnly, fill: (body: any, title?: string) => !readOnly && update({ ...doc, body, title: title || doc.title }), spawn }} />
        {!readOnly && <ToolTipCard app={app} kind={doc.kind} summary={mod.summary(doc)} />}
      </div>
      <aside className="doc-live">{wide && <LivePreview make={spec} dep={doc} project={project} />}</aside>
      </div>
      <ExportBar busy={busy} onPreview={preview} onPdf={pdf} onDocx={docx} onXlsx={xlsx} onShare={share} />
      {pages && <DocPreview pages={pages} onClose={() => setPages(null)} draw={(c, p, s) => {
        const land = p.orientation === "landscape";
        c.width = Math.round((land ? 297 : 210) * s);
        c.height = Math.round((land ? 210 : 297) * s);
        const ctx = c.getContext("2d");
        if (ctx) drawPage(ctx, p, s);
      }} />}
      {confirmIssue && (
        <ConfirmDialog
          title="إصدار المستند"
          body="يأخذ المستند رقمه ويُجمَّد بنصه وأرقامه وبيانات المشروع كما هي الآن. أي تعديل لاحق يكون مراجعة جديدة."
          yes="أصدر"
          onNo={() => setConfirmIssue(false)}
          onYes={() => void issue()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Project profile
// ---------------------------------------------------------------------
const ISSUERS: [ToolProject["issuerRole"], string][] = [["contractor", "المقاول"], ["consultant", "الاستشاري"], ["client", "المالك"], ["subcontractor", "مقاول الباطن"]];

export function ProjectEditor({ app, project, onDone }: { app: any; project: ToolProject; onDone: () => void }) {
  const [p, setP] = useState<ToolProject>(project);
  const [askDel, setAskDel] = useState(false);
  const exists = (app.toolProjects || []).some((x: ToolProject) => x.id === project.id);
  const codeOk = PROJECT_CODE.test(p.code);
  const sig = (role: "prepared" | "checked" | "approved") => p.signatories.find((s) => s.role === role) || { role, name: "" };
  const setSig = (role: "prepared" | "checked" | "approved", patch: any) =>
    setP({ ...p, signatories: [...p.signatories.filter((s) => s.role !== role), { ...sig(role), ...patch }] });
  const party = (k: "client" | "consultant" | "contractor" | "subcontractor", label: string) => (
    <TextField label={label} value={(p as any)[k]?.name || ""} onChange={(v) => setP({ ...p, [k]: { ...((p as any)[k] || {}), name: v } })} />
  );
  const save = () => {
    if (!p.name.trim() || !codeOk) {
      app.toast(!p.name.trim() ? "اكتب اسم المشروع" : "رمز المشروع: من 2 إلى 8 حروف إنجليزية كبيرة أو أرقام");
      return;
    }
    app.saveToolProject({ ...p, at: Date.now() });
    app.setActiveProject(p.id);
    onDone();
  };
  return (
    <div className="py-4 space-y-3">
      <h1 className="text-[18px] font-medium">{exists ? "بيانات المشروع" : "مشروع جديد"}</h1>
      <p className="text-[12px] text-ink-2 leading-relaxed">تُكتب مرة واحدة وتظهر في خرطوشة كل تقرير. لا أسعار ولا مبالغ هنا.</p>
      <TextField label="اسم المشروع" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
      <TextField label="رمز المشروع (يدخل في أرقام المستندات)" dir="ltr" value={p.code} onChange={(v) => setP({ ...p, code: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) })} placeholder="TWR" />
      <Pick label="الجهة المُصدِرة للمستندات" items={ISSUERS} value={p.issuerRole} onChange={(v) => setP({ ...p, issuerRole: v })} />
      {party("client", "المالك")}
      {party("consultant", "الاستشاري")}
      {party("contractor", p.issuerRole === "subcontractor" ? "المقاول الرئيسي" : "المقاول")}
      {p.issuerRole === "subcontractor" && party("subcontractor", "مقاول الباطن")}
      <TextField label="الموقع" value={p.location.site} onChange={(v) => setP({ ...p, location: { ...p.location, site: v } })} />
      <TextField label="المدينة" value={p.location.city || ""} onChange={(v) => setP({ ...p, location: { ...p.location, city: v } })} />
      <TextField label="رقم العقد / المرجع" dir="ltr" value={p.contractNo || ""} onChange={(v) => setP({ ...p, contractNo: v })} />
      <h2 className="pt-2 text-[13.5px] font-medium">تقسيم المشروع (WBS)</h2>
      <p className="text-[11.5px] text-ink-3 leading-relaxed">المناطق والمباني وأدوارها — تُقترح عند حفظ أي مستند في مكانه من المشروع.</p>
      <WbsEditor value={p.wbs?.zones || []} onChange={(zones) => setP({ ...p, wbs: { zones } })} />
      <h2 className="pt-2 text-[13.5px] font-medium">التوقيعات</h2>
      {([["prepared", "أعدّ"], ["checked", "راجع"], ["approved", "اعتمد"]] as const).map(([r, l]) => (
        <div key={r} className="grid grid-cols-2 gap-2">
          <TextField label={`${l} — الاسم`} value={sig(r).name} onChange={(v) => setSig(r, { name: v })} />
          <TextField label="الوظيفة" value={sig(r).title || ""} onChange={(v) => setSig(r, { title: v })} />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onDone} className="press flex-1 min-h-12 rounded-xl bg-surface border border-line-2 text-[14px]">إلغاء</button>
        <button type="button" onClick={save} className="press flex-[1.4] min-h-12 rounded-xl btn-primary text-[14px] font-medium">حفظ المشروع</button>
      </div>
      {exists && <button type="button" onClick={() => setAskDel(true)} className="press w-full min-h-11 text-[12.5px] text-bad">أرشفة المشروع</button>}
      {askDel && (
        <ConfirmDialog title="أرشفة المشروع" body="يختفي المشروع من القوائم وتبقى مستنداته كما هي." yes="أرشف" onNo={() => setAskDel(false)}
          onYes={() => {
            app.saveToolProject({ ...p, archived: true, at: Date.now() });
            app.setActiveProject(null);
            onDone();
          }} />
      )}
    </div>
  );
}
