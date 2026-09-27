import { useRef, useState } from "react";
import {
  Award, Check, CircleAlert, CircleCheck, Copy, FileCheck, Flag, ImagePlus, LoaderCircle, LockKeyhole, Send, 
  ShieldAlert, ShieldCheck, Star, Timer, UserRound, X
} from "lucide-react";
import { CompanyLogo, POST_TYPES, ROOMS, company, logoSourceLabel } from "../../data/companies";
import { CITY_COUNT, DATASET, gov, placeName, rentFor } from "../../data/geo";
import { divOf } from "../../domain/division";
import { authorKey, authorOf, displayName, gx, isSelf, normalizeAuthor, pickAuthor, sameAuthor } from "../../domain/identity";
import { DISC, EMPLOYERS, EXP, POSITIONS, REP_LEVELS, ROLE, TITLES, can, canVerifyRole, dmRule, isCompanyRole, label, repLevel, trackLabel, tracksFor, yearsLabel } from "../../domain/taxonomy";
import { screenLanguage } from "../../domain/text-guard";
import { VerifyCenter } from "../verify/verify";
import { LevelRing, Money, egyptNet, marketFor, medianFor, personaExp, personaTitle, round500 } from "../../lib/helpers";
import { PHOTO_MAX, imageError, imageRatio, processImage, scanImageForMoney, useImagePicker } from "../../lib/media";
import { flatten } from "../../lib/posts";
import { characterName, specOf } from "../../ui/characters";
import { ContactHint, Field, GovPicker, LanguageGuard, Result, RoleBadge, TextInput } from "../../ui/chrome";
import { IdentityFace, IdentitySwitch, IdentityTag, TrustPolicy, copyText } from "../../ui/identity";
import { Back, Chip, FilterChip, Forward, Num, Primary, Quiet, Secondary, Toggle } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

// =====================================================================
//  Sheets — community
// =====================================================================
export function ContributeSheet({ app, payload = {} }: any) {
  const pr = app.profile; const [step, setStep] = useState(0); const d0 = pr.disc; const [as, setAs] = useState<any>(pr.identity === "public" ? "public" : "anon");
  const [f, setF] = useState<any>({ disc: payload.disc || d0, exp: payload.exp || personaExp(pr), gov: payload.gov || pr.gov, city: payload.city || pr.city || null, track: pr.track, employer: "contracting", title: "", salary: "", ok: false });
  const [err, setErr] = useState<any>(""); const [done, setDone] = useState(false); const up = (k?: any, v?: any) => { setF((s) => ({ ...s, [k]: v })); setErr(""); };
  const { p25, p50: median, p75 } = marketFor(f.disc, f.exp, f.gov, f.track, f.city);
  const next = () => { if (step === 1 && !f.title.trim()) { setErr("اكتب مسمّاك الوظيفي كما هو في عقدك."); return; } if (step === 2) { if (!(Number(f.salary) > 0)) { setErr("أدخل راتبًا شهريًا أكبر من صفر."); return; } if (!f.ok) { setErr("أكد أن القيمة تجريبية للمتابعة."); return; } setDone(true); app.contribute({ title: f.title.trim(), salary: Number(f.salary), disc: f.disc, exp: f.exp, gov: f.gov, city: f.city, track: f.track, employer: f.employer, company: payload.company || null, as }); return; } setStep(step + 1); };
  if (done) return (
    <div className="text-center flex flex-col items-center gap-3 py-2 pop-in"><CircleCheck size={44} className="text-good" /><h4 className="text-[19px] font-medium">تم. السوق مكشوف لك الآن.</h4>
      <p className="text-[13px] text-ink-2 max-w-[30ch]">راتبك <Num className="text-ink">{fmt(Number(f.salary))}</Num> ج.م {Number(f.salary) >= p25 && Number(f.salary) <= p75 ? "ضمن نطاق السوق" : Number(f.salary) > p75 ? "أعلى من الربع الأعلى للسوق" : "أقل من الربع الأدنى للسوق"} لهذه الخبرة. <span className="text-accent">+50 نقطة.</span> اكتملت المحاكاة محليًا ولم يُرسل شيء.</p>
      <p className="text-[12px] text-ink-2 inline-flex items-center gap-1.5 flex-wrap justify-center"><IdentityTag as={as} /> {as === "public" ? `نُسب الرقم لملفك العلني باسم ${displayName(authorOf(pr, "public"))}` : `نُسب الرقم لمعرّفك المجهول #${pr.anon} — لا يرتبط باسمك`}</p>
      <Primary onClick={() => { app.closeSheet(); app.goMarket("salaries"); }} className="w-full mt-1 press">{gx(pr.gender, "تصفّح الرواتب", "تصفّحي الرواتب")} <Forward /></Primary><Quiet onClick={app.closeSheet}>إغلاق</Quiet></div>
  );
  const steps: any = ["الخبرة", "الجهة", "الراتب"];
  return (
    <div>
      <ol className="flex items-center gap-2 mb-4" aria-label="الخطوات">{steps.map((s, i) => <li key={s} className="flex items-center gap-2 text-[11px]"><span className={`grid place-items-center w-6 h-6 rounded-full font-grotesk transition-colors ${i <= step ? "bg-accent text-on-accent" : "bg-elevated text-ink-3"}`}>{i < step ? <Check size={12} strokeWidth={3} /> : i + 1}</span><span className={i === step ? "text-ink" : "text-ink-3"}>{s}</span>{i < 2 && <span className="w-6 h-px bg-line-2" />}</li>)}</ol>
      <div key={step} className="screen-push">
        {step === 0 && <div className="space-y-4"><div><p className="text-[13px] mb-2">تخصّصك</p><div className="flex flex-wrap gap-2">{DISC.map(([id, l]: any) => <FilterChip key={id} on={f.disc === id} onClick={() => setF((s) => ({ ...s, disc: id, track: tracksFor(id).some((t) => t[0] === s.track) ? s.track : "site" }))}>{l}</FilterChip>)}</div></div><div><p className="text-[13px] mb-2">سنوات الخبرة</p><div className="flex flex-wrap gap-2">{EXP.map(([id, l]: any) => <FilterChip key={id} on={f.exp === id} onClick={() => up("exp", id)}>{l}</FilterChip>)}</div></div><p className="text-[11.5px] text-ink-3">نستخدم هذا لوضع رقمك في المقارنة الصحيحة. في الخطوة الأخيرة تختار: علنًا باسمك أو مجهولًا.</p></div>}
        {step === 1 && <div className="space-y-4"><div><p className="text-[13px] mb-2">المحافظة والمدينة</p><GovPicker gov={f.gov} city={f.city} onChange={(g, c) => setF((s) => ({ ...s, gov: g, city: c }))} /></div><div><p className="text-[13px] mb-2">المسار</p><div className="flex flex-wrap gap-2">{tracksFor(f.disc).map(([id]: any) => <FilterChip key={id} on={f.track === id} onClick={() => up("track", id)}>{trackLabel(id, f.disc)}</FilterChip>)}</div></div><div><p className="text-[13px] mb-2">نوع الجهة</p><div className="flex flex-wrap gap-2">{EMPLOYERS.map(([id, l]: any) => <FilterChip key={id} on={f.employer === id} onClick={() => up("employer", id)}>{l}</FilterChip>)}</div></div><div><label htmlFor="ctitle" className="block text-[13px] mb-2">المسمّى الوظيفي</label><TextInput id="ctitle" value={f.title} onChange={(v) => up("title", v)} placeholder={TITLES[f.disc][0]} /></div>{payload.company && <p className="text-[11.5px] text-ink-3">سيُربط الرقم بـ {company(payload.company)?.name} كشركة، دون أي بيانات تعرّفك.</p>}</div>}
        {step === 2 && <div className="space-y-3"><Field label="الراتب الإجمالي الشهري" value={f.salary} onChange={(v) => up("salary", v)} placeholder={fmt(median)} /><p className="text-[11px] text-ink-3">قبل الضرائب والاستقطاعات، دون مكافآت سنوية. المتوسط لمثل خبرتك في {placeName(f.gov, f.city)}: <Num className="text-ink-2">{fmt(median)}</Num> ج.م.</p><IdentitySwitch app={app} value={as} onChange={setAs} what="مشاركة الراتب" /><p className="text-[11px] text-ink-3 leading-snug">{as === "public" ? "علني: يظهر الرقم ومسمّاه في ملفك العلني باسمك، ويدخل المتوسطات." : "مجهول: يدخل المتوسطات ويُنسب لمعرّفك المجهول فقط — لا اسم ولا عمر ولا مدينة."}</p><label className="flex items-center gap-2.5 text-[12px] min-h-11"><input type="checkbox" checked={f.ok} onChange={(e) => up("ok", e.target.checked)} className="w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" />أستخدم قيمة تجريبية وأفهم أنها لن تُرسل.</label></div>}
      </div>
      <p role="alert" className="min-h-6 mt-2 text-[12px] text-bad">{err}</p>
      <div className="flex gap-2">{step > 0 && <Secondary onClick={() => { setStep(step - 1); setErr(""); }} className="h-12 px-4"><Back size={16} /></Secondary>}<Primary onClick={next} className="flex-1 h-12 press">{step === 2 ? "تأكيد المشاركة" : "التالي"} <Forward /></Primary></div>
    </div>
  );
}


