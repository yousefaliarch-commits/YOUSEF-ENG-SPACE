// Migrated from the prototype part(s): app_4d_verify_admin
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  BadgeCheck, CircleX, Gavel, Hourglass, IdCard, ListChecks, LockKeyhole, ScrollText, ShieldCheck, Trash2, X, 
  ZoomIn
} from "lucide-react";
import { govName } from "../../data/geo";
import { DIVISIONS, discName, divOf, divisionForDisc } from "../../domain/division";
import { THIS_YEAR } from "../../domain/identity";
import { agoText } from "../../domain/moderation";
import { discTitle, roleTitle } from "../../domain/taxonomy";
import { Choice, PanelHead, ToneChip } from "./kit";
import { DOC_SLOTS, VERIFY_REJECT, VERIFY_SLA_H, credentialL2, docSrc, rejectOf } from "../verify/verify";
import { L2, say, trIn, useLang, whenIn } from "../../i18n/i18n";
import { Monogram } from "../../ui/identity";
import { Back, Num, Panel, Primary, Secondary } from "../../ui/primitives";

// =====================================================================
//  Admin console — verification requests («طلبات التوثيق»). Every request is decided here by a person; nothing is pre-judged.
//  · The reviewer sees the documents, the account's registered details to compare them with, and a three-point checklist.
//  · Approve (with the division and graduation year as written on the document) or reject with a reason the member reads.
//  · The decision purges the images at once — from this console and from the member's browser — and the audit log records
//    the decision and the purge. Documents are shown for review only: watermarked, no download, no copy, no context menu.
//  Written in both languages side by side (L2), so the section is rendered translate="no".
// =====================================================================
export const AV = {
  rulesTitle: L2("قواعد المراجعة", "Review rules"),
  rules: [
    L2("كل طلب يقرره شخص — لا قبول ولا رفض آليًا.", "Every request is decided by a person — nothing is approved or rejected automatically."),
    L2("المستندات للمراجعة فقط: لا تنزيل ولا نسخ ولا لقطات شاشة.", "Documents are for review only: no downloads, copies or screenshots."),
    L2("لحظة القرار — قبولًا أو رفضًا — تُحذف المستندات نهائيًا، ويبقى القرار وحده.", "The moment you decide — approve or reject — the documents are permanently deleted; only the decision remains."),
    L2("الطلب الذي لا يُراجَع خلال 7 أيام تُحذف مستنداته تلقائيًا.", "A request not reviewed within 7 days has its documents deleted automatically."),
  ],
  filter: L2("حالة الطلب", "Request status"), pending: L2("تنتظر المراجعة", "Awaiting review"), approved: L2("معتمدة", "Approved"), rejected: L2("مرفوضة", "Rejected"), all: L2("الكل", "All"),
  status: { pending: L2("قيد المراجعة", "Under review"), approved: L2("معتمد", "Approved"), rejected: L2("مرفوض", "Rejected"), withdrawn: L2("سحبه العضو", "Withdrawn"), expired: L2("انتهت المهلة", "Expired") },
  late: L2("تجاوز 24 ساعة", "Over 24 h"), yours: L2("حسابك", "Your account"), none: L2("لا طلبات هنا.", "No requests here."), pick: L2("اختر طلبًا لمراجعة مستنداته.", "Choose a request to review its documents."), back: L2("كل الطلبات", "All requests"),
  account: L2("بيانات الحساب — للمقارنة بالمستند", "Account details — to compare with the document"), accountNote: L2("كما سجّلها العضو. لا يظهر هنا معرّفه المجهول ولا أي من مشاركاته.", "As the member registered them. Their anonymous handle and posts are never shown here."),
  fName: L2("الاسم في الحساب", "Name on the account"), fRole: L2("الدور", "Role"), fDisc: L2("التخصص المسجّل", "Registered specialty"), fYear: L2("سنة التخرج المسجّلة", "Registered graduation year"), fGov: L2("المحافظة", "Governorate"), fAcc: L2("رقم الحساب", "Account no."), fSent: L2("أُرسل", "Submitted"), fRef: L2("رقم الطلب", "Request no."),
  docs: L2("المستندات", "Documents"), docsNote: L2("للمراجعة فقط — تُحذف نهائيًا لحظة القرار.", "For review only — permanently deleted the moment you decide."), zoom: L2("تكبير", "Zoom"), closeDoc: L2("إغلاق المستند", "Close document"), sample: L2("نموذج تجريبي — بيانات وهمية", "Sample — made-up data"),
  check: L2("قائمة المراجعة", "Review checklist"), checkNote: L2("الاعتماد متاح بعد تأكيد النقاط كلها.", "Approval unlocks once every point is confirmed."),
  divPick: L2("الشعبة كما في المستند", "Division as written on the document"), yearPick: L2("سنة التخرج كما في المستند", "Graduation year as written on the document"), yearBad: L2("اكتب سنة من 4 أرقام بين 1965 والعام القادم", "Enter a four-digit year between 1965 and next year"),
  credPick: L2("الشارة حسب المستند المقبول", "Badge, by the accepted document"), credCard: L2("عضوية نقابة — الكارنيه", "Syndicate membership — the card"), credCert: L2("شهادة هندسية — الشهادة", "Engineering degree — the certificate"),
  decide: L2("القرار", "Decision"), approve: L2("اعتماد التوثيق", "Approve verification"), reject: L2("رفض الطلب", "Reject the request"), rejectWhy: L2("سبب الرفض — يصل للعضو كما هو", "Reason — the member reads it as written"),
  rejectNote: L2("ملاحظة للعضو (اختياري)", "Note to the member (optional)"), rejectNoteReq: L2("ملاحظة للعضو (مطلوبة)", "Note to the member (required)"), rejectPh: L2("مثال: صوّر الكارنيه في إضاءة أفضل وأعد التقديم.", "e.g. Photograph the card in better light and apply again."),
  confirmReject: L2("تأكيد الرفض وحذف المستندات", "Reject and delete the documents"), cancel: L2("تراجع", "Cancel"),
  purgeNote: L2("عند القرار تُحذف المستندات فورًا ونهائيًا — من هذه اللوحة ومن جهاز العضو.", "On decision the documents are deleted at once and for good — from this console and from the member's device."),
  record: L2("سجل القرار", "Decision record"), by: L2("بواسطة", "By"), at: L2("الوقت", "Time"), reason: L2("السبب", "Reason"), note: L2("ملاحظة", "Note"), division: L2("الشعبة", "Division"), grad: L2("سنة التخرج", "Graduation year"), credential: L2("الشارة", "Badge"), docsWere: L2("المستندات", "Documents"),
  who: { self: L2("أنت (مشرف)", "You (moderator)"), team: L2("فريق المراجعة", "Review team"), member: L2("العضو نفسه", "The member"), system: L2("النظام — انتهت المهلة", "System — time limit") },
  purged: (n?: any, when?: any, en?: any) => (en ? `${n === 1 ? "1 document" : `${n} documents`} permanently deleted · ${when}` : `حُذفت المستندات (${n}) نهائيًا · ${when}`),
  noDocs: L2("لا مستندات محفوظة لهذا الطلب.", "No documents are kept for this request."),
};

