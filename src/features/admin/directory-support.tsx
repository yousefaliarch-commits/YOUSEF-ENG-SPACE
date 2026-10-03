// =====================================================================
//  Admin console: the member directory and support tickets.
//  · Directory (admins only): who each member is — name, e-mail, phone, role, level, place, join date, sign-in methods,
//    the verification audit (documents are deleted at the decision; only the record remains) and PUBLIC activity. It is
//    keyed by the member's public id and never shows the moderation reference anonymous reports carry, so an admin cannot
//    look up who wrote an anonymous item. «إرسال رسالة» opens a thread in Messages, signed «فريق EngSpace».
//  · Support tickets (all staff): every ticket, filtered by status; read, reply (the member is notified), set the status.
//  The demo shows the same screens on demo data (and on tickets opened in this browser).
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, LifeBuoy, Mail, MessageCircle, Phone, Send, Users } from "lucide-react";
import * as cloud from "../../backend/cloud";
import { govName, placeName } from "../../data/geo";
import { posLabel, roleTitle } from "../../domain/taxonomy";
import { UGC } from "../../i18n/i18n";
import { storeFor, useStore } from "../../lib/runtime";
import { Empty } from "../../ui/chrome";
import { FilterChip, Num, Panel, Primary, Secondary } from "../../ui/primitives";
import { StatusChip, TICKET_STATUS, catName, when } from "../support/support";
import { Choice, PanelHead, SearchBox, ToneChip } from "./kit";

const day = (t?: any) => { if (!t) return "—"; const d = new Date(t); return isNaN(+d) ? "—" : `${when(t)} ${d.getFullYear()}`; };
const STAFF: [string, string][] = [["member", "عضو"], ["moderator", "مشرف"], ["admin", "مسؤول"]];
const VSTATUS: Record<string, [string, string]> = { pending: ["قيد المراجعة", "warn"], approved: ["موثّق", "good"], rejected: ["مرفوض", "bad"], withdrawn: ["سُحب", "default"], expired: ["انتهت المهلة", "default"] };

// the demo's directory: the demo members the console already knows, with demo contact details
const demoDirectory = (A: any) => (A.accounts || []).filter((a: any) => a.name).slice(0, 40).map((a: any, i: number) => ({
  pid: a.pid || a.id, name: a.name, email: `member${i + 1}@example.com`, phone: null, role: a.role || "engineer", staff: a.staff || "member", disc: a.disc, pos: a.pos, gov: a.gov, city: a.city,
  created_at: Date.now() - (i + 3) * 86400000 * 9, last_sign_in_at: Date.now() - i * 3600000, sign_in: "email", verified: !!a.verified, verify_kind: a.verifyKind, division: a.division,
  verification: a.verified ? { status: "approved", decided_at: Date.now() - 86400000 * 20, kind: a.verifyKind || "syndicate", reviewer: "مدير المنصة", documents_deleted_at: Date.now() - 86400000 * 20 } : null,
  public_posts: a.posts || 0, public_comments: a.comments || 0, public_reviews: 0 }));

