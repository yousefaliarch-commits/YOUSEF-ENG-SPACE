// =====================================================================
//  Firm templates on screen (data/tool-templates.ts holds the rules):
//  · TemplateShelf — on a tool's home: «قوالب المكتب», start a new document from one, send one as a file, delete one, and
//    take in a colleague's file. A file is validated (data/template-file.ts), must be for a tool this member may open, of a
//    body version this app knows, and the tool itself must build a document from it (`templateFits`) before it is saved.
//  · SaveAsTemplate — inside «إعدادات المستند»: this document's parameters (and its rows, if wanted) under a name.
//    The same name again updates that template instead of adding a twin.
//  Templates live in the tool store under «tpl.<kind>»; this file talks to the app through a small typed port.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, LayoutTemplate, Share2, Trash2, Upload } from "lucide-react";
import { newDocId, type ToolDoc, type ToolHeader } from "../../data/tool-docs";
import {
  TPL_FILE_MAX, cleanTemplateName, conformBody, docFromTemplate, revStart, templateBody, templateDoc, templateFile, templateFileName, templateKind,
  type TemplateFile, type ToolTemplate,
} from "../../data/tool-templates";
import type { ToolStore } from "../../lib/tool-store";
import { saveOrShare } from "../../lib/report-pdf";
import { toolAllowed, toolRole } from "../../tools/gate";
import { toolById } from "../../tools/registry";
import { Check, ConfirmDialog, TextField } from "../../ui/kit";
import { Num } from "../../ui/primitives";
import { TOOL_MODULES, type ToolModule } from "./module";

// the part of the app these screens use
export type TemplatePort = {
  toolStore: () => Promise<ToolStore>;
  toast: (message: string) => void;
  push: (entry: { type: string; id: string }) => void;
  profile?: { role?: string } | null;
};

const today = () => new Date().toISOString().slice(0, 10);

// the tool must be able to print a document made from this body: its own build and summary run over every field and row,
// so a body that survives them is one its screens can show
export function templateFits(mod: ToolModule, body: unknown): boolean {
  try {
    const doc: ToolDoc = {
      id: "dcheck", kind: mod.kind, v: mod.v, at: 0, createdAt: 0, projectId: null, title: "", dateIso: "2026-01-01", docNo: null, rev: "00",
      status: "draft", profile: mod.profile, body: structuredClone(body), photos: {}, log: [],
    };
    const spec = mod.build(doc, null);
    const title = mod.defaultTitle(doc.body);
    return !!spec && Array.isArray(spec.sections) && typeof title === "string" && typeof mod.summary(doc) === "string";
  } catch {
    return false;
  }
}

export type ImportResult = { ok: true; tpl: ToolTemplate; toolName: string } | { ok: false; message: string };

// a parsed file → a template ready to save, or the reason it is refused (pure given the module: tests drive it directly)
export function templateFromFile(file: TemplateFile, mod: ToolModule, toolName: string, now: number): ImportResult {
  if (file.kind !== mod.kind) return { ok: false, message: "القالب لأداة أخرى" };
  if (file.v > mod.v) return { ok: false, message: "القالب من إصدار أحدث من التطبيق — حدّث التطبيق ثم استورده" };
  const body = conformBody(mod.blank(), file.body);
  if (!templateFits(mod, body)) return { ok: false, message: "القالب غير متوافق مع هذه الأداة" };
  return {
    ok: true, toolName,
    tpl: templateDoc({ id: newDocId(), name: file.name, kind: mod.kind, v: file.v, body, rows: file.rows, profile: mod.profile, now, sign: file.sign, tb: file.tb, rev: file.rev }),
  };
}

function useTemplates(app: TemplatePort, kind: string): ToolHeader[] {
  const [list, setList] = useState<ToolHeader[]>([]);
  useEffect(() => {
    let live = true;
    let off = () => {};
    void app.toolStore().then((s) => {
      if (!live) return;
      const show = () => setList(s.headers([templateKind(kind)]));
      show();
      off = s.subscribe(show);
    });
    return () => {
      live = false;
      off();
    };
  }, [kind]);
  return list;
}