export const REVIEW_CHECKS = {
  engineer: [["name", L2("الاسم في المستند يطابق اسم الحساب", "The name on the document matches the account name")], ["legible", L2("المستند أصلي وواضح — غير مقصوص ولا معدّل", "The document is genuine and legible — not cropped or altered")], ["fields", L2("الشعبة وسنة التخرج مقروءتان، ومطابقتان لما تختاره أدناه", "The division and graduation year are legible and match what you set below")]],
  supervisor: [["name", L2("الاسم في المستند يطابق اسم الحساب", "The name on the document matches the account name")], ["legible", L2("المستند أصلي وواضح — غير مقصوص ولا معدّل", "The document is genuine and legible — not cropped or altered")], ["fields", L2("المؤهل أو المسمّى وجهة العمل مقروءة", "The qualification, or the job title and employer, are legible")]],
};

export const docSize = (d?: any) => (d && d.w && d.h ? [d.w, d.h] : d && d.kind === "card" ? [1000, 630] : [1400, 990]);

// The request number over the document, three times: a screenshot always carries it
export const Watermark = ({ id }: any) => (
  <span aria-hidden="true" className="absolute inset-0 flex flex-col justify-around items-center pointer-events-none overflow-hidden select-none">
    {[0, 1, 2].map((i) => <span key={i} dir="ltr" className="font-grotesk font-semibold whitespace-nowrap text-[clamp(10px,2.2vw,15px)] tracking-[0.18em]" style={{ transform: "rotate(-14deg)", color: "rgba(20,20,30,.2)", textShadow: "0 0 1px rgba(255,255,255,.5)" }}>EngSpace · {id} · REVIEW ONLY</span>)}
  </span>
);

