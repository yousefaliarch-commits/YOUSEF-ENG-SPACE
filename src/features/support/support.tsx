// =====================================================================
//  Contact support — «تواصل مع الإدارة». A member opens a ticket (category, subject, message, optional image), follows
//  its status (مفتوحة · قيد المراجعة · تم الرد · مغلقة) and talks with the support team inside it. Live: public.support_tickets
//  / ticket_messages (own tickets only, by RLS; the image in the member's own folder of the private «support» bucket).
//  Demo: the same screens on this device's store, which the demo admin console reads too.
// =====================================================================
import { useEffect, useState } from "react";
import { ImagePlus, LifeBuoy, Plus, Send, X } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { UGC } from "../../i18n/i18n";
import { storeFor, useStore } from "../../lib/runtime";
import { imageError, processImage, useImagePicker } from "../../lib/media";
import { Empty, SectionTitle, TextInput } from "../../ui/chrome";
import { Chip, FilterChip, Panel, Primary, Secondary } from "../../ui/primitives";

export const TICKET_CATS: [string, string][] = [["account", "الحساب"], ["salary", "بيانات الرواتب"], ["technical", "مشكلة تقنية"], ["verification", "التوثيق"], ["other", "أخرى"]];
export const TICKET_STATUS: Record<string, [string, string]> = { open: ["مفتوحة", "accent"], review: ["قيد المراجعة", "warn"], answered: ["تم الرد", "good"], closed: ["مغلقة", "neutral"] };
export const catName = (c?: string) => (TICKET_CATS.find((x) => x[0] === c) || [, "أخرى"])[1];
export const StatusChip = ({ s }: any) => { const [l, tone] = TICKET_STATUS[s] || TICKET_STATUS.open; return <Chip tone={tone === "neutral" ? undefined : tone} className="h-6 px-2 text-[10.5px] shrink-0">{l}</Chip>; };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// the app writes numbers in Western digits everywhere; dates follow
export const when = (t?: any) => { const d = new Date(t); return isNaN(+d) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const dataUrlBlob = (u: string) => { const [h, b] = u.split(","); const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (h.match(/data:([^;]+)/) || [, "image/jpeg"])[1] }); };

// the demo keeps tickets in the shared app store (the demo console reads the same list)
const useDemoTickets = () => useStore(storeFor("app"), "tickets", []);

function useTickets(app?: any) {
  const [demo, setDemo] = useDemoTickets(); const [live, setLive] = useState<any>(null);
  const reload = () => cloud.myTickets().then(setLive, (e) => app.toast(e.message));
  useEffect(() => { if (isCloud()) reload(); }, []);
  return { list: isCloud() ? live : demo, reload, setDemo };
}

function ImagePick({ img, setImg, app }: any) {
  const [input, pick] = useImagePicker(async (f?: any) => { try { setImg(await processImage(f)); } catch (e) { app.toast(imageError(e)); } });
  return (<>{input}{img ? <div className="relative inline-block"><img src={img.src} alt="" className="h-20 rounded-xl border border-line" /><button type="button" aria-label="إزالة الصورة" onClick={() => setImg(null)} className="absolute -top-2 -end-2 grid place-items-center w-6 h-6 rounded-full bg-elevated border border-line-2"><X size={12} /></button></div>
    : <Secondary onClick={pick} className="h-10 px-3 text-[12.5px] press"><ImagePlus size={15} /> إرفاق صورة (اختياري)</Secondary>}</>);
}

