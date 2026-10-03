import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown, BadgeCheck, Bookmark, Briefcase, Building2, ChevronDown, CircleCheck, ClipboardCheck, Clock, Coins, FileCheck, 
  FileSearch, LockKeyhole, MapPin, Megaphone, MessageCircle, MessageCircleWarning, Plus, Scale, Search, 
  ShieldCheck, Sparkles, TrendingUp, X
} from "lucide-react";
import { CATS, CAT_DESC, COMPANIES, GENERAL_ROOM, catName } from "../../data/companies";
import { DATASET, REGIONS, gov, govName, placeMult, placeName, regionName } from "../../data/geo";
import { TOOLS } from "../../data/tools";
import { authorOf, cleanName, displayName, gx } from "../../domain/identity";
import { ALLOWANCES, COMPANY_MIN_SAMPLE, DISC, EMPLOYERS, EXP, FX, GOALS, GOALS_CO, POSITIONS, ROLE, TRACKS, can, label, posShort, toolOpen, trackLabel, tracksFor } from "../../domain/taxonomy";
import { UGC } from "../../i18n/i18n";
import { GOAL_TOOL, Money, estimateFor, marketFor, matchJob, personaExp, personaTitle, quality, reportsFor, round500, sampleSize } from "../../lib/helpers";
import { countComments } from "../../lib/posts";
import { SEARCH_THRESHOLD, buildSearchIndex, searchPosts } from "../../lib/search";
import { byNewest } from "../../lib/time";
import { AnonChip } from "../../ui/characters";
import { Empty, GovPicker, Percentiles, RoleBadge, SectionTitle, Seg } from "../../ui/chrome";
import { CompanyRow, JobCard, PostCard, RoomCard } from "../../ui/feed";
import { IdentityFace, IdentityTag } from "../../ui/identity";
import { NotificationsBody } from "../../ui/notifications";
import { Chip, FilterChip, Forward, Num, Panel, Primary, RangeBar, RoundButton, Secondary } from "../../ui/primitives";
import { fmt } from "../../ui/theme";
import { Windowed } from "../../ui/windowed";
import { isCloud } from "../../backend/config";
import { LiveSalaryPanel, useLiveSalary } from "../market/live-salary";

export const engagement = (p?: any) => (p.reactions.agree || 0) + (p.reactions.disagree || 0) + (p.reactions.useful || 0) + countComments(p.comments) * 3;