export function DocZoom({ r, i, t, onClose }: any) {
  const ref = useRef<any>(null); const d = r.docs[i]; const src = docSrc(r, i);
  // Escape closes; focus moves to the close button and returns to the document that was opened
  useEffect(() => { const back = document.activeElement as HTMLElement | null; const k = (e?: any) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); try { if (ref.current) ref.current.focus(); } catch (e) {} return () => { document.removeEventListener("keydown", k); try { if (back && back.isConnected && back.focus) back.focus(); } catch (e) {} }; }, []);
  if (!d || !src) return null;
  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" aria-label={t((DOC_SLOTS[d.kind] || DOC_SLOTS.cert).title)} translate="no" className="fixed inset-0 z-[80]" style={{ background: "rgba(6,6,10,.9)" }} onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute inset-0 overflow-auto p-4 pt-16 sm:p-12 grid place-items-center">
        <div className="relative w-full max-w-[1100px]" onClick={(e) => e.stopPropagation()}><img src={src} alt="" draggable={false} className="block w-full h-auto rounded-lg select-none pointer-events-none" /><Watermark id={r.id} /></div>
      </div>
      <button ref={ref} type="button" onClick={onClose} aria-label={t(AV.closeDoc)} className="absolute top-3 end-3 grid place-items-center w-11 h-11 rounded-full bg-elevated border border-line-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={18} /></button>
    </div>, document.body);
}

export function VerifyRow({ r, on, onOpen, t, lang, now }: any) {
  const late = r.status === "pending" && now - r.at > VERIFY_SLA_H * 3600e3; const tone = r.status === "approved" ? "good" : r.status === "rejected" ? "bad" : r.status === "pending" ? (late ? "warn" : "accent") : "default";
  const trx = (s?: any) => trIn(lang, s);
  return (
    <li><button type="button" aria-current={on ? "true" : undefined} onClick={onOpen} className={`press w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash border-accent/40" : "bg-surface border-line hover:border-line-3"}`}>
      <Monogram name={r.name} size={36} />
      <span className="min-w-0"><span className="flex items-center gap-1.5 text-[13px] font-medium flex-wrap"><span>{r.name}</span>{r.mine && <ToneChip tone="accent" className="h-5 px-1.5 text-[10px]">{t(AV.yours)}</ToneChip>}</span>
        <span className="block text-[11px] text-ink-2 leading-snug">{trx(r.role === "supervisor" ? roleTitle("supervisor", r.gender) : discTitle(r.disc, r.gender))} · {(r.kinds || []).map((k) => t((DOC_SLOTS[k] || DOC_SLOTS.cert).short)).join(" + ")}</span></span>
      <span className="text-end"><ToneChip tone={tone}>{late ? t(AV.late) : t(AV.status[r.status] || AV.status.pending)}</ToneChip><span className="block mt-0.5 text-[10px] text-ink-3">{lang === "en" ? whenIn(lang, r.at) : agoText(r.at, now)}</span></span>
    </button></li>
  );
}

