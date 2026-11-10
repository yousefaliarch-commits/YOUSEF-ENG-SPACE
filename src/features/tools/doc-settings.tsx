// =====================================================================
//  «إعدادات المستند» — what the engineer controls on any tool document beyond its calculation (data/doc-controls.ts):
//  the revision code and its scheme, the scale and reference cells of the title block, the signature boxes, and the
//  history of issued revisions. Folded away by default (most documents keep the project's defaults); the badge counts
//  what was customised. `IssueDialog` asks what the revision is for — the line the title block's revision table prints.
// =====================================================================
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, PenLine } from "lucide-react";
import { REV_PRESETS, SIGN_MAX, cleanRev, type DocRev, type SignBox, type TitleExtras } from "../../data/doc-controls";
import type { ToolDoc } from "../../data/tool-docs";
import { Advanced, Grid2, RowCards, TextField } from "../../ui/kit";
import { FilterChip, Num } from "../../ui/primitives";
import { portalHost } from "../../ui/portal";

export type DocSettingsPatch = Partial<Pick<ToolDoc, "rev" | "sign" | "tb">>;

// how many of a document's controls differ from the defaults (shown on the folded card)
export function docSettingsChanged(doc: Pick<ToolDoc, "rev" | "sign" | "tb">): number {
  return (doc.sign && doc.sign.length ? 1 : 0) + (doc.tb?.scale ? 1 : 0) + (doc.tb?.reference ? 1 : 0) + (/^\d\d$/.test(doc.rev) ? 0 : 1);
}