export function HomeScreen({ app }: any) {
  const p = app.profile; const co = app.isCo; const exp = personaExp(p); const m = co ? null : marketFor(p.disc, exp, p.gov, p.track, p.city); const n = co ? 0 : sampleSize(p.disc, exp, p.gov);
  const hour = new Date().getHours(); const greet = hour < 12 ? "صباح الخير" : "مساء الخير";
  const goal = (co ? GOALS_CO : GOALS).find((g) => g[0] === p.goal) || GOALS[4]; // the goal's tool, only if this role may open it; otherwise the first tool it may (HR: the CV review, which is a screen)
  const openTools = TOOLS.filter((t: any) => toolOpen(app.blocked, t.id)); const cvOnly = !openTools.length;
  const tool: any = cvOnly ? { id: "cvreview", name: "تدقيق السيرة الذاتية الهندسية", desc: "راجع السير الذاتية للمرشحين بمعايير السوق الهندسي", icon: FileSearch } : openTools.find((t) => t.id === GOAL_TOOL[p.goal]) || openTools.find((t: any) => t.group !== "site") || openTools[0];
  const matched = co ? [] : app.jobs.map((j) => ({ j, m: matchJob(j, p) })).filter((x) => x.m && x.m.score >= 40).sort((a, b) => b.m.score - a.m.score || byNewest(a.j, b.j)).slice(0, 4);
  const myJobs = co ? app.jobs.filter((j) => j.co === p.companyId || j.mine) : []; const stats = myJobs.reduce((a, j) => { const s = app.jobStats[j.id] || { views: 0, contacts: 0 }; return { views: a.views + s.views, contacts: a.contacts + s.contacts }; }, { views: 0, contacts: 0 });
  const feed = app.posts.filter((x) => app.roomFollows[x.room] || x.room === GENERAL_ROOM).sort(byNewest).slice(0, 2);
  return (
    <div className="py-4 space-y-5 stagger">
      <div className="px-1 flex items-start gap-3"><IdentityFace a={authorOf(p, p.identity)} size={48} /><div className="min-w-0 flex-1"><p className="text-[12px] text-ink-2">{greet}، {cleanName(p.name).split(" ")[0] || "أهلًا"}</p><h1 className="text-[15px] font-medium leading-snug">{personaTitle(p)}</h1><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><RoleBadge role={p.role} verified={p.verified} gender={p.gender} className="h-6 px-2 text-[10.5px]" /><button type="button" onClick={() => app.push({ type: "profile" })} className="press inline-flex items-center gap-1 h-6 px-2 rounded-full bg-elevated border border-line text-[10.5px] text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">تشارك افتراضيًا: <IdentityTag as={p.identity} className="h-4" /></button></div></div></div>

      {app.config.announce && app.config.announce.on && app.config.announce.text && <div role="note" className={`flex items-start gap-3 p-3.5 rounded-2xl border ${app.config.announce.tone === "warn" ? "bg-warn/10 border-warn/25" : app.config.announce.tone === "good" ? "bg-good/10 border-good/25" : "bg-info/10 border-info/25"}`}><Megaphone size={18} className={`shrink-0 mt-0.5 ${app.config.announce.tone === "warn" ? "text-warn" : app.config.announce.tone === "good" ? "text-good" : "text-info"}`} /><div className="min-w-0"><p className="text-[11px] text-ink-2">إعلان من فريق EngSpace</p><p className="mt-0.5 text-[13.5px] leading-relaxed">{app.config.announce.text}</p></div></div>}

      {can(p, "verify") && !p.verified && !p.verifyNudgeOff && <div className="flex items-stretch gap-1 rounded-2xl border border-accent/25 bg-wash"><button type="button" onClick={() => app.openSheet("verify")} className="press min-w-0 flex-1 flex items-center gap-3 p-3.5 text-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-accent/15 text-accent"><ShieldCheck size={18} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{p.pending ? "بياناتك قيد المراجعة" : p.verifyReq && p.verifyReq.status === "rejected" ? "لم يُعتمد طلب التوثيق" : gx(p.gender, "أضف شارة «موثّق» — اختياري", "أضيفي شارة «موثّق» — اختياري")}</span><span className="block text-[11.5px] text-ink-2 leading-snug">{p.pending ? "يراجعها فريق الإدارة يدويًا — ونخبرك فور القرار." : p.verifyReq && p.verifyReq.status === "rejected" ? gx(p.gender, "اعرف السبب وقدّم طلبًا جديدًا متى شئت.", "اعرفي السبب وقدّمي طلبًا جديدًا متى شئتِ.") : "كارنيه النقابة وشهادة التخرج — مراجعة يدوية، والمستندات تُحذف فور المراجعة."}</span></span><Forward size={16} /></button><RoundButton label="إخفاء اقتراح التوثيق" onClick={() => { app.updateProfile({ verifyNudgeOff: true }); app.toast("يمكنك التوثيق لاحقًا من «حسابك»"); }} className="shrink-0 w-10 h-auto rounded-2xl"><X size={16} /></RoundButton></div>}

      {!co && <section>
        <SectionTitle action="تفاصيل أكثر" onAction={() => app.goMarket("salaries")}>سوقك الآن</SectionTitle>
        <Panel className="p-4"><button type="button" onClick={() => app.goMarket("salaries")} className="press block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[11px] text-ink-2 leading-snug">متوسط {ROLE[p.disc]} · {trackLabel(p.track, p.disc)} · {label(EXP, exp)} · {placeName(p.gov, p.city)}</span><div className="mt-1"><Money n={m.p50} /></div></div><Chip tone="verified" className="shrink-0"><TrendingUp size={13} /><Num>+4%</Num> هذا الشهر</Chip></div>
          <div className="mt-3"><Percentiles m={m} compact /></div><div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-3"><span><Num>{n}</Num> تقرير · {quality(n)[0]}</span><span>نموذج {DATASET.version} ±15%</span></div></button></Panel>
      </section>}

      {co && <section>
        <SectionTitle action="إدارة الوظائف" onAction={() => app.setTab("jobs")}>لوحة التوظيف — {p.companyName || "شركتك"}</SectionTitle>
        <Panel className="p-4"><div className="grid grid-cols-3 gap-2 text-center">{[["وظائف منشورة", myJobs.length], ["مشاهدات", stats.views], ["فتحوا بيانات التواصل", stats.contacts]].map(([k, v]: any) => <div key={k} className="px-2 py-2.5 rounded-xl bg-canvas/60 border border-line"><Num className="block text-[20px] font-semibold">{fmt(v)}</Num><span className="text-[10.5px] text-ink-2 leading-tight block">{k}</span></div>)}</div>
          <div className="mt-3 flex gap-2"><Primary onClick={() => app.push({ type: "postjob" })} className="flex-1 h-11 press"><Plus size={15} /> نشر وظيفة</Primary><Secondary onClick={() => app.setTab("jobs")} className="flex-1 h-11 press"><Briefcase size={15} /> وظائفي</Secondary></div>
          <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed">الإعلان بدون رقم راتب — يعرض EngSpace النطاق المتوقع من السوق. التقديم يصلك مباشرة على بريدك أو هاتفك المكتوبين في الإعلان، ويصل إشعار فوري للمطابقين تمامًا فقط.</p></Panel>
      </section>}

      {!co && matched.length > 0 && <section>
        <SectionTitle action="كل الوظائف" onAction={() => app.setTab("jobs")}>وظائف مطابقة لملفك</SectionTitle>
        <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto no-scrollbar snap-x scroll-ps-4">{matched.map(({ j }) => <JobCard key={j.id} job={j} app={app} compact />)}</div>
      </section>}

      <section>
        <SectionTitle action="كل الأدوات" onAction={() => app.setTab("tools")}>لهدفك: {goal[1]}</SectionTitle>
        <button type="button" onClick={() => (cvOnly ? app.push({ type: "cvreview" }) : app.openSheet("tool", { id: tool.id }))} className="press w-full flex items-center gap-3 p-4 rounded-2xl border border-accent/25 text-start shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ background: "linear-gradient(125deg, rgb(var(--wash)), rgb(var(--surface)) 80%)" }}>
          <span className="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-accent text-on-accent shadow-[0_8px_24px_-8px_rgb(var(--accent))]"><tool.icon size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{tool.name}</span><span className="block text-[12px] text-ink-2 leading-snug">{tool.desc}</span></span><Forward size={18} />
        </button>
        {!co && <button type="button" onClick={() => app.push({ type: "cvreview" })} className="press mt-2 w-full flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-line text-start hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><FileSearch size={18} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">دقّق سيرتك الذاتية قبل التقديم</span><span className="block text-[11px] text-ink-2 leading-snug">تدقيق هندسي للبرامج وحجم المشاريع والمسار والأكواد وATS — مع إعادة كتابة بنودك، على جهازك</span></span><Forward size={16} /></button>}
      </section>

      {!co && <section>
        <SectionTitle>بطاقات هذا الأسبوع</SectionTitle>
        <Panel className="relative overflow-hidden p-4">
          <div className={app.contributed ? "reveal" : "blur-[7px] select-none"} aria-hidden={!app.contributed}>
            <span className="text-[11px] text-ink-2">القاهرة الجديدة · خبرة 5–8 سنوات · استشاري</span><h3 className="mt-0.5 text-[18px] font-medium">مهندس معماري</h3>
            <div className="mt-2 flex flex-wrap gap-1.5"><Chip>دوام كامل</Chip><Chip>استشاري</Chip><Chip tone="verified"><ShieldCheck size={12} /> موثّق</Chip></div>
            <div className="mt-4"><Money n={27000} size="text-[34px]" /></div><div className="mt-3"><RangeBar min={20000} max={35000} median={27000} compact /></div>
          </div>
          {!app.contributed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center bg-canvas/30">
              <span className="glow-pulse grid place-items-center w-11 h-11 rounded-full bg-wash border border-accent/25 text-accent"><LockKeyhole size={18} /></span>
              <div><p className="text-[14px] font-medium">شارك راتبك لكشف السوق</p><p className="mt-1 text-[11.5px] text-ink-2">مشاركة واحدة موثّقة تفتح <Num>12,480</Num> بطاقة. دون اسم أو جهة عمل.</p></div>
              <Primary onClick={() => app.openSheet("contribute")} className="h-11 px-6 press">شارك راتبك <Forward /></Primary>
            </div>
          ) : <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2 text-[11px]"><span className="inline-flex items-center gap-1.5 text-good"><CircleCheck size={13} /> السوق مكشوف لك</span><button type="button" onClick={() => app.goMarket("salaries")} className="text-accent hover:underline underline-offset-4">تصفّح <Num>12,480</Num> بطاقة</button></div>}
        </Panel>
      </section>}

      <section className="space-y-3">
        <SectionTitle action="المجتمع كله" onAction={() => app.setTab("community")}>من غرفك</SectionTitle>
        {feed.length === 0 ? <Empty icon={MessageCircle} title="تابع غرفة لتظهر هنا" body="الغرف التي تتابعها تغذّي رئيسيتك." action="تصفّح الغرف" onAction={() => app.push({ type: "rooms" })} /> : <Windowed items={feed} render={(x) => <PostCard key={x.id} p={x} app={app} compact />} />}
        <p className="pb-2 text-center text-[10px] text-ink-4">جميع الرواتب وبيانات التواصل بيانات توضيحية</p>
      </section>
    </div>
  );
}