export function VerifySection({ A }: any) {
  const lang = useLang(); const t = (x?: any) => say({ lang }, x);
  const [st, setSt] = useState<any>("pending");
  const order = (a?: any, b?: any) => (a.status === "pending" && b.status === "pending" ? a.at - b.at : (a.status === "pending") !== (b.status === "pending") ? (a.status === "pending" ? -1 : 1) : ((b.decision && b.decision.at) || b.at) - ((a.decision && a.decision.at) || a.at));
  const list = A.verifs.filter((r) => st === "all" || r.status === st).sort(order); const sel = A.verifs.find((r) => r.id === A.focusVerify) || null;
  const count = (s?: any) => A.verifs.filter((r) => s === "all" || r.status === s).length;
  return (
    <div translate="no" lang={lang} className="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
      <div className={`space-y-3 min-w-0 ${sel ? "hidden xl:block" : ""}`}>
        <Panel className="p-3.5 border-good/20"><p className="text-[12.5px] font-medium text-good flex items-center gap-1.5"><ShieldCheck size={14} /> {t(AV.rulesTitle)}</p><ul className="mt-1.5 space-y-1">{AV.rules.map((x, i) => <li key={i} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-2"><span className="mt-[7px] w-1 h-1 rounded-full bg-good shrink-0" />{t(x)}</li>)}</ul></Panel>
        <Choice label={t(AV.filter)} value={st} onChange={setSt} items={[["pending", <>{t(AV.pending)} <Num>{count("pending")}</Num></>], ["approved", <>{t(AV.approved)} <Num>{count("approved")}</Num></>], ["rejected", <>{t(AV.rejected)} <Num>{count("rejected")}</Num></>], ["all", t(AV.all)]]} />
        {list.length === 0 ? <Panel className="p-6 text-center text-[12.5px] text-ink-2">{t(AV.none)}</Panel> : <ul className="space-y-2">{list.map((r) => <VerifyRow key={r.id} r={r} on={!!sel && sel.id === r.id} onOpen={() => A.setFocusVerify(r.id)} t={t} lang={lang} now={A.now} />)}</ul>}
      </div>
      <div className={`min-w-0 ${sel ? "" : "hidden xl:block"}`}>{sel ? <VerifyDetail key={sel.id} A={A} r={sel} /> : <Panel className="p-8 text-center text-[13px] text-ink-2"><IdCard size={28} className="mx-auto text-accent mb-2" />{t(AV.pick)}</Panel>}</div>
    </div>
  );
}

export function VerifyDetail({ A, r }: any) {
  const lang = useLang(); const t = (x?: any) => say({ lang }, x); const en = lang === "en"; const trx = (s?: any) => trIn(lang, s);
  const eng = r.role !== "supervisor"; const pending = r.status === "pending"; const checks0 = REVIEW_CHECKS[eng ? "engineer" : "supervisor"];
  const [checks, setChecks] = useState<any>({}); const [div, setDiv] = useState<any>(() => divisionForDisc(r.disc) || "civil"); const [year, setYear] = useState<any>(r.gradYear ? String(r.gradYear) : "");
  const [kind, setKind] = useState<any>((r.kinds || []).includes("card") ? "syndicate" : "certificate"); const [rejecting, setRejecting] = useState(false); const [reason, setReason] = useState<any>(null); const [note, setNote] = useState<any>(""); const [zoom, setZoom] = useState<any>(null);
  const yearOk = !eng || (/^\d{4}$/.test(year) && +year >= 1965 && +year <= THIS_YEAR + 1); const allChecked = checks0.every(([k]: any) => checks[k]);
  const both = (r.kinds || []).includes("card") && (r.kinds || []).includes("cert");
  const dc = r.decision || {}; const late = pending && A.now - r.at > VERIFY_SLA_H * 3600e3;
  const facts = [[t(AV.fName), r.name], [t(AV.fRole), trx(roleTitle(r.role, r.gender))], eng && [t(AV.fDisc), trx(discName(r.disc))], [t(AV.fYear), r.gradYear ? <Num>{r.gradYear}</Num> : "—"], [t(AV.fGov), r.gov ? trx(govName(r.gov)) : "—"], [t(AV.fAcc), <Num>{r.acc}</Num>], [t(AV.fRef), <Num>{r.id}</Num>], [t(AV.fSent), whenIn(lang, r.at)]].filter(Boolean);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => A.setFocusVerify(null)} className="xl:hidden inline-flex items-center gap-1.5 min-h-9 text-[12.5px] text-accent"><Back size={15} /> {t(AV.back)}</button>
      <Panel className="p-4">
        <div className="flex items-center gap-3"><Monogram name={r.name} size={48} /><div className="min-w-0 flex-1"><h3 className="text-[17px] font-medium leading-snug flex items-center gap-1.5 flex-wrap">{r.name}{r.mine && <ToneChip tone="accent">{t(AV.yours)}</ToneChip>}</h3><div className="mt-1 flex flex-wrap gap-1.5"><ToneChip tone={r.status === "approved" ? "good" : r.status === "rejected" ? "bad" : r.status === "pending" ? (late ? "warn" : "accent") : "default"}>{t(AV.status[r.status] || AV.status.pending)}</ToneChip>{late && <ToneChip tone="warn"><Hourglass size={11} /> {t(AV.late)}</ToneChip>}</div></div></div>
        <p className="mt-3 text-[12px] font-medium">{t(AV.account)}</p>
        <dl className="mt-1 grid grid-cols-2 gap-x-4 text-[11.5px]">{facts.map(([k, v]: any) => <div key={k} className="flex justify-between gap-2 border-b border-line py-1.5"><dt className="text-ink-3 shrink-0">{k}</dt><dd className="text-ink text-end leading-snug">{v}</dd></div>)}</dl>
        <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed flex items-start gap-1.5"><LockKeyhole size={11} className="shrink-0 mt-0.5" />{t(AV.accountNote)}</p>
      </Panel>
      {pending ? <>
        <Panel className="p-4">
          <PanelHead icon={IdCard} title={<>{t(AV.docs)} · <Num>{r.docs.length}</Num></>}><span className="text-[11px] text-good inline-flex items-center gap-1"><Trash2 size={12} /> {t(AV.docsNote)}</span></PanelHead>
          {r.docs.length === 0 ? <p className="text-[12.5px] text-ink-2">{t(AV.noDocs)}</p> : <div className={`grid gap-3 ${r.docs.length > 1 ? "sm:grid-cols-2" : ""}`}>{r.docs.map((d, i) => { const [w, h] = docSize(d); const S = DOC_SLOTS[d.kind] || DOC_SLOTS.cert; return (
            <figure key={i} className="min-w-0">
              <button type="button" onClick={() => setZoom(i)} onContextMenu={(e) => e.preventDefault()} aria-label={`${t(S.title)} — ${t(AV.zoom)}`} className="relative block w-full overflow-hidden rounded-xl border border-line bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <img src={docSrc(r, i)} alt="" draggable={false} className="block w-full h-auto select-none pointer-events-none" style={{ aspectRatio: `${w} / ${h}` }} />
                <Watermark id={r.id} /><span className="absolute bottom-2 end-2 inline-flex items-center gap-1 h-7 px-2 rounded-full bg-elevated/90 border border-line text-ink text-[11px]"><ZoomIn size={13} /> {t(AV.zoom)}</span>
              </button>
              <figcaption className="mt-1 text-[11.5px] text-ink-2">{t(S.title)}{d.pdf ? " · PDF" : ""}{d.demo || d.sample ? <span className="text-ink-3"> · {t(AV.sample)}</span> : null}</figcaption>
            </figure>); })}</div>}
        </Panel>
        <Panel className="p-4">
          <PanelHead icon={ListChecks} title={t(AV.check)} />
          <div className="space-y-1.5">{checks0.map(([k, l]: any) => <label key={k} className="flex items-start gap-2.5 min-h-10 p-2 rounded-xl border border-line text-[12.5px] leading-snug cursor-pointer hover:border-line-3"><input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" /><span>{t(l)}</span></label>)}</div>
          {eng && <div className="mt-3 space-y-3">
            <div><p className="text-[12px] text-ink-2 mb-1.5">{t(AV.divPick)}</p><div role="radiogroup" aria-label={t(AV.divPick)} className="flex flex-wrap gap-1.5">{DIVISIONS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={div === x.id} onClick={() => setDiv(x.id)} className={`press h-9 px-3 rounded-full border text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${div === x.id ? "bg-wash border-accent/40 text-ink" : "bg-surface border-line-2 text-ink-2 hover:text-ink"}`}>{trx(x.short)}</button>)}</div></div>
            <label className="block max-w-[14rem]"><span className="block text-[12px] text-ink-2 mb-1.5">{t(AV.yearPick)}</span><input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" dir="ltr" aria-invalid={!yearOk || undefined} className={`w-full h-11 px-3 rounded-xl bg-canvas border ${yearOk ? "border-line-2" : "border-bad/60"} font-grotesk text-[14px] focus:outline-none focus:ring-2 focus:ring-accent`} />{!yearOk && <span className="mt-1 block text-[11px] text-bad">{t(AV.yearBad)}</span>}</label>
            {both && <div><p className="text-[12px] text-ink-2 mb-1.5">{t(AV.credPick)}</p><Choice label={t(AV.credPick)} value={kind} onChange={setKind} items={[["syndicate", t(AV.credCard)], ["certificate", t(AV.credCert)]]} /></div>}
          </div>}
          <p className="mt-3 text-[11px] text-ink-3">{t(AV.checkNote)}</p>
        </Panel>
        <Panel className="p-4">
          <PanelHead icon={Gavel} title={t(AV.decide)} />
          {!rejecting ? <div className="flex gap-2 flex-wrap"><Primary disabled={!allChecked || !yearOk} onClick={() => A.decideVerify(r, { approve: true, division: eng ? div : null, gradYear: eng ? Number(year) : null, kind: eng ? (both ? kind : (r.kinds || []).includes("card") ? "syndicate" : "certificate") : "certificate" })} className="h-11 text-[13px] press"><BadgeCheck size={16} /> {t(AV.approve)}</Primary><Secondary onClick={() => setRejecting(true)} className="h-11 text-[13px] text-bad"><CircleX size={15} /> {t(AV.reject)}</Secondary></div>
            : <div className="space-y-2.5">
              <p className="text-[12px] text-ink-2">{t(AV.rejectWhy)}</p>
              <div role="radiogroup" aria-label={t(AV.rejectWhy)} className="space-y-1.5">{VERIFY_REJECT.filter(([id]: any) => id !== "expired" || (r.kinds || []).includes("card")).map(([id, l]: any) => <button key={id} type="button" role="radio" aria-checked={reason === id} onClick={() => setReason(id)} className={`press w-full min-h-10 px-3 py-2 rounded-xl border text-start text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${reason === id ? "bg-bad/10 border-bad/40" : "border-line-2 hover:border-line-3"}`}>{t(l)}</button>)}</div>
              <label className="block"><span className="block text-[12px] text-ink-2 mb-1.5">{t(reason === "other" ? AV.rejectNoteReq : AV.rejectNote)}</span><textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 240))} rows={2} placeholder={t(AV.rejectPh)} className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" /></label>
              <div className="flex gap-2 flex-wrap"><Primary disabled={!reason || (reason === "other" && note.trim().length < 5)} onClick={() => A.decideVerify(r, { approve: false, reason, note: note.trim() })} className="h-11 text-[13px] !bg-bad !text-white"><Trash2 size={15} /> {t(AV.confirmReject)}</Primary><Secondary onClick={() => { setRejecting(false); setReason(null); }} className="h-11 text-[13px]">{t(AV.cancel)}</Secondary></div>
            </div>}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3 flex items-start gap-1.5"><Trash2 size={12} className="shrink-0 mt-0.5" />{t(AV.purgeNote)}</p>
        </Panel>
      </> : <Panel className="p-4">
        <PanelHead icon={ScrollText} title={t(AV.record)} />
        <dl className="grid grid-cols-2 gap-x-4 text-[11.5px]">{[[t(AV.by), t(AV.who[dc.by] || AV.who.team)], [t(AV.at), dc.at ? whenIn(lang, dc.at) : r.purgedAt ? whenIn(lang, r.purgedAt) : "—"], r.status === "approved" && dc.kind && [t(AV.credential), t(credentialL2(r.role, dc.kind))], r.status === "approved" && dc.division && divOf(dc.division) && [t(AV.division), trx(divOf(dc.division).label)], r.status === "approved" && dc.gradYear && [t(AV.grad), <Num>{dc.gradYear}</Num>], r.status === "rejected" && dc.reason && [t(AV.reason), t(rejectOf(dc.reason))], [t(AV.docsWere), (r.kinds || []).map((k) => t((DOC_SLOTS[k] || DOC_SLOTS.cert).short)).join(" + ") || "—"]].filter(Boolean).map(([k, v]: any) => <div key={k} className="flex justify-between gap-2 border-b border-line py-1.5"><dt className="text-ink-3 shrink-0">{k}</dt><dd className="text-ink text-end leading-snug">{v}</dd></div>)}</dl>
        {dc.note && <p className="mt-2 text-[12px] leading-relaxed"><span className="text-ink-3">{t(AV.note)}: </span>{dc.note}</p>}
        <p className="mt-3 p-2.5 rounded-xl bg-good/10 border border-good/20 text-[12px] text-good flex items-center gap-1.5"><Trash2 size={13} className="shrink-0" />{r.purged ? AV.purged(r.purged, r.purgedAt ? whenIn(lang, r.purgedAt) : "—", en) : t(AV.noDocs)}</p>
      </Panel>}
      {zoom != null && r.docs[zoom] && <DocZoom r={r} i={zoom} t={t} onClose={() => setZoom(null)} />}
    </div>
  );
}