export function ComposeSheet({ app, payload = {} }: any) {
  const pr = app.profile; const [as, setAs] = useState<any>(pr.identity === "public" ? "public" : "anon"); const [type, setType] = useState<any>("question"); const openRooms = app.rooms.filter((r) => r.id !== "ama" && !(app.config.closedRooms || {})[r.id]); const [roomId, setRoomId] = useState<any>(() => { const want = payload.room && !["all", "verified", "employers-any"].includes(payload.room) ? payload.room : (app.isCo ? "employers" : "tech"); return openRooms.some((r) => r.id === want) ? want : (openRooms[0] || ROOMS[0]).id; }); const [text, setText] = useState(payload.text || "");
  const [d, setD] = useState<any>({ title: TITLES[(app.isCo ? "civil" : pr.disc)][0], years: "", salary: "", company: "", q: "", opts: ["", "", ""] });
  // an optional image: re-encoded on the device, then read once for money figures (the result decides who may see it)
  const [img, setImg] = useState<any>(null); const [imgErr, setImgErr] = useState<any>(""); const [scan, setScan] = useState<any>(null); const scanTok = useRef(0);
  const [imgInput, pickImg] = useImagePicker(async (file) => { setImgErr(""); try { const im = await processImage(file); const tok = ++scanTok.current; setImg({ ...im, alt: "" }); setScan("running"); try { const r = await scanImageForMoney(im.src); if (scanTok.current === tok) setScan(r.money ? "money" : "clean"); } catch (e) { if (scanTok.current === tok) setScan("failed"); } } catch (e) { setImgErr(imageError(e)); } });
  const dropImg = () => { scanTok.current++; setImg(null); setScan(null); };
  const guard = screenLanguage(text + " " + d.q + " " + d.opts.join(" ") + " " + d.company);
  const valid = text.trim().length >= 10 && !guard.blocked && (type !== "reveal" || Number(d.salary) > 0) && (type !== "poll" || d.opts.filter((o) => o.trim()).length >= 2) && scan !== "running";
  const submit = () => {
    const post: any = { room: roomId, type, body: text.trim() };
    if (img) post.image = { src: img.src, w: img.w, h: img.h, tone: img.tone, alt: img.alt.trim().slice(0, 140), money: scan === "clean" ? false : scan === "money" ? true : null };
    if (type === "vote") post.vote = { yes: 0, no: 0, ends: "ينتهي بعد 24 ساعة" };
    if (type === "reveal") post.reveal = { title: d.title, years: Number(d.years) || 0, salary: Number(d.salary), company: d.company || "شركتي الحالية", employer: "—", verified: app.contributed, extras: "" };
    if (type === "poll") post.poll = { q: d.q || "إيه رأيكم؟", options: d.opts.filter((o) => o.trim()).map((o) => [o.trim(), 0]) };
    app.addPost(post, as); app.closeSheet(); app.toast(`${type === "reveal" ? "نُشر رقمك" : "نُشر منشورك"} ${as === "public" ? "باسمك" : "بمعرّفك المجهول"} — ${type === "reveal" ? "+15 نقطة" : "+5 نقاط"}`);
  };
  return (
    <div className="space-y-3">
      <IdentitySwitch app={app} value={as} onChange={setAs} what="هذا المنشور" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5">{POST_TYPES.filter(([id]: any) => (id !== "reveal" || can(pr, "reveal")) && (id !== "vote" || app.moneyAccess !== "none")).map(([id, l, I]: any) => <FilterChip key={id} on={type === id} onClick={() => setType(id)}><I size={12} />{l}</FilterChip>)}</div>
      <div><p className="text-[12px] text-ink-2 mb-1.5">الغرفة</p><div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5">{openRooms.map((r) => <FilterChip key={r.id} on={roomId === r.id} onClick={() => setRoomId(r.id)}><r.icon size={12} />{r.name}</FilterChip>)}</div></div>
      {type === "reveal" && <div className="grid grid-cols-2 gap-2"><input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="المسمّى" className="h-11 px-3 rounded-xl bg-canvas border border-line-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent" /><input dir="ltr" inputMode="decimal" type="number" value={d.years} onChange={(e) => setD({ ...d, years: e.target.value })} placeholder="سنوات الخبرة" className="h-11 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[13px] focus:outline-none focus:ring-2 focus:ring-accent" /><input value={d.company} onChange={(e) => setD({ ...d, company: e.target.value })} placeholder="الشركة (اختياري)" className="h-11 px-3 rounded-xl bg-canvas border border-line-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent" /><label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-canvas border border-line-2 focus-within:ring-2 focus-within:ring-accent"><input dir="ltr" inputMode="decimal" type="number" value={d.salary} onChange={(e) => setD({ ...d, salary: e.target.value })} placeholder="الراتب" className="w-full bg-transparent font-grotesk text-[14px] focus:outline-none" /><span className="text-[11px] text-ink-2">ج.م</span></label></div>}
      {type === "poll" && <div className="space-y-2"><input value={d.q} onChange={(e) => setD({ ...d, q: e.target.value })} placeholder="سؤال الاستطلاع" className="w-full h-11 px-3 rounded-xl bg-canvas border border-line-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent" />{d.opts.map((o, i) => <input key={i} value={o} onChange={(e) => setD({ ...d, opts: d.opts.map((x, k) => k === i ? e.target.value : x) })} placeholder={`خيار ${i + 1}`} className="w-full h-10 px-3 rounded-xl bg-canvas border border-line-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent" />)}{d.opts.length < 4 && <button type="button" onClick={() => setD({ ...d, opts: [...d.opts, ""] })} className="text-[12px] text-accent">+ خيار</button>}</div>}
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={4} placeholder={type === "vote" ? "اكتب العرض بالأرقام والناس تصوّت: أقبل ولا أرفض؟" : type === "reveal" ? "ليه بتنشر رقمك؟ إيه اللي فرق في آخر زيادة؟" : app.moneyAccess === "none" ? gx(pr.gender, "اسأل زملاءك عن شغل الموقع: تنفيذ، سلامة، استلامات، جدول…", "اسألي زميلاتك وزملاءك عن شغل الموقع: تنفيذ، سلامة، استلامات، جدول…") : gx(pr.gender, "اسأل عن مرتب، عرض، شركة، أو قرار مهني. الأرقام تساعد الناس تجاوبك.", "اسألي عن مرتب، عرض، شركة، أو قرار مهني. الأرقام تساعد الناس تجاوبك.")} className="w-full p-4 rounded-xl bg-canvas border border-line-2 text-[14.5px] leading-[1.8] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
      {imgInput}
      {!img ? <button type="button" onClick={pickImg} className="press w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-line-3 text-[13px] text-ink-2 hover:border-accent/40 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ImagePlus size={16} className="text-accent" /> إضافة صورة — اختياري</button>
        : <div className="pop-in rounded-xl border border-line-2 bg-canvas/60 p-2 space-y-2">
            <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: String(imageRatio(img)), background: img.tone }}><img src={img.src} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" /><button type="button" aria-label="إزالة الصورة" onClick={dropImg} className="absolute top-2 end-2 grid place-items-center w-9 h-9 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={16} /></button><span className="absolute bottom-2 start-2 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-black/55 text-white text-[10.5px] backdrop-blur-sm"><Num>{img.w}×{img.h}</Num> · <Num>{Math.max(1, Math.round(img.bytes / 1024))} KB</Num></span></div>
            <input value={img.alt} onChange={(e) => setImg({ ...img, alt: e.target.value.slice(0, 140) })} placeholder="وصف قصير للصورة — لمن يستخدم قارئ الشاشة (اختياري)" aria-label="وصف الصورة" className="w-full h-10 px-3 rounded-lg bg-canvas border border-line-2 text-[12.5px] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent" />
            <p className={`text-[11px] leading-relaxed flex items-start gap-1.5 ${scan === "money" || scan === "failed" ? "text-warn" : "text-ink-2"}`}>{scan === "running" ? <><LoaderCircle size={12} className="spin shrink-0 mt-0.5" /><span>نفحص الصورة على جهازك بحثًا عن أرقام مالية…</span></> : scan === "money" ? <><ShieldAlert size={12} className="shrink-0 mt-0.5" /><span>فيها أرقام مالية — لا تظهر لمشرفي المواقع، وتظهر لحسابات الشركات كإشعار بدل الصورة.</span></> : scan === "failed" ? <><CircleAlert size={12} className="shrink-0 mt-0.5" /><span>تعذّر فحص الصورة — ستُعامل كأنها فيها أرقام مالية.</span></> : <><CircleCheck size={12} className="shrink-0 mt-0.5 text-good" /><span>لا أرقام مالية في الصورة · أُزيلت منها بيانات الموقع والكاميرا.</span></>}</p>
            {as === "anon" && <p className="text-[11px] text-ink-3 leading-relaxed">منشور مجهول: تأكد أن الصورة لا تُظهر وجهك أو اسمك أو لافتة شركتك أو مكانًا يعرّفك.</p>}
          </div>}
      {imgErr && <p role="alert" className="text-[11.5px] text-bad">{imgErr}</p>}
      {as === "anon" && /(اسمي|أنا اسمي|my name)/i.test(text) && <p className="text-[11.5px] text-warn flex items-center gap-1.5"><CircleAlert size={13} /> يبدو أنك تكتب اسمًا في منشور مجهول — احذفه، أو انشر علنًا.</p>}
      <LanguageGuard text={text + " " + d.q + " " + d.opts.join(" ") + " " + d.company} /><ContactHint text={text} as={as} />
      <div className="flex items-center justify-between text-[11px] text-ink-3"><span className="inline-flex items-center gap-1.5">{as === "public" ? <><UserRound size={12} /> يُنشر باسمك وملفك العلني</> : <><LockKeyhole size={12} /> يُنشر بمعرّفك المجهول — لا يرتبط باسمك</>}</span><Num>{text.length}/500</Num></div>
      <Primary disabled={!valid} onClick={submit} className="w-full h-12 press">{as === "public" ? "نشر باسمك" : "نشر مجهولًا"} <Send size={16} className="rtl:-scale-x-100" /></Primary>
      {!valid && <p className="text-[11px] text-ink-3 text-center">{scan === "running" ? "لحظة — نفحص الصورة قبل النشر." : guard.blocked ? "عدّل اللغة غير اللائقة أولًا." : text.trim().length < 10 ? "اكتب 10 أحرف على الأقل." : type === "reveal" ? "أدخل الراتب بالرقم." : "أضف خيارين على الأقل للاستطلاع."}</p>}
    </div>
  );
}