export function SupportScreen({ app }: any) {
  const { list, reload, setDemo } = useTickets(app); const [form, setForm] = useState(false);
  const [cat, setCat] = useState<any>("account"); const [subject, setSubject] = useState<any>(""); const [body, setBody] = useState<any>(""); const [img, setImg] = useState<any>(null); const [busy, setBusy] = useState(false);
  const ok = subject.trim().length >= 3 && body.trim().length >= 10;
  const send = async () => {
    if (!ok) return; setBusy(true);
    try {
      if (isCloud()) { const id = await cloud.openTicket({ category: cat, subject: subject.trim(), body: body.trim(), image: img ? img.blob || dataUrlBlob(img.src) : null }); await reload(); app.push({ type: "ticket", id }); }
      else { const id = "t" + Date.now(); setDemo((l: any) => [{ id, ref: "T-" + id.slice(-6).toUpperCase(), category: cat, subject: subject.trim(), status: "open", created_at: Date.now(), updated_at: Date.now(), member: app.profile.name, messages: [{ id: id + "m", from_staff: false, body: body.trim(), image: img && img.src, created_at: Date.now() }] }, ...(l || [])]); app.push({ type: "ticket", id }); }
      setForm(false); setSubject(""); setBody(""); setImg(null); app.toast("وصلت تذكرتك — سنرد عليك هنا وسيصلك إشعار");
    } catch (e: any) { app.toast(e.message); }
    setBusy(false);
  };
  return (
    <div className="py-4 space-y-4">
      <div className="px-1 flex items-start gap-3"><span className="grid place-items-center w-11 h-11 shrink-0 rounded-2xl bg-wash text-accent"><LifeBuoy size={20} /></span><div className="min-w-0"><h1 className="text-[21px] font-medium leading-tight">تواصل مع الإدارة</h1><p className="mt-0.5 text-[12px] text-ink-2 leading-relaxed">مشكلة في حسابك أو بياناتك أو التوثيق؟ افتح تذكرة وتابع الرد هنا. لا يراها إلا فريق الدعم.</p></div></div>
      {!form ? <Primary onClick={() => setForm(true)} className="w-full h-12 press"><Plus size={17} /> تذكرة جديدة</Primary> : (
        <Panel className="p-4 space-y-3">
          <div><p className="text-[12px] text-ink-2 mb-1.5">التصنيف</p><div className="flex flex-wrap gap-1.5">{TICKET_CATS.map(([id, l]) => <FilterChip key={id} on={cat === id} onClick={() => setCat(id)}>{l}</FilterChip>)}</div></div>
          <label className="block"><span className="text-[12px] text-ink-2">الموضوع</span><TextInput value={subject} onChange={setSubject} placeholder="مثال: لا أستطيع تغيير بريدي" className="mt-1 h-11 w-full px-3 rounded-xl bg-canvas border border-line-2 text-[13.5px]" /></label>
          <label className="block"><span className="text-[12px] text-ink-2">التفاصيل</span><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="اكتب ما حدث وما تتوقعه — كلما كانت التفاصيل أوضح كان الرد أسرع." className="mt-1 w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] leading-[1.8] focus:outline-none focus:ring-2 focus:ring-accent" /></label>
          <ImagePick img={img} setImg={setImg} app={app} />
          <div className="flex gap-2"><Primary onClick={send} disabled={!ok || busy} className="flex-1 h-11 press"><Send size={15} className="rtl:-scale-x-100" /> {busy ? "جارٍ الإرسال…" : "إرسال"}</Primary><Secondary onClick={() => setForm(false)} className="h-11 px-4">إلغاء</Secondary></div>
          {!ok && <p className="text-[11px] text-ink-3">الموضوع 3 أحرف على الأقل والتفاصيل 10 أحرف على الأقل.</p>}
        </Panel>)}
      <section><SectionTitle>تذاكري</SectionTitle>
        {list == null ? <p className="text-[12px] text-ink-3 px-1">جارٍ التحميل…</p> : list.length === 0 ? <Empty icon={LifeBuoy} title="لا تذاكر بعد" body="عند فتح تذكرة تظهر هنا مع حالتها." />
          : <div className="space-y-2">{list.map((t: any) => <button key={t.id} type="button" onClick={() => app.push({ type: "ticket", id: t.id })} className="press w-full p-3.5 rounded-2xl bg-surface border border-line text-start">
            <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[13.5px] font-medium"><bdi {...UGC}>{t.subject}</bdi></span><StatusChip s={t.status} /></div>
            <p className="mt-1 text-[11.5px] text-ink-3">{t.ref} · {catName(t.category)} · {when(t.updated_at)}</p></button>)}</div>}
      </section>
    </div>
  );
}

