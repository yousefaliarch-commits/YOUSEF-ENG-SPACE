import { useState } from "react";
import {
  CircleAlert, CircleCheck, EyeOff, Flag, LockKeyhole, ShieldAlert
} from "lucide-react";
import { displayName } from "../domain/identity";
import { REPORT_KINDS_DEF, ckey, reasonsFor, snapUGC, snapshotFor } from "../domain/moderation";
import { UGC } from "../i18n/i18n";
import { Empty } from "./chrome";
import { IdentityFace } from "./identity";
import { Num, Panel, Primary, Secondary } from "./primitives";

// What members see in place of moderated content: removed for everyone (a moderator's decision or the auto-hide threshold),
// hidden only for the member who reported it (with undo), or — for the author — their own item with the reason
export const Removed = ({ what, info }: any) => <Panel className="p-3.5 flex items-center gap-2 text-[12.5px] text-ink-2"><ShieldAlert size={14} className="text-ink-3 shrink-0" /> {info && info.by === "auto" ? `أُخفي ${what} مؤقتًا بعد بلاغات من عدة أعضاء — ينتظر مراجعة المشرفين.` : `أُزيل ${what} بقرار من فريق المجتمع لمخالفته الإرشادات.`}</Panel>;

export const HiddenByMe = ({ what, onUndo }: any) => <Panel className="p-3.5 flex items-center justify-between gap-2 text-[12.5px] text-ink-2"><span className="inline-flex items-center gap-2"><EyeOff size={14} /> أخفيت {what} بعد بلاغك</span><button type="button" onClick={onUndo} className="text-accent hover:underline underline-offset-4">تراجع</button></Panel>;

export const RemovedMine = ({ what, info }: any) => <p className="mb-2 p-2.5 rounded-xl bg-bad/10 border border-bad/20 text-[11.5px] leading-relaxed text-bad flex items-start gap-1.5"><ShieldAlert size={13} className="shrink-0 mt-0.5" /><span>{info && info.by === "auto" ? `${what} مخفي عن الأعضاء مؤقتًا — بلغ حد البلاغات وينتظر قرار المشرف.` : `أُزيل ${what} عن الأعضاء بقرار من فريق المجتمع${info && info.reason ? ` — السبب: ${info.reason}` : ""}. لا يراه غيرك.`}</span></p>;