export function ReviewSheet({ app, payload }: any) {
  const c = company(payload.company); const [stars, setStars] = useState(4); const [text, setText] = useState<any>(""); const guard = screenLanguage(text); const [as, setAs] = useState<any>(app.profile.identity === "public" ? "public" : "anon");
  return (<div><IdentitySwitch app={app} value={as} onChange={setAs} what={`تقييم ${c.name}`} className="mb-3" />
    <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="التقييم">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i} نجوم`} onClick={() => setStars(i)} className="press grid place-items-center w-11 h-11 rounded-full text-accent hover:bg-elevated"><Star size={22} fill={i <= stars ? "currentColor" : "none"} className={i <= stars ? "" : "text-ink-4"} /></button>)}</div>
    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="ما الذي يجب أن يعرفه مهندس قبل قبول عرض هنا؟ المرتب، الزيادات، الساعات، الاحترام." className="w-full p-4 rounded-xl bg-canvas border border-line-2 text-[14px] leading-[1.8] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
    <LanguageGuard text={text} className="mt-2" />
    <Primary disabled={text.trim().length < 10 || guard.blocked} onClick={() => { app.addReview(c.id, { ...authorOf(app.profile, as, repLevel(app.pts).i), when: "الآن", stars, text: text.trim(), mine: true }); app.closeSheet(); app.toast(`شكرًا — نُشر تقييمك ${as === "public" ? "باسمك" : "بمعرّفك المجهول"} · +15 نقطة`); }} className="w-full h-12 mt-3 press">{as === "public" ? "نشر التقييم باسمك" : "نشر التقييم مجهولًا"}</Primary>
    {text.trim().length < 10 && <p className="mt-1.5 text-[11px] text-ink-3 text-center">اكتب 10 أحرف على الأقل.</p>}</div>);
}


// Optional verification: the whole life of a request lives in VerifyCenter (_app_2e_verify)
export const VerifySheet = ({ app }: any) => <VerifyCenter app={app} />;

// A member profile shows ONE identity: the public profile (name, full details, public items only) or the anonymous one
// (hash, high-level role, anonymous items only). Nothing here links one to the other.
export function UserSheet({ app, payload }: any) {
  const a = normalizeAuthor(payload || {}); const pub = a.as === "public"; const mine = isSelf(a, app.profile); const role = a.userRole || "engineer"; const verified = a.verified !== false;
  const byThis = (x?: any) => sameAuthor(normalizeAuthor(x), a); const posts = app.posts.filter(byThis).length; const replies = app.posts.reduce((n, p) => n + flatten(p.comments).filter(byThis).length, 0);
  const level = a.level || 0; const lv = REP_LEVELS[Math.min(level, REP_LEVELS.length - 1)][0];
  const dmOpen = a.dm !== undefined ? a.dm !== false : app.posts.some((p) => (byThis(p) && p.dm) || flatten(p.comments).some((c) => byThis(c) && c.dm)) || app.threads.some((t) => sameAuthor(t.with, a));
  const them: any = { ...pickAuthor(a), role, title: a.role, dm: dmOpen, openToRecruiters: true }; const rule = mine ? { ok: false, why: "هذا أنت" } : dmRule(app.profile, them, {});
  const shares = mine ? app.shares.filter((x) => x.as === a.as) : []; const cred = verified && canVerifyRole(role) ? (role === "supervisor" ? "مؤهل موثّق" : a.verifyKind === "certificate" ? "شهادة هندسية موثّقة" : "عضوية نقابة موثّقة") + (a.division && divOf(a.division) ? ` · ${divOf(a.division).label}` : "") : null;
  return (
    <div className="text-center">
      <div className="pop-in inline-block"><LevelRing pts={REP_LEVELS[Math.min(level, 3)][1] + 10} size={pub && a.photo ? 64 : 104}><IdentityFace a={a} size={pub && a.photo ? PHOTO_MAX : 88} /></LevelRing></div>
      {pub ? <h2 className="mt-3 text-[21px] font-medium leading-snug">{displayName(a)}</h2> : <Num className="block mt-3 text-[22px] font-semibold tracking-[-0.02em]">#{a.anon}</Num>}
      <div className="mt-1 flex justify-center items-center gap-1.5"><IdentityTag as={a.as} />{!pub && <span className="text-[11.5px] text-ink-3">الشخصية: {characterName(specOf(a), a.gender)}</span>}</div>
      <div className="mt-2 flex justify-center flex-wrap gap-1.5"><RoleBadge role={role} verified={verified} gender={a.gender} />{a.expert && <Chip tone="verified"><Award size={12} /> خبير المجتمع</Chip>}<Chip>{lv}</Chip></div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{a.role}</p>
      {cred && <p className="mt-1.5 text-[11.5px] text-good inline-flex items-center gap-1.5"><ShieldCheck size={13} /> {cred}{pub ? "" : " — بدون كشف الاسم أو رقم العضوية"}</p>}
      {pub && <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">{[["سنة التخرج", a.gradYear ? <Num>{a.gradYear}</Num> : "—"], ["العمر", a.age ? <><Num>{a.age}</Num> سنة</> : "—"]].map(([k, v]: any) => <div key={k} className="px-2 py-2 rounded-xl bg-canvas/60 border border-line"><dt className="text-ink-3">{k}</dt><dd className="mt-0.5 text-ink">{v}</dd></div>)}</dl>}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10.5px] text-ink-2">{[[pub ? "منشورات علنية" : "منشورات بالمعرّف", posts], [pub ? "ردود علنية" : "ردود بالمعرّف", replies], ["المستوى", lv]].map(([k, v]: any) => <div key={k} className="px-2 py-2 rounded-xl bg-canvas/60 border border-line"><span className="block text-[16px] font-semibold text-ink">{typeof v === "number" ? <Num>{v}</Num> : v}</span>{k}</div>)}</div>
      {shares.length > 0 && <div className="mt-3 text-start rounded-xl bg-canvas/60 border border-line p-3"><p className="text-[11.5px] text-ink-2 mb-1">رواتب شاركتها {pub ? "علنًا" : "بهذا المعرّف"}</p>{shares.map((x) => <div key={x.id} className="flex items-center justify-between gap-2 text-[12.5px] py-1"><span>{x.title} · {label(EXP, x.exp)}</span><Num className="font-semibold">{fmt(x.salary)}</Num></div>)}</div>}
      {mine ? <p className="mt-4 p-3 rounded-xl bg-wash border border-accent/20 text-[12px] text-ink-2 leading-relaxed">هذا ملفك {pub ? "العلني" : "المجهول"} كما يراه الآخرون.{pub ? " مشاركاتك المجهولة لا تظهر هنا." : " لا يظهر فيه اسمك أو عمرك أو مدينتك."}</p>
        : <div className="mt-4 flex gap-2">{rule.ok ? <Primary onClick={() => { app.closeSheet(); app.startThread(them, { type: "post", id: null, label: "من ملف عضو" }); }} className="flex-1 h-11 press"><Send size={15} className="rtl:-scale-x-100" /> رسالة خاصة</Primary> : <Secondary disabled className="flex-1 h-11 text-[12px] leading-snug">{rule.why}</Secondary>}<Secondary onClick={() => app.openSheet("report", { kind: "user", id: authorKey(a), author: pickAuthor(a) })} className="h-11 px-4" aria-label="إبلاغ عن هذا الحساب"><Flag size={15} /></Secondary></div>}
      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-3">{pub ? gx(a.gender, "ملف علني: اختار صاحبه الظهور باسمه في هذه المشاركات فقط. مشاركاته المجهولة — إن وُجدت — لا تظهر هنا ولا يمكن ربطها بهذا الاسم.", "ملف علني: اختارت صاحبته الظهور باسمها في هذه المشاركات فقط. مشاركاتها المجهولة — إن وُجدت — لا تظهر هنا ولا يمكن ربطها بهذا الاسم.") : "هوية مجهولة: لا اسم ولا عمر ولا مدينة ولا بيانات تواصل — ولا يستطيع أي عضو أو صاحب عمل ربطها بملف علني."}</p>
    </div>
  );
}

export function LogoSheet({ app, payload }: any) {
  const c = company(payload.company); const ref = useRef<any>(null); const [preview, setPreview] = useState(app.logos[c.id] || null); const [err, setErr] = useState<any>("");
  const onFile = (e?: any) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 2e6) { setErr("الشعار أكبر من 2 ميجابايت"); return; } const r = new FileReader(); r.onload = () => { setPreview(r.result); setErr(""); }; r.readAsDataURL(f); };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><CompanyLogo c={c} size={64} logo={preview} className="rounded-2xl" /><div className="min-w-0"><p className="text-[14px] font-medium">{c.name}</p><p className="text-[11.5px] text-ink-2 leading-snug">{c.logo ? `الحالي: الشعار الحقيقي من ${logoSourceLabel(c)}. ` : ""}مربّع، PNG أو SVG، حتى 2 ميجابايت. يظهر في بطاقات الشركة والوظائف.</p></div></div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} className="sr-only" />
      <div className="flex gap-2"><Secondary onClick={() => ref.current && ref.current.click()} className="flex-1 h-11"><ImagePlus size={15} /> اختر صورة</Secondary>{preview && <Secondary onClick={() => setPreview(null)} className="h-11 px-3">إزالة</Secondary>}</div>
      {err && <p className="text-[12px] text-bad">{err}</p>}
      <Primary onClick={() => { app.setLogo(c.id, preview); app.closeSheet(); app.toast(preview ? "تم تحديث شعار الشركة" : "أُعيد الشعار الرسمي المسجّل"); }} className="w-full h-12 press">حفظ</Primary>
      <p className="text-[10.5px] text-ink-3">الشعار يُحفظ على جهازك في هذه المعاينة. في الإنتاج يُرفع بعد التحقق من انتماء الحساب للشركة.</p>
    </div>
  );
}

export const PrivacyBody = () => (
  <div className="space-y-4">
    <TrustPolicy />
    <div><h4 className="text-[13.5px] font-medium mb-2">هويتان منفصلتان تمامًا</h4>
      <ul className="list-disc ps-5 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
        <li><span className="text-ink">علني:</span> اسمك الكامل ولقبك الكامل (التخصص والمسار والمستوى والمدينة) وسنة التخرج والعمر وشارة التوثيق — في المشاركات التي تختار نشرها علنًا فقط.</li>
        <li><span className="text-ink">مجهول:</span> معرّف مثل <Num>#a7f3</Num> وشخصية كرتونية، مع الدور العام وسنوات الخبرة وشارة التوثيق — مثال: «مهندس مدني · 5 سنوات خبرة · عضوية نقابة موثّقة». لا اسم ولا عمر ولا مدينة ولا بيانات تواصل.</li>
        <li>تختار الهوية في كل منشور ورد وتقييم شركة وتصويت ومشاركة راتب. الهوية داخل المحادثة الخاصة تُثبَّت مع أول رسالة حتى لا تُربط الهويتان.</li>
        <li>للمجهول صورة دائرية كرتونية وللعلني حروف اسم في مربع — لا يمكن مطابقة الاثنين بالصورة، ولا تُعرض مشاركات إحداهما في ملف الأخرى.</li>
        <li>المعرّف المجهول يمكن تجديده في أي وقت، ونشاطك القديم لا يرتبط بالجديد.</li>
      </ul></div>
    <div><h4 className="text-[13.5px] font-medium mb-2">ماذا تعني شارة «موثّق»؟</h4><p className="text-[13px] leading-[1.9] text-ink-2">أن صاحبها — مهندس أو مشرف موقع — رفع اختياريًا كارنيه النقابة أو شهادة التخرج، فراجعها فريق الإدارة يدويًا واعتمدها، ثم حُذفت المستندات نهائيًا. لا تعني أن الراتب مدقّق أو أن كل ادعاء مضمون. التسجيل وكل خصائص التطبيق لا تتطلبها.</p><p className="mt-2 text-[13px] leading-[1.9] text-ink-2">حسابات جهات العمل لا توثَّق: تظهر بشارة دورها «صاحب عمل» أو «موارد بشرية».</p></div>
    <p className="p-3.5 rounded-xl bg-wash border-s-[3px] border-accent text-[12.5px] leading-[1.8]">هذه معاينة تفاعلية: الحساب والملف يُحفظان على جهازك فقط، وطلبات التوثيق تُراجع في لوحة الإدارة داخل المعاينة نفسها.</p>
  </div>
);

export const Bar = ({ parts }: any) => { const tot = parts.reduce((a, p) => a + p[1], 0) || 1; return <div className="mt-3 h-2.5 rounded-full overflow-hidden flex bg-elevated">{parts.map(([k, v, cls]: any) => <span key={k} className={cls} style={{ width: `${(v / tot) * 100}%`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} title={k} />)}</div>; };

export const myMedian = (pr?: any) => medianFor((isCompanyRole(pr.role) ? "civil" : pr.disc), personaExp(pr), pr.gov, isCompanyRole(pr.role) ? "site" : pr.track, pr.city);


export function NetTool({ app, payload }: any) {
  const pr = app.profile; const med = myMedian(pr); const [g, setG] = useState<any>(String(payload.gross || med)); const gross = Number(g) || 0; const r = egyptNet(gross);
  return (<div><Field label="الراتب الإجمالي الشهري" value={g} onChange={setG} placeholder={fmt(med)} />
    <Result><p className="text-[11px] text-ink-2">يصل حسابك تقريبًا</p><Money n={r.net} size="text-[34px]" /><Bar parts={[["صافي", r.net, "bg-accent"], ["تأمينات", r.ins, "bg-ink-3"], ["ضريبة", r.tax, "bg-ink-4"]]} />
      <ul className="mt-3 space-y-1.5 text-[12.5px]">{[["تأمينات اجتماعية (11% حتى الحد الأقصى)", r.ins], ["ضريبة الدخل الشهرية", r.tax], ["نسبة الاستقطاع الفعلية", gross ? `${Math.round(((gross - r.net) / gross) * 100)}%` : "—"]].map(([k, v]: any) => <li key={k} className="flex justify-between gap-3 text-ink-2"><span>{k}</span><Num className="text-ink">{typeof v === "number" ? fmt(v) : v}</Num></li>)}</ul></Result>
    <p className="mt-3 text-[11px] text-ink-3 leading-relaxed">تقديري: شرائح قانون 175 لسنة 2023، إعفاء شخصي 20,000 ج.م سنويًا، وحد أقصى للأجر التأميني 16,700 ج.م. لا يشمل بدلات معفاة أو تأمينًا طبيًا خاصًا.</p>
    <Secondary onClick={() => { app.closeSheet(); app.openSheet("compose", {}); }} className="w-full h-11 mt-3">شارك النتيجة بدون اسم</Secondary></div>);
}

export function CompareTool({ app }: any) {
  const [a, setA] = useState<any>({ base: "17000", alw: "2000", ins: true, commute: "45", hours: "48" }); const [b, setB] = useState<any>({ base: "15500", alw: "4500", ins: false, commute: "90", hours: "54" });
  const calc = (o?: any) => { const monthly = (Number(o.base) || 0) + (Number(o.alw) || 0) + (o.ins ? 1200 : 0); const weekly = (Number(o.hours) || 0) + ((Number(o.commute) || 0) * 2 * 5) / 60; return { monthly, hourly: weekly ? Math.round(monthly / (weekly * 4.33)) : 0, weekly: Math.round(weekly) }; };
  const A = calc(a), B = calc(b); const win = A.hourly === B.hourly ? null : A.hourly > B.hourly ? "A" : "B";
  const Offer = ({ o, set, name }: any) => (<div className="p-3 rounded-xl bg-canvas/60 border border-line space-y-2"><p className="text-[12px] font-medium">{name}</p><div className="grid grid-cols-2 gap-2"><Field label="الأساسي" value={o.base} onChange={(v) => set({ ...o, base: v })} /><Field label="بدلات" value={o.alw} onChange={(v) => set({ ...o, alw: v })} /><Field label="المواصلات (دقيقة/اتجاه)" value={o.commute} onChange={(v) => set({ ...o, commute: v })} unit="د" /><Field label="ساعات/أسبوع" value={o.hours} onChange={(v) => set({ ...o, hours: v })} unit="س" /></div><label className="flex items-center justify-between text-[12.5px] min-h-9"><span>تأمين طبي خاص</span><Toggle on={o.ins} onChange={(v) => set({ ...o, ins: v })} label="تأمين" /></label></div>);
  return (<div className="space-y-3"><Offer o={a} set={setA} name="العرض الأول" /><Offer o={b} set={setB} name="العرض الثاني" />
    <Result tone={win ? "good" : "accent"}><p className="text-[12px] text-ink-2 mb-2">القيمة الحقيقية لساعة عمرك (شاملة الطريق)</p>
      {[["الأول", A], ["الثاني", B]].map(([n, r]: any) => <div key={n} className="flex items-center justify-between gap-2 py-1.5 text-[13.5px]"><span className="inline-flex items-center gap-2">{win === (n === "الأول" ? "A" : "B") && <Award size={14} className="text-good" />} العرض {n} <span className="text-[11px] text-ink-3">· {r.weekly} س/أسبوع</span></span><span className="shrink-0"><Num className="text-[18px] font-semibold">{fmt(r.hourly)}</Num> <span className="text-[11px] text-ink-3">ج.م/ساعة</span></span></div>)}
      <p className="mt-2 text-[11.5px] text-ink-2">{win ? `العرض ${win === "A" ? "الأول" : "الثاني"} أفضل بـ ${Math.round(Math.abs(A.hourly - B.hourly) / Math.min(A.hourly, B.hourly) * 100)}% لكل ساعة، رغم فرق الأساسي.` : "العرضان متساويان عمليًا — قرر بالمسار لا بالرقم."}</p></Result></div>);
}

export function ScriptTool({ app, payload }: any) {
  const pr = app.profile; const med = myMedian(pr); const [offer, setOffer] = useState<any>(String(payload.offer || round500(med * 0.9))); const [median, setMedian] = useState<any>(String(payload.median || med)); const ask = round500((Number(median) || med) * 1.05);
  const d = (app.isCo ? "civil" : pr.disc);
  const lines: any = [`شكرًا على العرض، وأنا متحمس للدور. قبل ما نقفل الرقم، حبيت أشارك معاك اللي عندي من السوق.`, `النطاق المتوقع لـ${ROLE[d]} (${trackLabel(pr.track || "site", d)}) بخبرتي في ${placeName(pr.gov, pr.city)} حاليًا حوالي ${fmt(Number(median) || med)} جنيه، حسب تقارير موثّقة من مهندسين في نفس المسار.`, `العرض الحالي ${fmt(Number(offer) || 0)}. لو نقدر نوصل لـ${fmt(ask)}، أنا جاهز أمضي الأسبوع ده.`, `ولو الأساسي مقفول دلوقتي، نتفق على بدل انتقال أو مراجعة مكتوبة بعد 6 شهور بنسبة محددة.`, `أنا مقدّر وقتكم، وعايز نبدأ على أساس واضح للطرفين.`];
  return (<div><div className="grid grid-cols-2 gap-2"><Field label="العرض" value={offer} onChange={setOffer} /><Field label="وسط السوق" value={median} onChange={setMedian} /></div>
    <Result><p className="text-[11px] text-ink-2 mb-2">اطلب <Num className="text-ink">{fmt(ask)}</Num> — 5% فوق الوسط، رقم قابل للدفاع</p><ol className="space-y-2.5 text-[13.5px] leading-[1.8]">{lines.map((l, i) => <li key={i} className="flex gap-2.5"><span className="shrink-0 grid place-items-center w-5 h-5 rounded-full bg-elevated font-grotesk text-[10px] text-ink-2">{i + 1}</span><span>{l}</span></li>)}</ol></Result>
    <div className="mt-3 flex gap-2"><Secondary onClick={() => { copyText(lines.join("\n")); app.toast("نُسخ السكريبت"); }} className="flex-1 h-11"><Copy size={15} /> نسخ</Secondary><Secondary onClick={() => { app.closeSheet(); app.openSheet("compose", { room: "nego" }); }} className="flex-1 h-11">اسأل غرفة التفاوض</Secondary></div></div>);
}

export function RaiseTool({ app }: any) {
  const pr = app.profile; const med = myMedian(pr); const [sal, setSal] = useState<any>(String(round500(med * 0.85))); const [months, setMonths] = useState<any>("14"); const [last, setLast] = useState<any>("10");
  const s = Number(sal) || 0, gap = s ? Math.round(((med - s) / s) * 100) : 0, m = Number(months) || 0; const now = m >= 12 || gap >= 15; const ask = round500(Math.max(med, s * 1.15));
  return (<div><Field label="راتبك الحالي" value={sal} onChange={setSal} /><div className="grid grid-cols-2 gap-2 mt-2"><Field label="شهور منذ آخر زيادة" value={months} onChange={setMonths} unit="شهر" /><Field label="آخر زيادة" value={last} onChange={setLast} unit="%" /></div>
    <Result tone={now ? "good" : "accent"}><div className="flex items-center gap-2 text-[16px] font-medium">{now ? <CircleCheck size={18} className="text-good" /> : <Timer size={18} className="text-accent" />}{now ? "اطلب الآن" : `انتظر ${12 - m} ${12 - m === 1 ? "شهرًا" : "شهور"} — أو اجمع إنجازًا مكتوبًا`}</div>
      <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-2"><li className="flex justify-between"><span>فجوتك عن وسط السوق</span><Num className={gap > 0 ? "text-warn" : "text-good"}>{gap > 0 ? `-${gap}%` : `+${Math.abs(gap)}%`}</Num></li><li className="flex justify-between"><span>الرقم اللي تطلبه</span><Num className="text-ink">{fmt(ask)}</Num></li><li className="flex justify-between"><span>الحد الأدنى اللي تقبله</span><Num className="text-ink">{fmt(round500(ask * 0.93))}</Num></li></ul>
      <p className="mt-2 text-[11.5px] text-ink-2">{gap >= 15 ? "الفجوة كبيرة: افتح الموضوع بالأرقام مش بالمشاعر، واطلب موعدًا محددًا لا نقاشًا في الممر." : now ? "سنة كاملة بدون مراجعة — الطلب طبيعي ومتوقّع." : "الزيادات في المقاولات بتتقفل مع نهاية السنة المالية أو تسليم مرحلة. جهّز ورقة بإنجازاتك."}</p></Result>
    <Secondary onClick={() => { app.closeSheet(); app.openSheet("tool", { id: "script", offer: s, median: med }); }} className="w-full h-11 mt-3">جهّز السكريبت بالأرقام دي</Secondary></div>);
}

export function PathTool({ app }: any) {
  const pr = app.profile; const d = (app.isCo ? "civil" : pr.disc); const track = pr.track || "site"; const pi = POSITIONS.findIndex((l) => l[0] === pr.pos); const cur = myMedian(pr);
  const nextLevels = POSITIONS.slice(pi + 1, pi + 3).map(([id, l, e, k, a, b]: any) => ({ l, m: round500(medianFor(d, e, pr.gov, track, pr.city) * k), when: yearsLabel([a, b]) }));
  const NOTES: any = { pm: "سينيور + PMP عادةً", design: "ETABS/Revit ومكتب استشاري", planning: "Primavera P6", tech: "حصر ومستخلصات", supervision: "استشاري إشراف", site: "تنفيذ ومواقع", contracts: "FIDIC وحصر كميات", qa: "ISO 9001 · NEBOSH", bim: "Revit · Navisworks", gis: "ArcGIS · QGIS" };
  const switches = tracksFor(d).filter(([id]: any) => id !== track).map(([id]: any) => ({ l: trackLabel(id, d), m: medianFor(d, personaExp(pr), pr.gov, id, pr.city), note: NOTES[id] || "" })).sort((a, b) => b.m - a.m).slice(0, 4);
  return (<div><p className="text-[12.5px] text-ink-2 leading-relaxed">أنت الآن: {personaTitle(pr)} — وسطك <Num className="text-ink">{fmt(cur)}</Num> ج.م.</p>
    <Result><p className="text-[11px] text-ink-2 mb-2">نفس المسار، بمرور الوقت (بالمسمّى الدقيق)</p>{nextLevels.length ? nextLevels.map((n) => <div key={n.l} className="flex items-center justify-between gap-2 py-2 border-t border-line first:border-0 text-[13.5px]"><span className="leading-snug">{n.l} <span className="text-[11px] text-ink-3">· {n.when}</span></span><span className="shrink-0"><Num className="font-semibold">{fmt(n.m)}</Num> <span className="text-[10.5px] text-good">+{Math.round(((n.m - cur) / cur) * 100)}%</span></span></div>) : <p className="text-[13px]">أنت في أعلى المسار — الخطوة القادمة إدارة أو استشارات مستقلة.</p>}</Result>
    <Result tone="accent" className="mt-3"><p className="text-[11px] text-ink-2 mb-2">تبديل المسار، بنفس خبرتك</p>{switches.map((s) => <div key={s.l} className="flex items-center justify-between gap-2 py-2 border-t border-line first:border-0 text-[13.5px]"><span className="leading-snug">{s.l} <span className="text-[11px] text-ink-3">· {s.note}</span></span><span className="shrink-0"><Num className="font-semibold">{fmt(s.m)}</Num> <span className={`text-[10.5px] ${s.m >= cur ? "text-good" : "text-warn"}`}>{s.m >= cur ? "+" : ""}{Math.round(((s.m - cur) / cur) * 100)}%</span></span></div>)}</Result>
    <Secondary onClick={() => { app.closeSheet(); app.push({ type: "room", id: "grads" }); }} className="w-full h-11 mt-3">اسأل من عملها قبلك</Secondary></div>);
}

export function ContractTool({ app }: any) {
  const items: any = [["فترة الاختبار مكتوبة بمدة (3 شهور عادةً) وبراتب كامل", "لو غير مكتوبة، ممكن تتمد بلا نهاية."], ["البدلات مذكورة في العقد لا في الشفوي", "بدل الموقع اللي مش مكتوب بيختفي مع تغيير المشروع."], ["نسبة الزيادة السنوية أو موعد المراجعة مكتوب", "«حسب الأداء» تعني لا شيء."], ["ساعات العمل والإضافي محددة", "12 ساعة موقع بدون إضافي مكتوب = تطوّع."], ["مدة الإخطار متساوية للطرفين", "شهرين عليك وأسبوع عليهم فرق كبير."], ["التأمينات على الراتب الحقيقي لا الحد الأدنى", "يؤثر في معاشك وفي أي تعويض."], ["شرط عدم المنافسة محدود بمدة ونطاق معقولين", "سنتان على كل مصر شرط تعجيزي."], ["لا استقطاعات غير مذكورة (تدريب، عهدة، غرامات)", "اسأل عنها قبل التوقيع لا بعده."]];
  const [ok, setOk] = useState<any>({}); const score = Object.values(ok).filter(Boolean).length;
  return (<div><div className="space-y-2">{items.map(([t, why]: any, i) => <label key={i} className="press flex items-start gap-3 p-3 rounded-xl bg-canvas/60 border border-line cursor-pointer"><input type="checkbox" checked={!!ok[i]} onChange={(e) => setOk({ ...ok, [i]: e.target.checked })} className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" /><span><span className="block text-[13.5px] leading-snug">{t}</span><span className="block mt-0.5 text-[11.5px] text-ink-3">{why}</span></span></label>)}</div>
    <Result tone={score >= 7 ? "good" : score >= 4 ? "accent" : "warn"}><div className="flex items-center justify-between"><span className="text-[14px] font-medium">{score >= 7 ? "عقد سليم — امضِ" : score >= 4 ? "فيه ثغرات — فاوض على الباقي" : "متمضيش قبل ما تسأل"}</span><Num className="text-[20px] font-semibold">{score}/8</Num></div></Result></div>);
}

export function MoveTool({ app }: any) {
  const pr = app.profile; const [from, setFrom] = useState<any>({ gov: pr.gov, city: pr.city || null }); const [to, setTo] = useState<any>({ gov: "matrouh", city: "alamein" }); const d = (app.isCo ? "civil" : pr.disc); const track = pr.track || "site";
  const [cur, setCur] = useState<any>(String(myMedian(pr))); const [offer, setOffer] = useState<any>(String(medianFor(d, personaExp(pr), "matrouh", track, "alamein") + 3000)); const [housing, setHousing] = useState(true); const [family, setFamily] = useState(false);
  const rentNow = rentFor(from.gov, from.city), rentTo = housing ? 0 : rentFor(to.gov, to.city) * (family ? 1.5 : 1); const far = gov(to.gov)[2] !== gov(from.gov)[2]; const trips = far ? 900 : 400;
  const now = (Number(cur) || 0) - rentNow, after = (Number(offer) || 0) - rentTo - trips; const diff = after - now;
  return (<div><p className="text-[12px] text-ink-2 mb-1.5">من</p><GovPicker gov={from.gov} city={from.city} onChange={(g, c) => setFrom({ gov: g, city: c })} compact /><p className="text-[12px] text-ink-2 mt-3 mb-1.5">إلى</p><GovPicker gov={to.gov} city={to.city} onChange={(g, c) => setTo({ gov: g, city: c })} />
    <div className="grid grid-cols-2 gap-2 mt-3"><Field label="راتبك الحالي" value={cur} onChange={setCur} /><Field label="العرض هناك" value={offer} onChange={setOffer} /></div>
    <div className="mt-2 space-y-1">{[["سكن من الشركة", housing, setHousing], ["هنتنقل بالعيلة", family, setFamily]].map(([l, v, st]: any) => <label key={l} className="flex items-center justify-between text-[12.5px] min-h-9"><span>{l}</span><Toggle on={v} onChange={st} label={l} /></label>)}</div>
    <Result tone={diff > 0 ? "good" : "warn"}><p className="text-[11px] text-ink-2">الفرق الشهري بعد الإيجار والسفر</p><div className="flex items-baseline gap-2"><Num className={`text-[32px] font-semibold tracking-[-0.04em] ${diff >= 0 ? "text-good" : "text-warn"}`}>{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}</Num><span className="text-[12px] text-ink-2">ج.م / شهر</span></div>
      <ul className="mt-2 space-y-1 text-[12px] text-ink-2"><li className="flex justify-between gap-2"><span>إيجار {placeName(from.gov, from.city)} الآن</span><Num>{fmt(rentNow)}</Num></li><li className="flex justify-between gap-2"><span>إيجار {placeName(to.gov, to.city)}{housing ? " (سكن شركة)" : ""}</span><Num>{fmt(rentTo)}</Num></li><li className="flex justify-between gap-2"><span>سفر للأهل شهريًا{far ? " (خارج المنطقة)" : ""}</span><Num>{fmt(trips)}</Num></li><li className="flex justify-between gap-2"><span>وسط السوق هناك لمثلك</span><Num>{fmt(medianFor(d, personaExp(pr), to.gov, track, to.city))}</Num></li></ul>
      <p className="mt-2 text-[11.5px] text-ink-2">{diff > 3000 ? "الانتقال يستاهل ماليًا — حدد مدة من الأول واتفق على العودة لمشروع في محافظتك بعدها." : diff > 0 ? "الفرق موجود لكنه صغير. اطلب بدل اغتراب أو ارفع العرض 1,500 على الأقل." : "العرض ما يغطيش تكلفة الانتقال. الرقم اللي يستاهل: " + fmt(round500((Number(cur) || 0) - rentNow + rentTo + trips + 2500)) + " ج.م."}</p></Result></div>);
}

export function InflationTool({ app }: any) {
  const pr = app.profile; const [sal, setSal] = useState<any>(String(myMedian(pr))); const [raise, setRaise] = useState<any>("10"); const [inf, setInf] = useState<any>("12.5");
  const s = Number(sal) || 0, r = Number(raise) || 0, i = Number(inf) || 0; const real = ((1 + r / 100) / (1 + i / 100) - 1) * 100; const need = Math.round(i + 3);
  return (<div><Field label="راتبك الحالي" value={sal} onChange={setSal} /><div className="grid grid-cols-2 gap-2 mt-2"><Field label="الزيادة المعروضة" value={raise} onChange={setRaise} unit="%" /><Field label="التضخم السنوي" value={inf} onChange={setInf} unit="%" /></div>
    <Result tone={real >= 2 ? "good" : real >= 0 ? "accent" : "warn"}><p className="text-[11px] text-ink-2">قوّتك الشرائية بعد الزيادة</p><div className="flex items-baseline gap-2"><Num className={`text-[32px] font-semibold tracking-[-0.04em] ${real >= 0 ? "text-good" : "text-warn"}`}>{real >= 0 ? "+" : "−"}{Math.abs(real).toFixed(1)}%</Num><span className="text-[12px] text-ink-2">فعليًا</span></div>
      <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2"><li className="flex justify-between"><span>الراتب الجديد</span><Num>{fmt(round500(s * (1 + r / 100)))}</Num></li><li className="flex justify-between"><span>اللي تحتاجه عشان تفضل مكانك</span><Num>{fmt(round500(s * (1 + i / 100)))}</Num></li><li className="flex justify-between"><span>زيادة تحسّن وضعك فعلًا</span><Num>{need}%+</Num></li></ul>
      <p className="mt-2 text-[11.5px] text-ink-2">{real < 0 ? "الزيادة دي تخفيض مقنّع. قدّم رقم التضخم في النقاش — هو حجتك الأقوى." : real < 2 ? "بالكاد تغطي التضخم. اطلب الفرق كبدل ثابت لو الأساسي مقفول." : "زيادة حقيقية — نادرة هذه الأيام. سجّلها في المرتبات ليستفيد غيرك."}</p></Result>
    <Secondary onClick={() => { app.closeSheet(); app.openSheet("tool", { id: "raise" }); }} className="w-full h-11 mt-3">هل ده وقت طلب الزيادة؟</Secondary></div>);
}

export function MethodologySheet({ app }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><Chip tone="accent"><FileCheck size={13} /> نموذج {DATASET.version}</Chip><span className="text-[11px] text-ink-3">محدَّث <Num>{DATASET.updated}</Num></span></div>
      <p className="text-[13.5px] leading-[1.9] text-ink">{DATASET.method}</p>
      <div><h4 className="text-[13px] font-medium mb-2">مراجع تنظيمية (حقيقية ومصدرها مذكور)</h4><ul className="divide-y divide-line rounded-xl bg-canvas/60 border border-line">{DATASET.anchors.map(([k, v, src]: any) => <li key={k} className="p-3 text-[12.5px]"><div className="flex justify-between gap-3"><span className="text-ink">{k}</span><span className="text-end text-ink shrink-0 max-w-[55%]">{v}</span></div><div className="mt-0.5 text-[10.5px] text-ink-3">المصدر: {src}</div></li>)}</ul></div>
      <div><h4 className="text-[13px] font-medium mb-2">أساس الأرقام</h4><ul className="space-y-1.5 text-[12.5px] text-ink-2 list-disc ps-5"><li>{DATASET.basis}.</li><li>P10–P90 لكل تخصّص × خبرة، ثم معامل المحافظة/المدينة ({CITY_COUNT} مدينة ومركزًا وحيًا في 27 محافظة: 0.74 جهينة → 1.12 العلمين الجديدة) ومعامل المسار (موقع 1.00 → إدارة مشروعات 1.35).</li><li>البدلات تُعرض منفصلة لأنها لا تدخل في التأمينات ولا في حساب المكافآت.</li><li>شارة الجودة: موثّق ≥100 تقرير · كافٍ ≥30 · أولي أقل من ذلك.</li><li>الأرقام النموذجية هامش خطئها ±15%. كل رقم تشاركه يستبدل تقديرًا برقم حقيقي.</li></ul></div>
      <div><h4 className="text-[13px] font-medium mb-2">ترتيب القوائم والمرشحات</h4><p className="text-[12.5px] leading-[1.8] text-ink-2">قاعدة واحدة في كل الشاشات: المرشحات من الأعم إلى الأخص (التخصّص ← المسار ← المسمّى ← المكان)، ثم الترتيب. «لك» في الوظائف تبدأ مرتّبة بدرجة المطابقة ثم الأحدث، وكل ترتيب آخر متاح فيها؛ باقي القوائم الافتراضي فيها الأحدث. الشركات: تقارير ← متوسط كمعيار كسر التعادل، والمجهول التأسيس في آخر القائمة. ردود المنشور: الإجابة المعتمدة أولًا ثم الأكثر «مفيد» ثم الأقدم.</p></div>
      <div><h4 className="text-[13px] font-medium mb-2">التقديم على الوظائف</h4><p className="text-[12.5px] leading-[1.8] text-ink-2">يتم خارج المنصة: كل إعلان يحمل بريد الشركة أو هاتفها، والمهندس يرسل سيرته من بريده الشخصي أو يتصل. لا نماذج ولا تتبّع ولا وسيط. أداة «مراجع السيرة الذاتية» تعمل على جهازك ولا ترفع الملف.</p></div>
      <div><h4 className="text-[13px] font-medium mb-2">النطاق المتوقع لإعلانات الوظائف</h4><p className="text-[12.5px] leading-[1.8] text-ink-2">لا تكتب الشركات رقمًا. النطاق = الربع الأدنى إلى الربع الأعلى لسوق (التخصّص × سنوات الخبرة) × معامل المدينة × معامل التخصّص الفرعي × معامل المسمّى الدقيق (حديث التخرج 0.90 → مدير إدارة 1.45) × معامل نوع الجهة (حكومي 0.72 → مكتب خلفي 1.90). يُعرض الوسط مع عدد التقارير وشارة الجودة.</p></div>
      <div><h4 className="text-[13px] font-medium mb-2">المطابقة والإشعارات</h4><p className="text-[12.5px] leading-[1.8] text-ink-2">التخصّص 40 نقطة · التخصّص الفرعي 25 (المسارات المجاورة 12) · سنوات الخبرة 20 (±سنتان 10) · المكان 10 (نفس الإقليم 5) · المسمّى 5. من 85 فأعلى «مطابقة تامة» ويصل إشعار فوري؛ 65–84 «قوية» تظهر في «لك» بلا إشعار.</p></div>
      <div><h4 className="text-[13px] font-medium mb-2">تصنيف الشركات وشعاراتها</h4><p className="text-[12.5px] leading-[1.8] text-ink-2">الحقائق (التأسيس، المقر، الملكية، الفئة، درجة تصنيف الاتحاد) من السجل العام. الشعارات الحقيقية مأخوذة من الموقع الرسمي لكل شركة أو من صفحتها على ويكيبيديا، وتُستبدل بما ترفعه الشركة من حسابها الموثّق. «—» تعني أن الحقيقة غير مؤكدة لدينا بدل تخمينها.</p></div>
      {can(app.profile, "reveal") && <Secondary onClick={() => { app.closeSheet(); app.openSheet("contribute"); }} className="w-full h-11">استبدل تقديرًا برقمك الحقيقي</Secondary>}
    </div>
  );
}

export const TOOL_VIEWS = { net: NetTool, compare: CompareTool, script: ScriptTool, raise: RaiseTool, path: PathTool, contract: ContractTool, move: MoveTool, inflation: InflationTool };