export function DirectorySection({ A }: any) {
  const isAdmin = !A.cloud || (A.profile && A.profile.staff === "admin");
  const [q, setQ] = useState<any>(""); const [rows, setRows] = useState<any>(null); const [sel, setSel] = useState<any>(null);
  const load = (s?: any) => (A.cloud ? cloud.admin.directory(s || null).then(setRows, (e) => A.toast(e.message)) : Promise.resolve(setRows(demoDirectory(A))));
  useEffect(() => { if (isAdmin) load(); }, []);
  useEffect(() => { if (!A.cloud || !isAdmin) return; const t = setTimeout(() => load(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const list = useMemo(() => (rows || []).filter((r: any) => A.cloud || !q.trim() || [r.name, r.email, r.pid].some((x) => String(x || "").includes(q.trim()))), [rows, q]);
  if (!isAdmin) return <Panel className="p-5"><Empty icon={Users} title="للمسؤولين فقط" body="دليل الأعضاء يعرض بيانات الحسابات الكاملة، ولذلك يقتصر على المسؤولين." /></Panel>;
  if (sel) return <MemberDetail A={A} m={sel} back={() => setSel(null)} onChanged={() => load(q.trim())} />;
  return (
    <div className="space-y-4">
      <Panel className="p-4"><PanelHead icon={Users} title="دليل الأعضاء"><span className="text-[11.5px] text-ink-3"><Num>{list.length}</Num> عضو</span></PanelHead>
        <p className="text-[11.5px] text-ink-2 leading-relaxed mb-3">البيانات الكاملة لكل حساب. الدليل لا يربط أي عضو بمنشوراته المجهولة — هذه تبقى مجهولة حتى عن الإدارة، كما وعدنا الأعضاء.</p>
        <div className="flex"><SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو البريد أو الهاتف" /></div></Panel>
      {/* minmax(0, 1fr): a long e-mail may not stretch the column past the screen (it was cut off on the left of the phone) */}
      {rows == null ? <p className="text-[12px] text-ink-3">جارٍ التحميل…</p> : list.length === 0 ? <Empty icon={Users} title="لا نتائج" body="جرّب اسمًا أو بريدًا آخر." /> : (
        <div className="grid gap-2 grid-cols-[minmax(0,1fr)] md:grid-cols-2">{list.map((m: any) => (
          <button key={m.pid} type="button" onClick={() => setSel(m)} className="press min-w-0 w-full p-3.5 rounded-2xl bg-surface border border-line text-start hover:border-line-3 transition-colors">
            <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[14px] font-medium"><bdi {...UGC}>{m.name}</bdi></span>
              <span className="flex items-center gap-1.5 shrink-0">{m.staff !== "member" && <ToneChip tone="accent">{(STAFF.find((s) => s[0] === m.staff) || [, m.staff])[1]}</ToneChip>}{m.verified && <BadgeCheck size={15} className="text-good" />}</span></div>
            <p className="mt-1 text-[11.5px] text-ink-2 truncate text-start" dir="ltr">{m.email || m.phone || "—"}</p>
            <p className="mt-0.5 text-[11px] text-ink-3 truncate">{roleTitle(m.role)}{m.pos ? ` · ${posLabel(m.pos)}` : ""}{m.gov ? ` · ${placeName(m.gov, m.city)}` : ""} · انضم {day(m.created_at)}</p>
          </button>))}</div>)}
    </div>
  );
}

function MemberDetail({ A, m, back, onChanged }: any) {
  const [items, setItems] = useState<any>(null); const [text, setText] = useState<any>(""); const [busy, setBusy] = useState(false); const [staff, setStaff] = useState<any>(m.staff);
  useEffect(() => { if (A.cloud) cloud.admin.publicItems(m.pid).then(setItems, () => setItems([])); else setItems([]); }, [m.pid]);
  const v = m.verification; const [vl, vt] = v ? VSTATUS[v.status] || [v.status, "default"] : ["لم يطلب التوثيق", "default"];
  const send = async () => {
    if (!text.trim()) return; setBusy(true);
    try { if (!A.cloud) { A.toast("الرسائل من الإدارة تعمل على المنصة الحية"); setBusy(false); return; } const t = await cloud.admin.message(m.pid, text.trim()); setText(""); A.toast("أُرسلت الرسالة باسم «فريق EngSpace»"); A.openApp({ type: "chat", id: t }); }
    catch (e: any) { A.toast(e.message); }
    setBusy(false);
  };
  const setRole = async (s?: any) => { try { if (A.cloud) await cloud.admin.setStaffByPid(m.pid, s); setStaff(s); A.toast("حُدّثت الصلاحية"); onChanged(); } catch (e: any) { A.toast(e.message); } };
  const Row = ({ k, v: val, ltr = false }: any) => <div className="flex justify-between gap-3 py-2 border-b border-line last:border-0 text-[12.5px]"><dt className="text-ink-3 shrink-0">{k}</dt><dd className="text-ink text-end min-w-0 break-words" dir={ltr ? "ltr" : undefined}>{val || "—"}</dd></div>;
  return (
    <div className="space-y-4">
      <Secondary onClick={back} className="h-9 px-3 text-[12.5px]">→ رجوع للدليل</Secondary>
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-[18px] font-medium leading-snug"><bdi {...UGC}>{m.name}</bdi></h2><p className="mt-0.5 text-[12px] text-ink-2">{roleTitle(m.role)}{m.pos ? ` · ${posLabel(m.pos)}` : ""}</p></div>{m.verified && <ToneChip tone="good"><BadgeCheck size={12} /> موثّق</ToneChip>}</div>
        <dl className="mt-3">
          <Row k={<span className="inline-flex items-center gap-1"><Mail size={12} /> البريد</span>} v={m.email} ltr /><Row k={<span className="inline-flex items-center gap-1"><Phone size={12} /> الهاتف</span>} v={m.phone ? "+" + String(m.phone).replace(/^\+/, "") : null} ltr />
          <Row k="المكان" v={m.gov ? placeName(m.gov, m.city) : null} /><Row k="الشركة" v={m.company_name} /><Row k="النوع / العمر" v={[m.gender === "female" ? "أنثى" : m.gender ? "ذكر" : null, m.age].filter(Boolean).join(" · ")} /><Row k="سنة التخرج" v={m.grad_year} />
          <Row k="تاريخ الانضمام" v={day(m.created_at)} /><Row k="آخر دخول" v={day(m.last_sign_in_at)} /><Row k="طريقة الدخول" v={m.sign_in} ltr /><Row k="المعرّف العلني" v={m.pid} ltr />
        </dl>
      </Panel>
      <Panel className="p-4"><PanelHead icon={BadgeCheck} title="سجل التوثيق"><ToneChip tone={vt}>{vl}</ToneChip></PanelHead>
        {v ? <dl><Row k="الطلب" v={v.ref} ltr /><Row k="المستند" v={v.kind === "certificate" ? "شهادة تخرج" : v.kind === "syndicate" ? "كارنيه النقابة" : (v.kinds || []).join(" + ")} /><Row k="الشعبة" v={m.division || v.division} /><Row k="تاريخ القرار" v={day(v.decided_at)} /><Row k="المراجِع" v={v.reviewer} /><Row k="حذف المستندات" v={v.documents_deleted_at ? `حُذفت ${day(v.documents_deleted_at)}` : v.status === "pending" ? "تُحذف عند القرار" : "—"} /></dl>
          : <p className="text-[12px] text-ink-3">لا طلب توثيق.</p>}
        <p className="mt-2 text-[10.5px] text-ink-3">المستندات نفسها لا تُحفظ: تُحذف فور القرار، ويبقى هذا السجل فقط.</p></Panel>
      <Panel className="p-4"><PanelHead icon={Users} title="النشاط العلني" />
        <div className="grid grid-cols-3 gap-2 text-center">{[["منشورات", m.public_posts], ["ردود", m.public_comments], ["تقييمات شركات", m.public_reviews]].map(([k, n]: any) => <div key={k} className="p-2.5 rounded-xl bg-canvas/60 border border-line"><Num className="block text-[18px] font-semibold">{n || 0}</Num><span className="text-[10.5px] text-ink-3">{k}</span></div>)}</div>
        {items && items.length > 0 && <ul className="mt-3 space-y-1.5">{items.slice(0, 20).map((x: any) => <li key={x.id}><button type="button" onClick={() => A.openApp({ type: "post", id: x.kind === "post" ? x.id : undefined })} disabled={x.kind !== "post"} className="w-full text-start p-2.5 rounded-xl bg-canvas/60 border border-line text-[12.5px] leading-snug"><span className="text-[10.5px] text-ink-3">{x.kind === "post" ? "منشور" : "رد"} · {day(x.created_at)}</span><span className="block line-clamp-2"><bdi {...UGC}>{x.text}</bdi></span></button></li>)}</ul>}
        <p className="mt-2 text-[10.5px] text-ink-3">ما نشره باسمه فقط. المشاركات المجهولة لا تُنسب لأحد في لوحة الإدارة.</p></Panel>
      <Panel className="p-4"><PanelHead icon={MessageCircle} title="إرسال رسالة" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="تصل في «الرسائل» عند العضو باسم «فريق EngSpace»" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] leading-[1.8] focus:outline-none focus:ring-2 focus:ring-accent" />
        <Primary onClick={send} disabled={!text.trim() || busy} className="w-full h-11 mt-2 press"><Send size={15} className="rtl:-scale-x-100" /> إرسال رسالة</Primary></Panel>
      <Panel className="p-4"><PanelHead title="صلاحية الإدارة" /><Choice label="صلاحية الإدارة" value={staff} onChange={(s) => s !== staff && setRole(s)} items={STAFF} /></Panel>
    </div>
  );
}

// ---------------- support tickets ----------------
export function TicketsSection({ A }: any) {
  const [demo, setDemo] = useStore(storeFor("app"), "tickets", []); const [rows, setRows] = useState<any>(null); const [st, setSt] = useState<any>("active"); const [sel, setSel] = useState<any>(null);
  const load = () => (A.cloud ? cloud.admin.tickets(null).then(setRows, (e) => A.toast(e.message)) : Promise.resolve());
  useEffect(() => { load(); }, []);
  const all = A.cloud ? rows : (demo || []).map((t: any) => ({ ...t, member_name: t.member || "عضو تجريبي", member_email: "member@example.com", messages: (t.messages || []).length, last_from_staff: (t.messages || []).slice(-1)[0]?.from_staff }));
  const list = (all || []).filter((t: any) => (st === "active" ? t.status !== "closed" : st === "all" ? true : t.status === st));
  if (sel) return <TicketDetail A={A} t={(all || []).find((x: any) => x.id === sel) || { id: sel }} back={() => { setSel(null); load(); }} demo={demo} setDemo={setDemo} />;
  const counts: any = {}; (all || []).forEach((t: any) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  return (
    <div className="space-y-4">
      <Panel className="p-4"><PanelHead icon={LifeBuoy} title="تذاكر الدعم"><span className="text-[11.5px] text-ink-3">مفتوحة <Num>{counts.open || 0}</Num> · قيد المراجعة <Num>{counts.review || 0}</Num></span></PanelHead>
        <div className="flex flex-wrap gap-1.5">{[["active", "النشطة"], ...Object.entries(TICKET_STATUS).map(([k, [l]]) => [k, l]), ["all", "الكل"]].map(([k, l]: any) => <FilterChip key={k} on={st === k} onClick={() => setSt(k)}>{l}{counts[k] ? ` (${counts[k]})` : ""}</FilterChip>)}</div></Panel>
      {all == null ? <p className="text-[12px] text-ink-3">جارٍ التحميل…</p> : list.length === 0 ? <Empty icon={LifeBuoy} title="لا تذاكر هنا" body="عندما يفتح عضو تذكرة تظهر في هذه القائمة." /> : (
        <div className="space-y-2">{list.map((t: any) => (
          <button key={t.id} type="button" onClick={() => setSel(t.id)} className="press w-full p-3.5 rounded-2xl bg-surface border border-line text-start">
            <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[13.5px] font-medium"><bdi {...UGC}>{t.subject}</bdi></span><StatusChip s={t.status} /></div>
            <p className="mt-1 text-[11.5px] text-ink-3 truncate">{t.ref} · {catName(t.category)} · <bdi {...UGC}>{t.member_name}</bdi> · <Num>{t.messages}</Num> رسائل{t.last_from_staff === false && t.status !== "closed" ? " · بانتظار الرد" : ""}</p>
          </button>))}</div>)}
    </div>
  );
}

function TicketDetail({ A, t, back, demo, setDemo }: any) {
  const [msgs, setMsgs] = useState<any>(A.cloud ? null : (demo.find((x: any) => x.id === t.id) || {}).messages || []); const [text, setText] = useState<any>(""); const [status, setStatus] = useState<any>(t.status); const [urls, setUrls] = useState<any>({}); const [busy, setBusy] = useState(false);
  const load = () => cloud.ticketMessages(t.id).then((m) => { setMsgs(m); m.filter((x: any) => x.attachment).forEach((x: any) => cloud.supportFileUrl(x.attachment).then((u) => setUrls((o: any) => ({ ...o, [x.attachment]: u })), () => {})); });
  useEffect(() => { if (A.cloud) load().catch((e) => A.toast(e.message)); }, [t.id]);
  const reply = async (next = "answered") => {
    if (!text.trim()) return; setBusy(true);
    try {
      if (A.cloud) { await cloud.admin.replyTicket(t.id, text.trim(), next); await load(); }
      else { const m = { id: "s" + Date.now(), from_staff: true, body: text.trim(), created_at: Date.now() }; setDemo((l: any) => l.map((x: any) => (x.id === t.id ? { ...x, status: next, messages: [...x.messages, m] } : x))); setMsgs((x: any) => [...x, m]); }
      setStatus(next); setText(""); A.toast("أُرسل الرد — وصل العضو إشعار");
    } catch (e: any) { A.toast(e.message); }
    setBusy(false);
  };
  const setS = async (s?: any) => { try { if (A.cloud) await cloud.admin.setTicketStatus(t.id, s); else setDemo((l: any) => l.map((x: any) => (x.id === t.id ? { ...x, status: s } : x))); setStatus(s); } catch (e: any) { A.toast(e.message); } };
  return (
    <div className="space-y-4">
      <Secondary onClick={back} className="h-9 px-3 text-[12.5px]">→ رجوع للتذاكر</Secondary>
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-2"><h2 className="min-w-0 text-[17px] font-medium leading-snug"><bdi {...UGC}>{t.subject}</bdi></h2><StatusChip s={status} /></div>
        <p className="mt-1 text-[11.5px] text-ink-3">{t.ref} · {catName(t.category)} · <bdi {...UGC}>{t.member_name}</bdi> · <span dir="ltr">{t.member_email}</span></p>
        <div className="mt-3"><Choice label="الحالة" value={status} onChange={setS} items={Object.entries(TICKET_STATUS).map(([k, [l]]) => [k, l])} /></div>
      </Panel>
      <div className="space-y-2">{msgs == null ? <p className="text-[12px] text-ink-3">جارٍ التحميل…</p> : msgs.map((m: any) => { const src = m.image || (m.attachment && urls[m.attachment]); return (
        <div key={m.id} className={`flex ${m.from_staff ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] p-3 rounded-2xl text-[13.5px] leading-relaxed ${m.from_staff ? "bg-wash border border-accent/20" : "bg-surface border border-line"}`}>
          <p className="text-[10.5px] text-ink-3 mb-1">{m.from_staff ? "فريق الدعم" : "العضو"} · {day(m.created_at)}</p><p className="whitespace-pre-wrap"><bdi {...UGC}>{m.body}</bdi></p>{src && <img src={src} alt="" className="mt-2 max-h-56 rounded-xl border border-line" />}</div></div>); })}</div>
      {status !== "closed" && <Panel className="p-4">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="ردّك على العضو — يصله إشعار" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] leading-[1.8] focus:outline-none focus:ring-2 focus:ring-accent" />
        <div className="mt-2 flex gap-2 flex-wrap"><Primary onClick={() => reply("answered")} disabled={!text.trim() || busy} className="flex-1 h-11 press"><Send size={15} className="rtl:-scale-x-100" /> إرسال الرد</Primary><Secondary onClick={() => reply("closed")} disabled={!text.trim() || busy} className="h-11 px-3">ردّ وأغلق</Secondary></div>
      </Panel>}
    </div>
  );
}