// =====================================================================
//  Report sheet — one flow for every kind of content
// =====================================================================
export function ReportSheet({ app, payload = {} }: any) {
  const kind = payload.kind || "post"; const id = payload.id || payload.post; const key = ckey(kind, id);
  const [snap] = useState<any>(() => snapshotFor(kind, id, { posts: app.posts, jobs: app.jobsAll, threads: app.threads, reviews: app.reviews, profile: app.profile }, payload));
  const [reason, setReason] = useState<any>(null); const [note, setNote] = useState<any>(""); const [hide, setHide] = useState(kind !== "user"); const [done, setDone] = useState<any>(null);
  const already = app.reports.find((r) => r.mine && r.key === key && r.status === "open");
  const hideLabel = { post: "أخفِ المنشور عني الآن", comment: "أخفِ الرد عني الآن", review: "أخفِ التقييم عني الآن", job: "أخفِ الإعلان من قوائمي", message: "احظر هذا العضو في هذه المحادثة" }[kind];
  const finish = () => { app.closeSheet(); const top = app.stack[app.stack.length - 1]; if (hide && top && ((kind === "post" && top.type === "post" && top.id === id) || (kind === "job" && top.type === "job" && top.id === id))) app.pop(); };
  if (!snap) return <Empty icon={CircleAlert} title="لم نجد هذا المحتوى" body="ربما حُذف أو أُخفي بالفعل." action="إغلاق" onAction={app.closeSheet} />;
  if (done) return (
    <div className="text-center flex flex-col items-center gap-3 py-2 pop-in"><CircleCheck size={44} className="text-good" /><h4 className="text-[19px] font-medium">وصل بلاغك</h4><Num className="text-[12px] text-ink-3">{done.id}</Num>
      <p className="text-[13px] text-ink-2 leading-relaxed max-w-[34ch]">يراجعه فريق المجتمع خلال <Num>{app.config.slaHours}</Num> ساعة، وتصلك النتيجة في الإشعارات. صاحب المحتوى لن يعرف من أبلغ.</p>
      {done.autoHidden && <p className="p-3 rounded-xl bg-warn/10 border border-warn/20 text-[12px] text-warn leading-relaxed">بلغ عدد المبلّغين حد الإخفاء التلقائي — أُخفي عن الجميع حتى يقرر المشرف.</p>}
      <Primary onClick={finish} className="w-full h-12 mt-1 press">تم</Primary></div>
  );
  if (already) return <div className="space-y-3"><p className="p-3.5 rounded-xl bg-wash border border-accent/20 text-[13px] leading-relaxed">أبلغت عن {REPORT_KINDS_DEF[kind]} من قبل (<Num>{already.id}</Num>) — البلاغ قيد المراجعة، ولا حاجة لتكراره.</p><Secondary onClick={app.closeSheet} className="w-full h-11">إغلاق</Secondary></div>;
  const a = snap.author || {};
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-canvas/60 border border-line"><div className="flex items-center gap-2 text-[12px]"><IdentityFace a={a} size={26} /><span className="font-medium">{a.as === "public" ? displayName(a) : <Num>#{a.anon}</Num>}</span><span className="text-ink-3 truncate">· {snap.where}{snap.on && <> <bdi {...UGC}>{snap.on}</bdi></>}</span></div>{kind !== "user" && <p {...snapUGC(snap)} className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2 line-clamp-2 text-start">{app.money(snap.text)}</p>}</div>
      <div role="radiogroup" aria-label="سبب البلاغ" className="space-y-1.5">{reasonsFor(kind).map(([rid, l, sev]: any) => <button key={rid} type="button" role="radio" aria-checked={reason === rid} onClick={() => setReason(rid)} className={`press w-full min-h-11 px-4 py-2 rounded-xl border text-start text-[13.5px] flex items-center gap-2.5 transition-colors ${reason === rid ? "bg-wash border-accent/40" : "border-line-2"}`}><span className={`w-2 h-2 rounded-full shrink-0 ${sev === 3 ? "bg-bad" : sev === 2 ? "bg-warn" : "bg-ink-4"}`} />{l}</button>)}</div>
      <label className="block"><span className="block text-[12px] text-ink-2 mb-1.5">تفاصيل للمشرفين {reason === "other" ? "(مطلوبة)" : "(اختياري)"}</span><textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} placeholder="ما الذي حدث؟ لا تكتب بياناتك الشخصية." className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" /></label>
      {hideLabel && <label className="flex items-center gap-2.5 text-[12.5px] min-h-11"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} className="w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" />{hideLabel}</label>}
      <p className="text-[11px] leading-relaxed text-ink-3 flex items-start gap-1.5"><LockKeyhole size={12} className="shrink-0 mt-0.5" />بلاغك مجهول: صاحب المحتوى لا يعرف من أبلغ، والمشرفون يرون مستوى ثقتك فقط. البلاغات الكيدية المتكررة تُخفّض الثقة.</p>
      <div className="flex gap-2"><Secondary onClick={app.closeSheet} className="h-12 px-5">إلغاء</Secondary><Primary disabled={!reason || (reason === "other" && note.trim().length < 5)} onClick={() => { const r = app.report({ kind, id, reason, note: note.trim(), hide: hide && kind !== "user" && kind !== "message", snapshot: snap }); if (kind === "message" && hide) app.blockThread(id, true); setDone(r); }} className="flex-1 h-12 press"><Flag size={15} /> إرسال البلاغ</Primary></div>
    </div>
  );
}