export function TicketScreen({ app, id }: any) {
  const [demo, setDemo] = useDemoTickets(); const [live, setLive] = useState<any>(null); const [text, setText] = useState<any>(""); const [img, setImg] = useState<any>(null); const [busy, setBusy] = useState(false); const [urls, setUrls] = useState<any>({});
  const load = async () => { const [all, msgs] = await Promise.all([cloud.myTickets(), cloud.ticketMessages(id)]); setLive({ ...(all.find((t: any) => t.id === id) || {}), messages: msgs }); };
  useEffect(() => { if (isCloud()) load().catch((e) => app.toast(e.message)); }, [id]);
  useEffect(() => { if (!isCloud() || !live) return; live.messages.filter((m: any) => m.attachment && !urls[m.attachment]).forEach((m: any) => cloud.supportFileUrl(m.attachment).then((u) => setUrls((x: any) => ({ ...x, [m.attachment]: u })), () => {})); }, [live]);
  const t = isCloud() ? live : (demo || []).find((x: any) => x.id === id);
  if (!t) return isCloud() && !live ? <p className="py-6 text-center text-[12px] text-ink-3">جارٍ التحميل…</p> : <Empty icon={LifeBuoy} title="التذكرة غير موجودة" body="ربما حُذفت." action="رجوع" onAction={app.pop} />;
  const closed = t.status === "closed";
  const send = async () => {
    if (!text.trim()) return; setBusy(true);
    try {
      if (isCloud()) { await cloud.replyTicket(id, text.trim(), img ? img.blob || dataUrlBlob(img.src) : null); await load(); }
      else setDemo((l: any) => l.map((x: any) => (x.id === id ? { ...x, status: "open", updated_at: Date.now(), messages: [...x.messages, { id: "m" + Date.now(), from_staff: false, body: text.trim(), image: img && img.src, created_at: Date.now() }] } : x)));
      setText(""); setImg(null);
    } catch (e: any) { app.toast(e.message); }
    setBusy(false);
  };
  const close = async () => { try { if (isCloud()) { await cloud.closeTicket(id); await load(); } else setDemo((l: any) => l.map((x: any) => (x.id === id ? { ...x, status: "closed" } : x))); app.toast("أُغلقت التذكرة"); } catch (e: any) { app.toast(e.message); } };
  return (
    <div className="py-4 space-y-3">
      <div className="px-1"><div className="flex items-start justify-between gap-2"><h1 className="min-w-0 text-[18px] font-medium leading-snug"><bdi {...UGC}>{t.subject}</bdi></h1><StatusChip s={t.status} /></div><p className="mt-1 text-[11.5px] text-ink-3">{t.ref} · {catName(t.category)}</p></div>
      <div className="space-y-2">{(t.messages || []).map((m: any) => { const src = m.image || (m.attachment && urls[m.attachment]); return (
        <div key={m.id} className={`flex ${m.from_staff ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] p-3 rounded-2xl text-[13.5px] leading-relaxed ${m.from_staff ? "bg-wash border border-accent/20" : "bg-surface border border-line"}`}>
          <p className="text-[10.5px] text-ink-3 mb-1">{m.from_staff ? "فريق الدعم" : "أنت"} · {when(m.created_at)}</p><p className="whitespace-pre-wrap"><bdi {...UGC}>{m.body}</bdi></p>{src && <img src={src} alt="" className="mt-2 max-h-48 rounded-xl border border-line" />}</div></div>); })}</div>
      {closed ? <p className="text-center text-[12px] text-ink-3 py-2">هذه التذكرة مغلقة — افتح تذكرة جديدة إن احتجت.</p> : (
        <Panel className="p-3 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="أضف ردًا أو تفاصيل" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] leading-[1.8] focus:outline-none focus:ring-2 focus:ring-accent" />
          <ImagePick img={img} setImg={setImg} app={app} />
          <div className="flex gap-2"><Primary onClick={send} disabled={!text.trim() || busy} className="flex-1 h-11 press"><Send size={15} className="rtl:-scale-x-100" /> إرسال</Primary><Secondary onClick={close} className="h-11 px-3 text-[12.5px] whitespace-nowrap">إغلاق التذكرة</Secondary></div>
        </Panel>)}
    </div>
  );
}