// Community filters (audit): WHO (all / verified engineers / employers / a followed room) → HOW SORTED (newest / most engaged / unanswered). One row each, broad → narrow.
export const POST_SORTS = [["new", "الأحدث", Clock], ["hot", "الأكثر تفاعلًا", TrendingUp], ["open", "بلا إجابة", MessageCircleWarning]];

// Search result: the matched post with its coverage and the query tokens it was found by (also what was matched for each)
export function SearchHit({ r, app }: any) {
  return (
    <div className="space-y-1">
      <div className="px-1 flex items-center gap-1.5 flex-wrap text-[10.5px]"><Chip tone={r.score >= SEARCH_THRESHOLD ? "verified" : "warn"} className="h-5 px-1.5 text-[10px]"><Num>{Math.round(r.score * 100)}%</Num> تطابق</Chip>{r.hits.slice(0, 4).map((h) => <span key={h.q} className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-elevated text-ink-2"><span translate="no">{h.q}</span>{h.t && h.t !== h.q && <span translate="no" className="text-ink-3">≈ {h.t}</span>}</span>)}</div>
      <PostCard p={r.post} app={app} compact />
    </div>
  );
}

export function CommunitySearch({ app, q, setQ, results }: any) {
  return (
    <div className="space-y-3">
      <label className="relative block"><Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-ink-3 pointer-events-none" /><input value={q} onChange={(e) => setQ(e.target.value)} type="search" inputMode="search" enterKeyHint="search" placeholder={app.moneyAccess === "none" ? "ابحث في المجتمع — بالمعنى لا بالحرف: صبّة، استلام، سلامة…" : "ابحث في المجتمع — بالمعنى لا بالحرف: مرتب، انترفيو، بريمافيرا…"} aria-label="بحث في المجتمع" className="w-full h-12 ps-11 pe-11 rounded-2xl bg-surface border border-line-2 text-[14px] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent" />{q && <button type="button" aria-label="مسح البحث" onClick={() => setQ("")} className="absolute top-1/2 -translate-y-1/2 end-2 grid place-items-center w-8 h-8 rounded-full text-ink-3 hover:text-ink hover:bg-elevated"><X size={16} /></button>}</label>
      {results && <>
        <div className="px-1 flex items-center justify-between gap-2 text-[11.5px] text-ink-2"><span><Num>{results.hits.length}</Num> نتيجة{results.near.length ? <> · <Num>{results.near.length}</Num> قريبة</> : null}</span><span className="text-ink-3 inline-flex items-center gap-1"><Sparkles size={11} className="text-accent" /> بحث تقريبي · تطابق ≥ <Num>80%</Num></span></div>
        {results.hits.length === 0 && results.near.length === 0 && <Empty icon={Search} title="لا نتائج قريبة" body={`لم نجد منشورًا يشبه «${results.query}» بنسبة 60% فأكثر — جرّب كلمة أقصر أو مرادفًا (راتب/مرتب، انترفيو/مقابلة).`} action="اكتب منشورًا بهذا السؤال" onAction={() => app.openSheet("compose", { text: results.query })} />}
        {results.hits.length > 0 && <div className="space-y-3 stagger">{results.hits.map((r) => <SearchHit key={r.post.id} r={r} app={app} />)}</div>}
        {results.near.length > 0 && <div className="space-y-3"><p className="px-1 text-[11px] text-ink-3 inline-flex items-center gap-1"><ArrowUpDown size={11} /> نتائج قريبة (60–80%)</p>{results.near.map((r) => <SearchHit key={r.post.id} r={r} app={app} />)}</div>}
      </>}
    </div>
  );
}

export function CommunityScreen({ app }: any) {
  const p = app.profile; const [roomF, setRoomF] = useState<any>("all"); const [sort, setSort] = useState<any>("new"); const followed = app.rooms.filter((r) => app.roomFollows[r.id]); const sup = app.moneyAccess === "none";
  const [q, setQ] = useState<any>(""); const [live, setLive] = useState<any>(""); useEffect(() => { const t = setTimeout(() => setLive(q), 140); return () => clearTimeout(t); }, [q]);
  const index = useMemo<any>(() => buildSearchIndex(app.posts), [app.posts, app.lang]); const results = useMemo<any>(() => (live.trim().length >= 2 ? searchPosts(app.posts, live, { index }) : null), [live, app.posts, index]);
  const feed = app.posts.filter((x) => roomF === "all" ? true : roomF === "employers-any" ? (x.userRole === "hr" || x.userRole === "owner") : roomF === "verified" ? ((x.userRole || "engineer") === "engineer" && x.verified !== false) : x.room === roomF)
    .filter((x) => sort !== "open" || (x.type === "question" && !x.best))
    .sort((a, b) => sort === "hot" ? engagement(b) - engagement(a) || byNewest(a, b) : byNewest(a, b));
  return (
    <div className="py-4 space-y-4">
      <div className="px-1 flex items-end justify-between gap-3"><div><h1 className="text-[22px] font-medium">المجتمع</h1><p className="text-[12px] text-ink-2">{sup ? "باسمك أو بدون اسم — أنت تختار. بلغة محترمة." : "باسمك أو بدون اسم — أنت تختار. بالأرقام وبلغة محترمة."}</p></div><button type="button" onClick={() => app.push({ type: "permissions" })} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface border border-line-2 text-[11.5px] text-ink-2 hover:text-ink"><ShieldCheck size={13} className="text-accent" /> القواعد</button></div>
      <CommunitySearch app={app} q={q} setQ={setQ} results={results} />
      {!results && <>
      <section>
        <SectionTitle action="كل الغرف" onAction={() => app.push({ type: "rooms" })}>الغرف</SectionTitle>
        <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto no-scrollbar snap-x scroll-ps-4">{[...app.rooms].sort((a, b) => Number(!!app.roomFollows[b.id]) - Number(!!app.roomFollows[a.id]) || b.members - a.members).map((r) => <RoomCard key={r.id} r={r} app={app} compact />)}</div>
      </section>
      <button type="button" onClick={() => app.openSheet("compose")} className="press w-full flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-dashed border-line-3 text-start hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <IdentityFace a={authorOf(p, p.identity)} size={40} /><span className="min-w-0"><span className="block text-[14px] font-medium">{sup ? gx(p.gender, "اسأل زملاءك، أو شارك تجربة من الموقع", "اسألي زملاءك، أو شاركي تجربة من الموقع") : gx(p.gender, "اسأل، أو اعرض رقمك، أو خلّي الناس تصوّت", "اسألي، أو اعرضي رقمك، أو خلّي الناس تصوّت")}</span><span className="block text-[11.5px] text-ink-2 leading-snug">علنًا باسمك أو مجهولًا — {gx(p.gender, "تختار", "تختارين")} في كل منشور.</span></span>
      </button>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={roomF === "all"} onClick={() => setRoomF("all")}>الكل</FilterChip><FilterChip on={roomF === "verified"} onClick={() => setRoomF("verified")}><BadgeCheck size={12} />مهندسون موثّقون</FilterChip><FilterChip on={roomF === "employers-any"} onClick={() => setRoomF("employers-any")}><Building2 size={12} />جهات العمل</FilterChip>{followed.map((r) => <FilterChip key={r.id} on={roomF === r.id} onClick={() => setRoomF(r.id)}><r.icon size={12} />{r.name}</FilterChip>)}</div>
      <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar"><span className="shrink-0 text-[11px] text-ink-3 inline-flex items-center gap-1"><ArrowUpDown size={12} /> ترتيب</span>{POST_SORTS.map(([id, l, I]: any) => <FilterChip key={id} on={sort === id} onClick={() => setSort(id)}><I size={12} />{l}</FilterChip>)}</div>
      <div key={roomF + sort} className="space-y-3 stagger">{feed.length === 0 ? <Empty icon={MessageCircle} title={sort === "open" ? "لا أسئلة بلا إجابة" : "الغرفة هادية"} body={sort === "open" ? "كل سؤال هنا له إجابة معتمدة — جرّب ترتيبًا آخر." : "كن أول من يفتح النقاش هنا."} action="اكتب منشورًا" onAction={() => app.openSheet("compose", { room: roomF })} /> : <Windowed items={feed} render={(x) => <PostCard key={x.id} p={x} app={app} compact />} />}</div>
      </>}
      <p className="pb-2 text-center text-[10px] text-ink-4">{sup ? "حساب مشرف موقع · المجتمع فقط — الأرقام المالية مخفية" : "جميع الرواتب بيانات توضيحية"}</p>
    </div>
  );
}


// Jobs filters (audit): SCOPE seg (for you / all / saved) → classification, broad → narrow (discipline → sub-discipline → position) → place (region) → SORT.
// «لك» opens ordered by match score and the other scopes by newest — every sort chip works in every scope. Sub-discipline chips use the generic track name until a discipline is picked.
export const JOB_SORTS = [["best", "الأنسب لي", Sparkles], ["new", "الأحدث", Clock], ["pay", "الأعلى نطاقًا", TrendingUp]];

export function JobsScreen({ app }: any) {
  const p = app.profile; const co = app.isCo; const [f, setF] = useState<any>(co ? "company" : "match"); const [disc, setDisc] = useState<any>("all"); const [sub, setSub] = useState<any>("all"); const [pos, setPos] = useState<any>("all"); const [region, setRegion] = useState<any>("all"); const [sort, setSort] = useState<any>(co ? "new" : "best");
  const scored = app.jobs.map((j) => ({ j, m: matchJob(j, p), e: estimateFor(j) }));
  const myJobs = app.jobs.filter((j) => j.co === p.companyId || j.mine);
  const scope = f === "match" ? scored.filter((x) => x.m && x.m.score >= 40) : f === "saved" ? scored.filter((x) => app.saved["job:" + x.j.id]) : f === "company" ? scored.filter((x) => myJobs.includes(x.j)) : scored;
  const list = scope.filter(({ j }) => (disc === "all" || j.disc === disc) && (sub === "all" || j.sub === sub) && (pos === "all" || j.pos === pos) && (region === "all" || gov(j.gov)[2] === region))
    .sort((a, b) => sort === "best" && a.m && b.m ? (b.m.score - a.m.score || byNewest(a.j, b.j)) : sort === "pay" ? (b.e.mid - a.e.mid || byNewest(a.j, b.j)) : byNewest(a.j, b.j)).map((x) => x.j);
  const perfect = scored.filter((x) => x.m && x.m.perfect).length; const active = Number(disc !== "all") + Number(sub !== "all") + Number(pos !== "all") + Number(region !== "all");
  const reset = () => { setDisc("all"); setSub("all"); setPos("all"); setRegion("all"); };
  return (
    <div className="py-4 space-y-3">
      <div className="px-1 flex items-end justify-between gap-3"><div><h1 className="text-[22px] font-medium">الوظائف</h1><p className="text-[12px] text-ink-2 leading-snug">{co ? "تصنيف إلزامي، نطاق راتب يحسبه EngSpace، والتقديم يصلك مباشرة على بريدك." : perfect ? `${perfect} وظيفة مطابقة تمامًا لتصنيفك — وصلتك إشعاراتها. التقديم مباشرة مع الشركة.` : "كل إعلان مصنّف بدقة ومقارن بسوقك — والتقديم مباشرة مع الشركة."}</p></div>{co && <Primary onClick={() => app.push({ type: "postjob" })} className="h-10 px-4 text-[13px] press shrink-0"><Plus size={15} /> نشر وظيفة</Primary>}</div>
      <Seg value={f} onChange={(v) => { setF(v); if (v === "match") setSort("best"); }} items={co ? [["company", `وظائف شركتي (${myJobs.length})`], ["all", "السوق كله"]] : [["match", "لك"], ["all", "الكل"], ["saved", `المحفوظة${Object.keys(app.saved).filter((k) => k.startsWith("job:") && app.saved[k]).length ? ` (${Object.keys(app.saved).filter((k) => k.startsWith("job:") && app.saved[k]).length})` : ""}`]]} />
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={disc === "all"} onClick={() => { setDisc("all"); setSub("all"); }}>كل التخصّصات</FilterChip>{DISC.map(([id, l]: any) => <FilterChip key={id} on={disc === id} onClick={() => { setDisc(id); setSub("all"); }}>{l} <Num className="text-[10px] text-ink-3">{scope.filter((x) => x.j.disc === id).length}</Num></FilterChip>)}</div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={sub === "all"} onClick={() => setSub("all")}>كل المسارات</FilterChip>{(disc === "all" ? TRACKS : tracksFor(disc)).map(([id, generic]: any) => <FilterChip key={id} on={sub === id} onClick={() => setSub(id)}>{disc === "all" ? generic : trackLabel(id, disc)}</FilterChip>)}</div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={pos === "all"} onClick={() => setPos("all")}>كل المسميات</FilterChip>{POSITIONS.map(([id]: any) => <FilterChip key={id} on={pos === id} onClick={() => setPos(id)}>{posShort(id)}</FilterChip>)}</div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={region === "all"} onClick={() => setRegion("all")}>كل المناطق</FilterChip>{REGIONS.map(([id, l]: any) => <FilterChip key={id} on={region === id} onClick={() => setRegion(id)}><MapPin size={12} />{l}</FilterChip>)}</div>
      <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar"><span className="shrink-0 text-[11px] text-ink-3 inline-flex items-center gap-1"><ArrowUpDown size={12} /> ترتيب</span>{JOB_SORTS.filter(([id]: any) => !(co && id === "best")).map(([id, l, I]: any) => <FilterChip key={id} on={sort === id} onClick={() => setSort(id)}><I size={12} />{l}</FilterChip>)}</div>
      <div className="px-1 flex items-center justify-between text-[11px] text-ink-3"><span><Num>{list.length}</Num> وظيفة{active ? ` · ${active} مرشح${active > 1 ? "ات" : ""}` : ""}</span>{active > 0 && <button type="button" onClick={reset} className="text-accent hover:underline underline-offset-4">إعادة الضبط</button>}</div>
      <div key={f + disc + sub + pos + region + sort} className="space-y-3 stagger">{list.length === 0 ? <Empty icon={f === "saved" ? Bookmark : Briefcase} title={f === "match" ? "لا وظائف مطابقة بعد" : f === "company" ? "لم تنشر وظائف بعد" : f === "saved" ? "لا وظائف محفوظة" : "لا وظائف هنا"} body={f === "match" ? "نُخطرك فور نشر وظيفة تطابق تخصّصك ومسارك ومسمّاك ومكانك." : f === "company" ? "انشر إعلانك الأول — الصق الوصف ونصنّفه لك." : f === "saved" ? "احفظ الوظائف التي تنوي التقديم عليها لتعود إليها هنا." : "جرّب مرشحات أوسع."} action={f === "company" ? "نشر وظيفة" : f === "all" && [disc, sub, pos, region].every((x) => x === "all") ? null : "عرض الكل"} onAction={() => f === "company" ? app.push({ type: "postjob" }) : (setF("all"), reset())} /> : <Windowed items={list} render={(j) => <JobCard key={j.id} job={j} app={app} />} />}</div>
      {!co && list.length > 0 && <p className="pb-2 text-center text-[10px] text-ink-4">التقديم يتم مباشرة مع الشركة عبر بريدك أو هاتفك — EngSpace لا يتوسط ولا يحتفظ بطلبك</p>}
    </div>
  );
}


export function MarketScreen({ app }: any) {
  const sub = app.market === "tools" ? "salaries" : app.market;
  return (
    <div className="py-4 space-y-3">
      <div className="px-1"><h1 className="text-[22px] font-medium">السوق</h1><p className="text-[12px] text-ink-2">الرواتب والشركات — نموذج {DATASET.version}.</p></div>
      <Seg value={sub} onChange={app.setMarket} items={[["salaries", "الرواتب"], ["companies", "الشركات"]]} />
      <div key={sub} className="screen-tab">{sub === "companies" ? <CompaniesBody app={app} /> : <SalariesBody app={app} />}</div>
    </div>
  );
}


// Companies filters (audit): SEARCH → CATEGORY → REGION → SORT, with deterministic tie-breakers (reports, then median) and nulls last.
export function CompaniesBody({ app }: any) {
  const [q, setQ] = useState<any>(""); const [sort, setSort] = useState<any>("reports"); const [cat, setCat] = useState<any>("all"); const [region, setRegion] = useState<any>("all");
  const qq = q.trim().toLowerCase();
  const list = COMPANIES.filter((c) => (cat === "all" || c.cat === cat) && (region === "all" || gov(c.hq)[2] === region) && (!qq || c.name.includes(q.trim()) || c.en.toLowerCase().includes(qq) || c.sector.includes(q.trim()) || govName(c.hq).includes(q.trim())))
    .sort((x, y) => sort === "reports" ? (y.reports - x.reports || y.median - x.median) : sort === "median" ? (y.median - x.median || y.reports - x.reports) : sort === "founded" ? ((x.founded || 9999) - (y.founded || 9999) || y.reports - x.reports) : (y.recommend - x.recommend || y.reports - x.reports));
  const withLogo = COMPANIES.filter((c) => c.logo).length;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 h-12 px-4 rounded-2xl bg-surface border border-line-2 focus-within:ring-2 focus-within:ring-accent"><Search size={17} className="text-ink-3 shrink-0" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الشركة أو القطاع أو المحافظة" aria-label="بحث عن شركة" className="w-full min-w-0 bg-transparent text-[14px] placeholder:text-ink-4 focus:outline-none" />{q && <button type="button" aria-label="مسح البحث" onClick={() => setQ("")} className="grid place-items-center w-8 h-8 rounded-full text-ink-2 hover:text-ink"><X size={15} /></button>}</label>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={cat === "all"} onClick={() => setCat("all")}>كل الفئات</FilterChip>{CATS.map(([id, l]: any) => <FilterChip key={id} on={cat === id} onClick={() => setCat(id)}>{l} <Num className="text-[10px] text-ink-3">{COMPANIES.filter((c) => c.cat === id).length}</Num></FilterChip>)}</div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar"><FilterChip on={region === "all"} onClick={() => setRegion("all")}>كل المناطق</FilterChip>{REGIONS.map(([id, l]: any) => <FilterChip key={id} on={region === id} onClick={() => setRegion(id)}><MapPin size={12} />{l}</FilterChip>)}</div>
      <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar"><span className="shrink-0 text-[11px] text-ink-3 inline-flex items-center gap-1"><ArrowUpDown size={12} /> ترتيب</span>{[["reports", "الأكثر تقارير"], ["median", "الأعلى راتبًا"], ["recommend", "الأعلى توصية"], ["founded", "الأقدم"]].map(([id, l]: any) => <FilterChip key={id} on={sort === id} onClick={() => setSort(id)}>{l}</FilterChip>)}</div>
      {CAT_DESC[cat] && <div className="p-3.5 rounded-2xl border border-info/20 bg-info/10 text-[12.5px] leading-[1.8]"><span className="inline-flex items-center gap-1.5 font-medium text-info"><Coins size={14} /> {catName(cat)}</span><p className="mt-1 text-ink-2">{CAT_DESC[cat]}</p>{cat === "backoffice" && <p className="mt-1 text-[11px] text-ink-3">أسعار مرجعية: <Num>1</Num> USD ≈ <Num>{FX.USD}</Num> ج.م · <Num>1</Num> SAR ≈ <Num>{FX.SAR}</Num> · <Num>1</Num> AED ≈ <Num>{FX.AED}</Num> · <Num>1</Num> EUR ≈ <Num>{FX.EUR}</Num> — تقريبية، تُحدَّث شهريًا.</p>}</div>}
      <div key={sort + q + cat + region} className="space-y-3 stagger">{list.length === 0 ? <Empty icon={Search} title="لا نتائج" body="لا شركة تطابق هذا المزيج. وسّع الفئة أو المنطقة." action="إعادة الضبط" onAction={() => { setQ(""); setCat("all"); setRegion("all"); }} /> : <Windowed items={list} render={(c) => <CompanyRow key={c.id} c={c} app={app} />} />}</div>
      <p className="pb-2 text-center text-[10px] text-ink-4 leading-relaxed"><Num>{list.length}</Num> من <Num>{COMPANIES.length}</Num> جهة · <Num>{withLogo}</Num> شعارًا حقيقيًا من المواقع الرسمية وويكيبيديا · الحقائق من السجل العام والأرقام نموذجية</p>
    </div>
  );
}


// Salaries filters (audit): discipline → sub-discipline → years → place — the same order as the market model's factors.
export function SalariesBody({ app }: any) {
  const pr = app.profile; const d0 = (app.isCo ? "civil" : pr.disc); const [disc, setDisc] = useState<any>(d0); const [exp, setExp] = useState<any>(app.isCo ? "3-5" : personaExp(pr)); const [g, setG] = useState<any>(pr.gov); const [city, setCity] = useState(pr.city || null); const [track, setTrack] = useState<any>(app.isCo ? "site" : pr.track); const [showPlace, setShowPlace] = useState(false);
  const m = marketFor(disc, exp, g, track, city); const n = sampleSize(disc, exp, g); const q = quality(n); const reports = reportsFor(disc, exp, g);
  const thin = app.isCo && n < COMPANY_MIN_SAMPLE; // company accounts: a cell with too few reports could point at individuals
  // cloud: live member reports above the model; give-to-get comes from the server's answer, not from this device
  const live = useLiveSalary(disc, exp, g, app.salaryRev); const CLOUD = isCloud();
  const unlocked = CLOUD ? !!(live.data && live.data.access === "full") : can(pr, "bands"); const rlist = CLOUD ? live.shares : reports;
  return (
    <div className="space-y-4">
      {app.isCo && <div className="p-3.5 rounded-2xl border border-accent/20 bg-wash text-[12px] leading-relaxed"><p className="font-medium inline-flex items-center gap-1.5"><Scale size={14} className="text-accent" /> حدود اطلاع حسابات الشركات</p><p className="mt-1 text-ink-2">متوسطات ونطاقات السوق فقط — لتعرض أرقامًا عادلة. لا أرقام فردية، ولا تفاصيل مسميات لشركات غير شركتك.</p></div>}
      <div className="px-1 flex items-start justify-between gap-3"><p className="text-[12px] text-ink-2 leading-snug">صافي شهري بالجنيه — ما يصل حسابك بعد الضرائب والتأمينات · نموذج {DATASET.version}</p>{can(pr, "reveal") && <Primary onClick={() => app.openSheet("contribute", { disc, exp, gov: g, city })} className="h-10 px-4 text-[13px] press shrink-0">شارك راتبك</Primary>}</div>
      <div className="space-y-2">
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{DISC.map(([id, l]: any) => <FilterChip key={id} on={disc === id} onClick={() => { setDisc(id); if (!tracksFor(id).some((t) => t[0] === track)) setTrack("site"); }}>{l}</FilterChip>)}</div>
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{tracksFor(disc).map(([id]: any) => <FilterChip key={id} on={track === id} onClick={() => setTrack(id)}>{trackLabel(id, disc)}</FilterChip>)}</div>
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{EXP.map(([id, l]: any) => <FilterChip key={id} on={exp === id} onClick={() => setExp(id)}>{l}</FilterChip>)}</div>
        <button type="button" onClick={() => setShowPlace((v) => !v)} aria-expanded={showPlace} className="press w-full flex items-center justify-between gap-2 min-h-11 px-4 py-2 rounded-2xl bg-surface border border-line-2 text-[13px] text-start"><span className="inline-flex items-center gap-2 flex-wrap"><MapPin size={14} className="text-accent shrink-0" />{placeName(g, city)} <span className="text-[11px] text-ink-3">· {regionName(gov(g)[2])} · معامل <Num>{placeMult(g, city).toFixed(2)}</Num></span></span><ChevronDown size={16} className={`shrink-0 text-ink-2 transition-transform ${showPlace ? "rotate-180" : ""}`} /></button>
        {showPlace && <div className="screen-tab p-4 rounded-2xl bg-surface border border-line-2 -mx-1"><GovPicker gov={g} city={city} onChange={(gg, cc) => { setG(gg); setCity(cc); }} /></div>}
      </div>
      <LiveSalaryPanel app={app} live={live} disc={disc} exp={exp} g={g} track={track} />
      <Panel className="p-4">
        {CLOUD && <p className="mb-1 text-[11px] font-medium text-ink-3">النموذج المرجعي — تقدير من مصادر السوق، ليس من تقارير الأعضاء</p>}
        <div className="flex items-start justify-between gap-2"><span className="text-[11px] text-ink-2 leading-snug">{ROLE[disc]} · {trackLabel(track, disc)} · {label(EXP, exp)} · {placeName(g, city)}</span><Chip tone={q[1]} className="h-6 px-2 text-[10.5px] shrink-0">{q[0]} · <Num>{n}</Num></Chip></div>
        {thin ? <p className="mt-2 p-3 rounded-xl bg-canvas/60 border border-line text-[12px] leading-relaxed text-ink-2 flex items-start gap-2"><LockKeyhole size={13} className="shrink-0 mt-0.5 text-ink-3" />عينة صغيرة (<Num>{n}</Num> تقرير) — تُخفى عن حسابات الشركات حتى <Num>{COMPANY_MIN_SAMPLE}</Num> تقريرًا حمايةً للأفراد. وسّع المكان أو الخبرة.</p> : <>
        <div className="mt-1"><Money n={m.p50} size="text-[38px]" /></div>
        <p className="mt-3 text-[11px] text-ink-2">التوزيع من P10 إلى P90 — النطاق الغامق هو الربعان الأوسطان</p><div className="mt-1"><Percentiles m={m} /></div></>}
        <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-2 text-[11.5px]"><button type="button" onClick={() => app.openSheet("tool", { id: "net", net: m.p50 })} className="text-start text-ink-2 hover:text-accent">الإجمالي المقابل؟ حاسبة الصافي والإجمالي</button><button type="button" onClick={() => app.openSheet("methodology")} className="inline-block py-1 -my-1 text-accent text-end hover:underline underline-offset-4">المنهجية والمصادر</button></div>
      </Panel>
      <Panel className="p-4"><h3 className="text-[13px] font-medium">حسب المسمّى الدقيق</h3><ul className="mt-2 divide-y divide-line">{POSITIONS.map(([id, l, e, k]: any) => { const mm = marketFor(disc, e, g, track, city); return <li key={id} className={`py-2.5 flex items-center justify-between gap-3 text-[13px] ${id === pr.pos && !app.isCo ? "-mx-2 px-2 rounded-lg bg-wash" : ""}`}><span className="text-ink-2 leading-snug">{l}</span><span className="shrink-0"><Num className="font-semibold">{fmt(round500(mm.p50 * k))}</Num> <span className="text-[11px] text-ink-3">ج.م</span></span></li>; })}</ul></Panel>
      <Panel className="p-4"><h3 className="text-[13px] font-medium">حسب نوع الجهة</h3><ul className="mt-2 divide-y divide-line">{EMPLOYERS.map(([id, l, k]: any) => <li key={id} className={`py-2.5 flex items-center justify-between gap-3 text-[13px] ${id === "backoffice" ? "-mx-2 px-2 rounded-lg bg-info/10" : ""}`}><span className={id === "backoffice" ? "text-info inline-flex items-center gap-1.5 leading-snug" : "text-ink-2 leading-snug"}>{id === "backoffice" && <Coins size={13} className="shrink-0" />}{l}</span><span className="shrink-0"><Num className="font-semibold">{fmt(round500(m.p50 * k))}</Num> <span className="text-[11px] text-ink-3">ج.م</span></span></li>)}</ul><p className="mt-2 text-[10.5px] text-ink-3">المكاتب الخلفية تسعّر بالعملة الأجنبية — راجع فئة «مكاتب خلفية» في الشركات.</p></Panel>
      <Panel className="p-4"><h3 className="text-[13px] font-medium">بدلات نموذجية فوق الأساسي</h3><ul className="mt-2 divide-y divide-line">{ALLOWANCES.map(([l, lo, hi, note]: any) => <li key={l} className="py-2.5 flex items-center justify-between gap-3 text-[12.5px]"><span><span className="text-ink">{l}</span><span className="block text-[10.5px] text-ink-3">{note}</span></span><span className="shrink-0 text-ink">{hi <= 2 ? <><Num>{lo}–{hi}</Num> راتب</> : <><Num>{fmt(lo)}–{fmt(hi)}</Num> <span className="text-[10.5px] text-ink-3">ج.م</span></>}</span></li>)}</ul></Panel>
      {app.isCo ? <CompanyLimits /> : <>
      <section>
        <SectionTitle>{unlocked ? "أحدث التقارير" : "أحدث التقارير · مقفلة"}</SectionTitle>
        <div className="relative space-y-2">
          {CLOUD && unlocked && rlist.length === 0 && <p className="p-3.5 rounded-2xl bg-surface border border-line text-[12.5px] text-ink-2">لا تقارير فردية في هذه الخلية بعد.</p>}
          {/* locked in the cloud: the server sends no rows, so the blurred cards are the model's, never anyone's real number */}
          {(CLOUD && !unlocked ? reports : rlist).map((r) => <Panel key={r.id} className="p-3.5"><div className={unlocked ? "" : "blur-[6px] select-none"} aria-hidden={!unlocked}>
            <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-ink-2"><AnonChip id={r.anon} spec={disc} /><span>{r.title} · {r.years} سنوات</span>{r.verified && <ShieldCheck size={13} className="text-good shrink-0" />}<span className="ms-auto shrink-0 text-ink-3">{r.when}</span></div>
            <div className="mt-1.5 flex items-center justify-between gap-2">{r.coId ? <button type="button" onClick={() => app.push({ type: "company", id: r.coId })} className="text-[13px] text-ink hover:text-accent text-start">{r.company}</button> : <span className="text-[13px] text-ink">{r.company || "—"}</span>}<span className="shrink-0"><Num className="text-[16px] font-semibold">{fmt(r.salary)}</Num> <span className="text-[11px] text-ink-3">ج.م</span></span></div></div></Panel>)}
          {!unlocked && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center"><span className="glow-pulse grid place-items-center w-11 h-11 rounded-full bg-wash border border-accent/25 text-accent"><LockKeyhole size={18} /></span><p className="text-[13.5px] font-medium">{app.isCo ? "التقارير الفردية تُفتح بعد نشر أول وظيفة" : "التقارير الفردية تُفتح بعد مشاركة راتبك"}</p>{app.isCo ? <Primary onClick={() => app.push({ type: "postjob" })} className="h-11 px-6 press">انشر وظيفة <Forward /></Primary> : <Primary onClick={() => app.openSheet("contribute", { disc, exp, gov: g, city })} className="h-11 px-6 press">شارك راتبك <Forward /></Primary>}</div>}
        </div>
      </section>
      </>}
    </div>
  );
}


// What a company account can and cannot see of pay — shown where engineers see individual reports
export const CompanyLimits = () => (
  <Panel className="p-4"><h3 className="text-[13px] font-medium inline-flex items-center gap-1.5"><LockKeyhole size={14} className="text-accent" /> التقارير الفردية لا تظهر لحسابات الشركات</h3>
    <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-ink-2">{[["متاح", "المتوسط والنطاق (P10–P90) لكل تخصص وخبرة ومكان، وحسب المسمّى ونوع الجهة", true], ["متاح", "تفاصيل المسميات لشركتك فقط", true], ["غير متاح", "رقم أي مهندس بعينه: التقارير الفردية، منشورات كشف الراتب، الردود بالأرقام، والمبالغ المكتوبة في المنشورات والتقييمات", false], ["غير متاح", `أي خلية فيها أقل من ${COMPANY_MIN_SAMPLE} تقريرًا`, false], ["غير متاح", "مشاركة رواتب أو تقييم الشركات", false]].map(([k, t, ok]: any) => <li key={t} className="flex items-start gap-2"><span className={`shrink-0 mt-0.5 inline-flex items-center h-5 px-1.5 rounded-full text-[10px] ${ok ? "bg-good/15 text-good" : "bg-elevated text-ink-3"}`}>{k}</span><span>{t}</span></li>)}</ul>
    <p className="mt-2 text-[10.5px] text-ink-3">الهدف: أن تبني عروضك على السوق الحقيقي — دون أن ترى ما يكسبه مهندس بعينه.</p></Panel>
);


// Tools tab — back in the main navigation. The CV reviewer sits on top; the eight calculators keep their goal-based highlight.
export function ToolsScreen({ app }: any) {
  const p = app.profile; const fav = GOAL_TOOL[p.goal]; const b = app.blocked || {};
  // what this role may open: site supervisors — site tools + checklists; HR — the CV review only; everyone else — all of it
  const cvOpen = !(b.stack || []).includes("cvreview"), checksOpen = !(b.stack || []).includes("checklists"), methodOpen = !(b.sheets || []).includes("methodology");
  const site = TOOLS.filter((t: any) => t.group === "site" && toolOpen(b, t.id)), money = TOOLS.filter((t: any) => t.group !== "site" && toolOpen(b, t.id));
  const intro = !cvOpen ? "حصر الخرسانة والحديد والمباني، تحويل الوحدات، وقوائم فحص واستلام الأعمال — كله على جهازك." : !site.length && !money.length ? "راجع السير الذاتية للمرشحين بمعايير المقاولين والاستشاريين — على جهازك، دون رفع الملف لأي خادم." : "حسابات مصرية بأرقام السوق الحقيقية، ومراجع ذكي لسيرتك الذاتية — كله على جهازك.";
  return (
    <div className="py-4 space-y-3">
      <div className="px-1"><h1 className="text-[22px] font-medium">الأدوات</h1><p className="text-[12px] text-ink-2">{intro}</p></div>
      {cvOpen && <button type="button" onClick={() => app.push({ type: "cvreview" })} className="press w-full flex items-center gap-3 p-4 rounded-2xl border border-accent/25 text-start shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ background: "linear-gradient(125deg, rgb(var(--wash)), rgb(var(--surface)) 80%)" }}>
        <span className="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-accent text-on-accent shadow-[0_8px_24px_-8px_rgb(var(--accent))]"><FileSearch size={22} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">تدقيق السيرة الذاتية الهندسية</span><span className="block text-[12px] text-ink-2 leading-snug">تدقيق واحد بمعايير المقاولين والاستشاريين والشركات الدولية: عمق البرامج، حجم المشاريع بالأرقام، المسار، الأكواد والشهادات، وATS — مع إعادة كتابة بنودك سطرًا بسطر</span></span><span className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent text-on-accent text-[10px]">جديد</span>
      </button>}
      {/* Feature 6 & 7: the technical office and the site */}
      {(checksOpen || site.length > 0) && <SectionTitle>المكتب الفني والموقع</SectionTitle>}
      {checksOpen && <button type="button" onClick={() => app.push({ type: "checklists" })} className="press w-full flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line text-start shadow-card"><span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-wash text-accent"><ClipboardCheck size={20} /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">فحص واستلام الأعمال (QA/QC)</span><span className="block text-[11.5px] text-ink-2 leading-snug">9 قوائم للموقع والمكتب الفني — احفظ، ثم صدّر تقرير PDF للتوقيع</span></span><Forward /></button>}
      {site.length > 0 && <div className="grid grid-cols-2 gap-3">{site.map((t) => <button key={t.id} type="button" onClick={() => app.openSheet("tool", { id: t.id })} className="press relative p-4 rounded-2xl border text-start shadow-card bg-surface border-line hover:border-line-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="grid place-items-center w-11 h-11 rounded-xl bg-wash text-accent"><t.icon size={20} /></span><span className="block mt-3 text-[14px] font-medium leading-snug">{t.name}</span><span className="block mt-0.5 text-[11.5px] text-ink-2 leading-snug">{t.desc}</span></button>)}</div>}
      {money.length > 0 && <>
      <SectionTitle>الراتب والعروض</SectionTitle>
      <div className="grid grid-cols-2 gap-3 stagger">{money.map((t) => <button key={t.id} type="button" onClick={() => app.openSheet("tool", { id: t.id })} className={`press relative p-4 rounded-2xl border text-start shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${t.id === fav ? "border-accent/40 bg-wash" : "bg-surface border-line hover:border-line-3"}`}>
        {t.id === fav && <span className="absolute top-3 end-3 text-[9.5px] text-accent">لهدفك</span>}
        <span className={`grid place-items-center w-11 h-11 rounded-xl ${t.id === fav ? "bg-accent text-on-accent" : "bg-wash text-accent"}`}><t.icon size={20} /></span>
        <span className="block mt-3 text-[14px] font-medium leading-snug">{t.name}</span><span className="block mt-0.5 text-[11.5px] text-ink-2 leading-snug">{t.desc}</span>
      </button>)}</div></>}
      {methodOpen && money.length > 0 && <><button type="button" onClick={() => app.openSheet("methodology")} className="press w-full flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line text-start"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><FileCheck size={18} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">المنهجية والمصادر · {DATASET.version}</span><span className="block text-[11px] text-ink-2 leading-snug">الحد الأدنى للأجور، سقف التأمينات، شرائح الضريبة، كيف نبني النماذج، وكيف تُرتَّب القوائم</span></span><Forward size={16} /></button>
      <p className="pb-2 text-center text-[10px] text-ink-4">الضرائب والتأمينات حسب القانون الساري · محدَّث {DATASET.updated}</p></>}
    </div>
  );
}

export const ToolsBody = ToolsScreen;


export function InboxScreen({ app }: any) {
  const [sub, setSub] = useState<any>("threads"); const unreadT = app.threads.reduce((a, t) => a + (t.unread || 0), 0);
  const threads = [...app.threads].sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0));
  return (
    <div className="py-4 space-y-3">
      <div className="px-1"><h1 className="text-[22px] font-medium">الرسائل</h1><p className="text-[12px] text-ink-2 leading-snug">رسائل خاصة باسمك أو بمعرّفك المجهول — تُثبَّت الهوية مع أول رسالة. شارك رقمك أو بريدك متى شئت؛ القيد الوحيد لغة محترمة.</p></div>
      <Seg value={sub} onChange={setSub} items={[["threads", `المحادثات${unreadT ? ` (${unreadT})` : ""}`], ["notifs", `الإشعارات${app.unread ? ` (${app.unread})` : ""}`]]} />
      {sub === "threads" ? (
        <div className="space-y-2 stagger">
          <div className="p-3 rounded-xl bg-wash border border-accent/20 text-[11.5px] leading-relaxed text-ink-2 flex gap-2"><ShieldCheck size={15} className="text-accent shrink-0 mt-0.5" /><span>أرقام الهواتف والبريد والروابط مسموح بها في الخاص. يُحجب السباب والإهانة والتهديد والتحرّش فقط. <button type="button" onClick={() => app.push({ type: "permissions" })} className="inline-block py-1 -my-1 text-accent hover:underline underline-offset-4">من يستطيع مراسلة من؟</button></span></div>
          {threads.length === 0 && <Empty icon={MessageCircle} title="لا محادثات بعد" body="ابدأ من ملف عضو أو من صفحة وظيفة — حسب قواعد العلاقة." />}
          {threads.map((t) => { const last = t.messages[t.messages.length - 1]; return (
            <Panel key={t.id} className="p-3.5"><button type="button" onClick={() => app.push({ type: "chat", id: t.id })} className="press block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <div className="flex items-start gap-2.5"><IdentityFace a={t.with} size={40} /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 flex-wrap">{t.with.as === "public" ? <span className="text-[12.5px] font-medium">{displayName(t.with)}</span> : <Num className="text-[12.5px] font-medium">#{t.with.anon}</Num>}<RoleBadge role={t.with.role} verified={t.with.verified} gender={t.with.gender} compact /><span className="inline-flex items-center gap-1 text-[10px] text-ink-3">أنت: <IdentityTag as={t.meAs} /></span>{t.unread > 0 && <span className="w-2 h-2 rounded-full bg-accent" />}<span className="ms-auto text-[10.5px] text-ink-3">{last ? last.at : ""}</span></div><p className="mt-0.5 text-[11px] text-ink-2 leading-snug">{t.with.title}</p><p className={`mt-1 text-[13px] leading-relaxed ${t.unread ? "text-ink" : "text-ink-2"}`}>{last ? (last.blocked ? "⛔ رسالة محجوبة — " + last.hits.join("، ") : <>{last.from === "me" && <span>أنت: </span>}<span {...UGC}>{app.moneyDM(last.text)}</span></>) : ""}</p><span className="mt-1.5 inline-flex items-center gap-1 h-5 px-2 rounded-full bg-elevated text-[10px] text-ink-2">{t.ctx.type === "job" ? <Briefcase size={10} /> : <MessageCircle size={10} />}{t.ctx.label}</span></div></div>
            </button></Panel>); })}
        </div>
      ) : <NotificationsBody app={app} />}
    </div>
  );
}