export function TemplateShelf({ app, kind, projectId }: { app: TemplatePort; kind: string; projectId: string | null }) {
  const list = useTemplates(app, kind);
  const [del, setDel] = useState<ToolHeader | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const start = async (h: ToolHeader) => {
    if (busy) return;
    setBusy(true);
    try {
      const s = await app.toolStore();
      const tpl = s.get(h.id) as ToolTemplate | null;
      const load = tpl ? TOOL_MODULES[tpl.body.of] : undefined;
      if (!tpl || !load) {
        app.toast("القالب غير موجود");
        return;
      }
      const mod = await load();
      if (tpl.body.v > mod.v) {
        app.toast("القالب من إصدار أحدث من التطبيق — حدّث التطبيق");
        return;
      }
      const doc = docFromTemplate(tpl, { id: newDocId(), projectId, dateIso: today(), title: mod.defaultTitle(tpl.body.body), profile: mod.profile, now: Date.now() });
      const r = await s.save(doc);
      if (r.status === "failed") {
        app.toast("تعذّر الحفظ على الجهاز — المساحة ممتلئة؟");
        return;
      }
      app.push({ type: "tooldoc", id: `${doc.kind}:${r.doc.id}` });
    } catch {
      app.toast("تعذّر فتح القالب");
    } finally {
      setBusy(false);
    }
  };

  const send = async (h: ToolHeader) => {
    try {
      const s = await app.toolStore();
      const tpl = s.get(h.id) as ToolTemplate | null;
      if (!tpl) return;
      const bytes = new TextEncoder().encode(JSON.stringify(templateFile(tpl), null, 1));
      await saveOrShare(bytes, templateFileName(tpl.title), tpl.title, "application/json");
    } catch {
      app.toast("تعذّرت مشاركة القالب");
    }
  };

  const take = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > TPL_FILE_MAX * 4) {
        app.toast("الملف أكبر من أن يكون قالبًا");
        return;
      }
      const { parseTemplateFile, TEMPLATE_FILE_PROBLEM } = await import("../../data/template-file");
      const parsed = parseTemplateFile(await f.text());
      if (parsed.ok === false) {
        app.toast(TEMPLATE_FILE_PROBLEM[parsed.problem]);
        return;
      }
      const tool = toolById(parsed.file.kind);
      const load = TOOL_MODULES[parsed.file.kind];
      if (!tool || !load || !toolAllowed(toolRole(app.profile), parsed.file.kind)) {
        app.toast("هذا القالب لأداة غير متاحة لحسابك");
        return;
      }
      const made = templateFromFile(parsed.file, await load(), tool.name, Date.now());
      if (made.ok === false) {
        app.toast(made.message);
        return;
      }
      const s = await app.toolStore();
      const r = await s.save(made.tpl);
      app.toast(r.status === "failed" ? "تعذّر حفظ القالب" : parsed.file.kind === kind ? "أُضيف القالب" : `أُضيف القالب إلى: ${made.toolName}`);
    } catch {
      app.toast("تعذّرت قراءة الملف");
    }
  };

  return (
    <section data-templates={list.length}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h2 className="text-[13px] text-ink-2">قوالب المكتب {list.length > 0 && <Num>({list.length})</Num>}</h2>
        <button type="button" data-template-import onClick={() => input.current?.click()} className="press inline-flex items-center gap-1 min-h-10 text-[12.5px] text-accent">
          <Upload size={14} /> استيراد قالب
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="hidden"
          data-template-file
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void take(f);
          }}
        />
      </div>
      {!list.length && (
        <p className="p-3.5 rounded-2xl border border-dashed border-line-2 text-[12px] text-ink-3 leading-relaxed">
          احفظ أي مستند كقالب من «إعدادات المستند»، فيبدأ كل مستند جديد بإعدادات مكتبك: النِّسب، قواعد القياس، التوقيعات، وبنودكم المعتادة.
        </p>
      )}
      <ul className="desk-grid space-y-2" data-template-list>
        {list.map((h) => (
          <li key={h.id} className="flex items-center rounded-2xl bg-surface border border-line">
            <button type="button" data-template-start={h.title} disabled={busy} onClick={() => void start(h)} className="press min-w-0 flex-1 min-h-14 flex items-center gap-3 px-3.5 py-2 text-start">
              <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-wash text-accent"><LayoutTemplate size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] leading-snug truncate" dir="auto">{h.title}</span>
                <span className="block text-[11.5px] text-ink-3">مستند جديد من هذا القالب · <Num>{h.dateIso}</Num></span>
              </span>
            </button>
            <button type="button" aria-label="مشاركة القالب كملف" title="مشاركة القالب كملف" data-template-share onClick={() => void send(h)} className="press grid place-items-center w-11 h-11 text-ink-3 hover:text-ink"><Share2 size={16} /></button>
            <button type="button" aria-label="حذف القالب" data-template-delete onClick={() => setDel(h)} className="press grid place-items-center w-11 h-11 me-1 text-ink-3 hover:text-bad"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {del && (
        <ConfirmDialog
          title="حذف القالب"
          body="يُحذف القالب من كل أجهزتك. المستندات التي بدأت منه تبقى كما هي."
          yes="احذف"
          onNo={() => setDel(null)}
          onYes={async () => {
            const d = del;
            setDel(null);
            const s = await app.toolStore();
            const r = await s.remove(d.id);
            app.toast(r.status === "ok" ? "حُذف القالب" : "تعذّر الحذف — حاول مرة أخرى");
          }}
        />
      )}
    </section>
  );
}

export function SaveAsTemplate({ app, doc, mod, toolName }: { app: TemplatePort; doc: ToolDoc; mod: ToolModule; toolName: string }) {
  const [name, setName] = useState(`قالب ${toolName}`);
  const [rows, setRows] = useState(true);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const clean = cleanTemplateName(name);
    if (!clean) {
      app.toast("اكتب اسمًا للقالب");
      return;
    }
    setBusy(true);
    try {
      const s = await app.toolStore();
      const same = s.headers([templateKind(doc.kind)]).find((h) => h.title === clean);
      const tpl = templateDoc({
        id: same ? same.id : newDocId(), name: clean, kind: doc.kind, v: doc.v, rows, profile: doc.profile, now: Date.now(),
        body: templateBody(doc.body, mod.blank(), rows, mod.template), sign: doc.sign, tb: doc.tb, rev: revStart(doc.rev),
      });
      const r = await s.save(tpl);
      app.toast(r.status === "failed" ? "تعذّر حفظ القالب" : same ? "حُدّث القالب" : "حُفظ القالب — تجده في صفحة الأداة تحت «قوالب المكتب»");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pt-1 space-y-2" data-save-template>
      <span className="block text-[12px] text-ink-2">قالب المكتب</span>
      <p className="text-[11.5px] text-ink-3 leading-relaxed">يحفظ إعدادات هذا المستند وتوقيعاته ليبدأ منها كل مستند جديد. الكميات المنفَّذة والردود والاعتمادات لا تنتقل.</p>
      <TextField label="اسم القالب" value={name} onChange={setName} data-template-name />
      <Check label="مع بنود هذا المستند" on={rows} onChange={setRows} />
      <button type="button" data-template-save disabled={busy} onClick={() => void save()} className="press w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-surface border border-line-2 text-[13.5px] font-medium disabled:opacity-50">
        <BookmarkPlus size={16} /> حفظ كقالب للمكتب
      </button>
    </div>
  );
}