export function DocSettings({ doc, readOnly, defaults, referenceHint, onChange, children }: {
  doc: ToolDoc; readOnly: boolean; defaults: () => SignBox[]; referenceHint?: string; onChange: (patch: DocSettingsPatch) => void; children?: ReactNode;
}) {
  const put = (patch: DocSettingsPatch) => !readOnly && onChange(patch);
  const tb: TitleExtras = doc.tb || {};
  const custom = !!(doc.sign && doc.sign.length);
  const shown: SignBox[] = custom ? (doc.sign as SignBox[]) : defaults();
  const revs: DocRev[] = doc.revs || [];
  return (
    <Advanced title="إعدادات المستند" hint="المراجعة · الخرطوشة · التوقيعات · قوالب المكتب" changed={docSettingsChanged(doc)} data-doc-settings="">
      <div>
        <TextField label="رمز المراجعة" dir="ltr" value={doc.rev} readOnly={readOnly} onChange={(v) => put({ rev: cleanRev(v) })} data-doc-rev />
        {!readOnly && !revs.length && (
          <div className="mt-2 -mx-1 px-1 flex gap-2 overflow-x-auto no-scrollbar" data-rev-presets>
            {REV_PRESETS.map(([code, label]) => (
              <FilterChip key={code} on={doc.rev === code} onClick={() => put({ rev: code })}>{label}</FilterChip>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11.5px] text-ink-3 leading-relaxed">«مراجعة جديدة» تكمل على نفس النمط: 00 ← 01، A ← B، P01 ← P02.</p>
      </div>
      <Grid2>
        <TextField label="مقياس الرسم" dir="ltr" value={tb.scale || ""} readOnly={readOnly} placeholder="1:100" onChange={(v) => put({ tb: { ...tb, scale: v } })} data-doc-scale />
        <TextField label="المرجع (بدل رقم العقد)" dir="auto" value={tb.reference || ""} readOnly={readOnly} placeholder={referenceHint || "رقم اللوحة أو الخطاب"} onChange={(v) => put({ tb: { ...tb, reference: v } })} data-doc-reference />
      </Grid2>
      <div data-doc-sign={custom ? "custom" : "default"}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[12px] text-ink-2">خانات التوقيع ({shown.length})</span>
          {!readOnly && (custom
            ? <button type="button" data-sign-reset onClick={() => put({ sign: undefined })} className="press inline-flex items-center gap-1 min-h-10 text-[12.5px] text-accent"><RotateCcw size={14} /> توقيعات المشروع</button>
            : <button type="button" data-sign-custom onClick={() => put({ sign: defaults().map((b) => ({ label: b.label, name: b.name || "", title: b.title || "" })) })} className="press inline-flex items-center gap-1 min-h-10 text-[12.5px] text-accent"><PenLine size={14} /> تخصيص</button>)}
        </div>
        {custom && !readOnly ? (
          <RowCards<SignBox>
            rows={shown} onChange={(sign) => put({ sign })} max={SIGN_MAX} addLabel="خانة توقيع"
            blank={() => ({ label: "", name: "", title: "" })}
            summary={(b) => `${b.label || "خانة توقيع"}${b.name ? ` — ${b.name}` : ""}`}
            render={(b, setB) => (
              <>
                <TextField label="عنوان الخانة" value={b.label} onChange={(v) => setB({ ...b, label: v })} placeholder="مدير المشروع · Project manager" data-sign-label />
                <Grid2>
                  <TextField label="الاسم" value={b.name || ""} onChange={(v) => setB({ ...b, name: v })} data-sign-name />
                  <TextField label="الوظيفة" value={b.title || ""} onChange={(v) => setB({ ...b, title: v })} />
                </Grid2>
              </>
            )}
          />
        ) : (
          <ul className="space-y-1.5">
            {shown.map((b, i) => (
              <li key={i} className="px-3 py-2 rounded-xl bg-canvas border border-line text-[12.5px] leading-snug">
                <span className="block">{b.label}</span>
                {(b.name || b.title) && <span className="block text-[11.5px] text-ink-3" dir="auto">{[b.name, b.title].filter(Boolean).join(" · ")}</span>}
              </li>
            ))}
            {!shown.length && <li className="text-[12px] text-ink-3">هذا المستند بلا خانات توقيع.</li>}
          </ul>
        )}
      </div>
      {revs.length > 0 && (
        <div data-doc-revs>
          <span className="block text-[12px] text-ink-2 mb-1.5">سجل المراجعات الصادرة</span>
          <ul className="rounded-xl border border-line overflow-hidden">
            {[...revs].reverse().map((r) => (
              <li key={r.rev} className="flex items-baseline gap-2.5 px-3 py-2 border-b border-line last:border-b-0 text-[12.5px]">
                <Num className="shrink-0 font-medium">{r.rev}</Num>
                <Num className="shrink-0 text-[11.5px] text-ink-3">{r.dateIso}</Num>
                <span className="min-w-0 flex-1 text-ink-2" dir="auto">{r.desc || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </Advanced>
  );
}

// issuing asks one thing: what this revision is for (the «وصف التعديل» column of the title block's revision table)
export function IssueDialog({ first, rev, onIssue, onCancel }: { first: boolean; rev: string; onIssue: (desc: string) => void; onCancel: () => void }) {
  const [desc, setDesc] = useState(first ? "إصدار أول" : "");
  const node = (
    <div role="alertdialog" aria-modal="true" aria-label="إصدار المستند" className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/40 p-3" data-issue-dialog>
      <div className="w-full max-w-sm p-5 rounded-2xl bg-elevated border border-line shadow-xl pb-[max(1.25rem,var(--sab))]">
        <h2 className="text-[16px] font-medium">إصدار المستند · <Num>Rev {rev}</Num></h2>
        <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">يأخذ المستند رقمه ويُجمَّد بنصه وأرقامه وبيانات المشروع كما هي الآن. أي تعديل لاحق يكون مراجعة جديدة.</p>
        <div className="mt-3">
          <TextField label="وصف هذا الإصدار (يُطبع في جدول المراجعات)" value={desc} onChange={setDesc} placeholder={first ? "إصدار أول" : "تعديل الكميات حسب ملاحظات الاستشاري"} data-issue-desc />
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="press flex-1 min-h-12 rounded-xl bg-surface border border-line-2 text-[14px]">إلغاء</button>
          <button type="button" data-issue-go onClick={() => onIssue(desc)} className="press flex-1 min-h-12 rounded-xl btn-primary text-[14px] font-medium">أصدر</button>
        </div>
      </div>
    </div>
  );
  const host = portalHost();
  return host ? createPortal(node, host) : node;
}
