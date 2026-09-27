import { useState } from "react";
import {
  Award, Bookmark, Check, Coins, Mail, MessageCircle, Phone, ShieldCheck, Sparkles
} from "lucide-react";
import { CompanyLogo, POST_TYPES, REACTIONS, catName, company, room } from "../data/companies";
import { govName, placeName } from "../data/geo";
import { authorOf, displayName } from "../domain/identity";
import { ckey } from "../domain/moderation";
import { DISC, FX_NAMES, JOB_TYPES, WORK_MODES, label, posShort, trackLabel, yearsLabel } from "../domain/taxonomy";
import { UGC } from "../i18n/i18n";
import { Money, estimateFor, matchJob, quality } from "../lib/helpers";
import { HiddenFigure, PostImage } from "../lib/media";
import { countComments } from "../lib/posts";
import { Author, EstimateBar } from "./chrome";
import { IdentityTag, IdentityToggle } from "./identity";
import { HiddenByMe, Removed, RemovedMine } from "./moderation";
import { Chip, Num, Panel, RoundButton } from "./primitives";
import { fmt } from "./theme";

export const REACTION_HINT = { agree: "أوافق — يلغي «لا أوافق» إن كان مختارًا", disagree: "لا أوافق — يلغي «أوافق» إن كان مختارًا", useful: "مفيد — يمكن اختياره وحده أو مع أوافق/لا أوافق" };

export function Reactions({ id, counts, app, compact = false }: any) {
  const mine = app.reacts[id] || {};
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="التفاعل">
      {REACTIONS.map(([k, l, I]: any) => { const on = !!mine[k]; const n = (counts[k] || 0) + (on ? 1 : 0); return (
        <button key={k} type="button" aria-pressed={on} title={REACTION_HINT[k]} onClick={() => app.react(id, k)} className={`press inline-flex items-center gap-1 ${compact ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-[11.5px]"} rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? (k === "disagree" ? "bg-warn/10 border-warn/40 text-warn" : "bg-wash border-accent/30 text-accent") : "bg-elevated/70 border-line text-ink-2 hover:text-ink"}`}><span key={on ? "on" : "off"} className={`inline-grid place-items-center ${on ? "react-ring" : ""}`}><I size={compact ? 12 : 13} className={on ? "react-pop" : ""} /></span>{l}{n > 0 && <Num key={n} className="num-tick text-[10.5px]">{fmt(n)}</Num>}</button>); })}
    </div>
  );
}

// Votes and polls take the same public/anonymous choice as every other action; public voters are listed by name, anonymous ones only counted
export function VoterLine({ p, app, list }: any) {
  const my = app.votes[p.id]; const myAs = app.voteAs[p.id] || "anon"; const me = my != null ? authorOf(app.profile, myAs) : null;
  const names: any = [...(list || []), ...(me && myAs === "public" ? [displayName(me)] : [])];
  return (<>
    {me && <p className="text-[11px] text-ink-2 flex items-center gap-1.5 flex-wrap"><IdentityTag as={myAs} /> صوتك {myAs === "public" ? <>علني باسم <span className="text-ink">{displayName(me)}</span></> : <>مجهول بمعرّف <Num className="text-ink">#{me.anon}</Num> — لا يرتبط باسمك</>}</p>}
    {names.length > 0 && <p className="text-[10.5px] text-ink-3 leading-snug">صوّتوا علنًا: {names.join("، ")}</p>}
  </>);
}

export function VoteChoice({ app, value, onChange }: any) { return <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-ink-3">صوتك سيظهر:</span><IdentityToggle app={app} value={value} onChange={onChange} /></div>; }

export function VoteBlock({ p, app }: any) {
  const my = app.votes[p.id]; const [as, setAs] = useState<any>(app.profile.identity === "public" ? "public" : "anon"); const yes = p.vote.yes + (my === "yes" ? 1 : 0), no = p.vote.no + (my === "no" ? 1 : 0), tot = yes + no;
  return (
    <div className="mt-3 space-y-2">
      {!my && <VoteChoice app={app} value={as} onChange={setAs} />}
      {[["yes", "أقبل", yes], ["no", "أرفض", no]].map(([k, l, n]: any) => <button key={k} type="button" disabled={!!my} onClick={(e) => { e.stopPropagation(); app.vote(p.id, k, as); }} className={`press relative w-full h-11 px-4 rounded-xl border overflow-hidden text-start text-[13.5px] transition-colors ${my === k ? "border-accent/40 text-ink" : "border-line-2 text-ink"} ${my ? "" : "hover:border-accent/40"}`}>
        {my && <span className="absolute inset-y-0 start-0 bg-wash" style={{ width: `${Math.round((n / tot) * 100)}%`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />}
        <span className="relative flex items-center justify-between"><span className="inline-flex items-center gap-2">{my === k && <Check size={15} className="text-accent" />}{l}</span>{my && <Num className="text-[12px] text-ink-2">{Math.round((n / tot) * 100)}%</Num>}</span></button>)}
      <VoterLine p={p} app={app} list={p.vote.publicVoters} />
      <div className="flex justify-between text-[10.5px] text-ink-3"><span><Num>{fmt(tot)}</Num> صوت</span><span>{p.vote.ends}</span></div>
    </div>
  );
}

export function PollBlock({ p, app }: any) {
  const my = app.votes[p.id]; const [as, setAs] = useState<any>(app.profile.identity === "public" ? "public" : "anon"); const opts = p.poll.options.map(([t, n]: any, i) => [t, n + (my === i ? 1 : 0), i]); const tot = opts.reduce((a, o) => a + o[1], 0);
  return (
    <div className="mt-3 space-y-2">
      <p {...UGC} className="text-[13.5px] text-ink text-start">{app.money(p.poll.q)}</p>
      {my == null && <VoteChoice app={app} value={as} onChange={setAs} />}
      {opts.map(([t, n, i]: any) => <button key={i} type="button" disabled={my != null} onClick={(e) => { e.stopPropagation(); app.vote(p.id, i, as); }} className={`press relative w-full min-h-10 px-3 py-2 rounded-xl border overflow-hidden text-start text-[13px] transition-colors ${my === i ? "border-accent/40" : "border-line-2"} ${my == null ? "hover:border-accent/40" : ""}`}>
        {my != null && <span className="absolute inset-y-0 start-0 bg-wash" style={{ width: `${Math.round((n / tot) * 100)}%`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />}
        <span className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2">{my === i && <Check size={14} className="text-accent" />}<span {...UGC}>{app.money(t)}</span></span>{my != null && <Num className="text-[11.5px] text-ink-2">{Math.round((n / tot) * 100)}%</Num>}</span></button>)}
      <VoterLine p={p} app={app} list={p.poll.publicVoters} />
      <div className="text-[10.5px] text-ink-3"><Num>{fmt(tot)}</Num> مشارك</div>
    </div>
  );
}

export const RevealBlock = ({ r }: any) => (
  <div className="mt-3 p-3.5 rounded-xl bg-canvas/60 border border-line">
    <div className="flex items-center justify-between gap-2 flex-wrap text-[12px] text-ink-2"><span>{r.title} · {r.years} سنوات · {r.employer}</span>{r.verified && <Chip tone="verified" className="h-6 px-2 text-[10.5px]"><ShieldCheck size={11} /> موثّق</Chip>}</div>
    <div className="mt-1.5"><Money n={r.salary} size="text-[28px]" /></div>
    <div className="mt-1.5 text-[11.5px] text-ink-2">{r.company}{r.extras ? ` · ${r.extras}` : ""}</div>
  </div>
);

export const NumberReply = ({ d }: any) => (
  <div className="mt-2 p-3 rounded-xl bg-canvas/60 border border-accent/15 flex items-center justify-between gap-3 flex-wrap"><span className="text-[12px] text-ink-2">{d.title} · {d.years} سنوات · {d.company}</span><span className="shrink-0"><Num className="text-[18px] font-semibold">{fmt(d.salary)}</Num> <span className="text-[10.5px] text-ink-3">ج.م</span></span></div>
);

export const ExpReply = ({ d }: any) => <div className="mt-2 inline-flex items-center gap-2 text-[11.5px] flex-wrap"><Chip tone={d.outcome === "قبلت" ? "verified" : "warn"} className="h-6 px-2">{d.outcome}</Chip><span {...UGC} className="text-ink-3">{d.note}</span></div>;


// The author chip and the room chip are real buttons beside the card's open-post button (never nested inside it).
// On the post's own screen (`onComments` given) the body is plain text and the comment count jumps to the reply field.
export function PostCard({ p, app, compact = false, onComments = null }: any) {
  const type = POST_TYPES.find((t) => t[0] === p.type); const TI = type ? type[2] : MessageCircle; const rm = room(p.room);
  const k = ckey("post", p.id); const gone = app.removed(k); const top = app.stack[app.stack.length - 1]; const inRoom = !!(top && top.type === "room" && top.id === p.room); // inside its own room the chip is a label, not a link
  if (gone && !p.mine) return <Removed what="هذا المنشور" info={app.removedInfo(k)} />;
  if (app.hidden[k]) return <HiddenByMe what="المنشور" onUndo={() => app.unhide(k)} />;
  return (
    <Panel className="p-4">
      {gone && <RemovedMine what="منشورك" info={app.removedInfo(k)} />}
      <Author a={p} app={app} when={p.when} mine={p.mine} />
        <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10.5px]">{rm && (inRoom ? <span className="inline-flex items-center gap-1 min-h-6 px-2 rounded-full bg-elevated text-ink-2"><rm.icon size={10} />{rm.name}</span> : <button type="button" onClick={() => app.push({ type: "room", id: rm.id })} className="inline-flex items-center gap-1 min-h-6 px-2 rounded-full bg-elevated text-ink-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><rm.icon size={10} />{rm.name}</button>)}{p.type !== "question" && <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-wash text-accent"><TI size={10} />{type[1]}</span>}{p.ama && <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-good/15 text-good"><span className="w-1.5 h-1.5 rounded-full bg-good glow-pulse" /> مباشر</span>}{p.best && <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-good/15 text-good"><Award size={10} /> فيه إجابة معتمدة</span>}</div>
      {onComments ? <p {...UGC} className="mt-2.5 text-[14.5px] leading-[1.85] text-ink text-start">{app.money(p.body)}</p> : <button type="button" onClick={() => app.push({ type: "post", id: p.id })} className="mt-2.5 block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><p {...UGC} className="text-[14.5px] leading-[1.85] text-ink text-start">{app.money(p.body)}</p></button>}
      {p.image && <PostImage image={p.image} app={app} />}
      {p.type === "reveal" && (app.moneyAccess === "full" ? <RevealBlock r={p.reveal} /> : <HiddenFigure app={app} what="كشف راتب" />)}
      {p.type === "vote" && <VoteBlock p={p} app={app} />}
      {p.type === "poll" && <PollBlock p={p} app={app} />}
      <div className="mt-3 flex items-center justify-between gap-2">
        <Reactions id={p.id} counts={p.reactions} app={app} compact={compact} />
        <button type="button" onClick={() => (onComments ? onComments() : app.push({ type: "post", id: p.id }))} aria-label={onComments ? "اكتب ردًا" : "التعليقات"} className="press shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-elevated/70 border border-line text-[11.5px] text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><MessageCircle size={13} /><Num>{countComments(p.comments)}</Num></button>
      </div>
    </Panel>
  );
}


// Job card: classification chips, EngSpace expected range, match score for workers, and how to apply (e-mail / phone). No employer salary anywhere.
export function JobCard({ job, app, compact = false }: any) {
  const e = estimateFor(job), co = company(job.co) || { name: job.coName || "شركة", en: "Company" }, saved = !!app.saved["job:" + job.id]; const mt = matchJob(job, app.profile); const contacted = !!app.contacted[job.id]; const ct = job.contact || {};
  return (
    <Panel className={compact ? "p-3.5 w-[260px] shrink-0 snap-start" : "p-4"}>
      <button type="button" onClick={() => app.push({ type: "job", id: job.id })} className="press block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div className="flex items-start gap-2.5">{co.en && <CompanyLogo c={co} size={compact ? 34 : 42} logo={app.logos[co.id]} />}<div className="min-w-0 flex-1"><h3 className="text-[15px] font-medium leading-snug">{job.title}</h3><p className="mt-0.5 text-[12px] text-ink-2 leading-snug">{co.name} · {placeName(job.gov, job.city)}</p></div>{!compact && <span className="shrink-0 text-[10.5px] text-ink-3">{job.when}</span>}</div>
        <div className="mt-2 flex flex-wrap gap-1"><span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">{label(DISC, job.disc)}</span><span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">{trackLabel(job.sub, job.disc)}</span><span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">{yearsLabel(job.years)}</span><span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">{posShort(job.pos)}</span></div>
        <div className="mt-2.5"><div className="text-[10.5px] text-ink-3 inline-flex items-center gap-1"><Sparkles size={10} className="text-accent" /> النطاق المتوقع — تقدير EngSpace</div><EstimateBar e={e} compact /></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{mt && <Chip tone={mt.tone} className="h-6 px-2 text-[11px]"><Num>{mt.score}%</Num> {mt.tier}</Chip>}{contacted && <Chip tone="verified" className="h-6 px-2 text-[11px]"><Check size={11} /> تواصلت</Chip>}{!compact && <Chip className="h-6 px-2 text-[11px] gap-1">{ct.email && <Mail size={11} />}{ct.phone && <Phone size={11} />} التقديم مباشرة</Chip>}{!compact && <Chip className="h-6 px-2 text-[11px]">{label(WORK_MODES, job.mode)} · {label(JOB_TYPES, job.type)}</Chip>}{job.note && !compact && <Chip tone="info" className="h-6 px-2 text-[11px]">{job.note}</Chip>}</div>
      </button>
      {!compact && <div className="mt-2 -mb-1 flex items-center justify-between gap-2"><span className="text-[11px] text-ink-3">الوسط المتوقع <Num className="text-ink-2">{fmt(e.mid)}</Num> ج.م · <Num>{e.n}</Num> تقرير</span>
        <RoundButton label={saved ? "إلغاء الحفظ" : "حفظ الوظيفة"} aria-pressed={saved} active={saved} onClick={() => { app.toggleSaved("job:" + job.id); app.toast(saved ? "أُزيلت من المحفوظات" : "حُفظت الوظيفة"); }} className="w-10 h-10 press"><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></RoundButton></div>}
    </Panel>
  );
}


export function CompanyRow({ c, app }: any) {
  const following = !!app.follows[c.id];
  return (
    <Panel className="p-4">
      <button type="button" onClick={() => app.push({ type: "company", id: c.id })} className="press block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div className="flex items-start gap-3"><CompanyLogo c={c} size={48} logo={app.logos[c.id]} />
          <div className="min-w-0 flex-1"><div className="flex items-start gap-2 flex-wrap"><h3 className="text-[15px] font-medium leading-snug">{c.name}</h3>{following && <Chip tone="accent" className="h-5 px-1.5 text-[10px]">تتابعها</Chip>}</div><p className="text-[12px] text-ink-2 leading-snug">{c.sector} · {govName(c.hq)}</p><div className="mt-1 flex flex-wrap gap-1"><span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">{catName(c.cat)}</span>{c.grade !== "—" && <span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">تصنيف: الدرجة {c.grade}</span>}{c.founded && <span className="h-5 px-1.5 inline-flex items-center rounded-full bg-elevated text-[10px] text-ink-2">منذ <Num>{c.founded}</Num></span>}{c.cat === "backoffice" && <span className="h-5 px-1.5 inline-flex items-center gap-1 rounded-full bg-info/15 text-[10px] text-info"><Coins size={10} />{c.origin} · مرتبط بـ{FX_NAMES[c.pay.basis]} · ≈<Num>{c.pay.mult}</Num>×</span>}</div></div></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-ink-2">
          <div><div className="text-ink-3">متوسط المهندسين</div><Num className="text-[14px] font-semibold text-ink">{fmt(c.median)}</Num> ج.م</div><div><div className="text-ink-3">تقارير · {quality(c.reports)[0]}</div><Num className="text-[14px] font-semibold text-ink">{c.reports}</Num></div><div><div className="text-ink-3">ينصحون بها</div><Num className="text-[14px] font-semibold text-ink">{c.recommend}%</Num></div></div>
      </button>
    </Panel>
  );
}

export function RoomCard({ r, app, compact = false }: any) {
  const on = !!app.roomFollows[r.id];
  return (
    <Panel className={compact ? "p-3.5 w-[210px] shrink-0 snap-start" : "p-4"}>
      <button type="button" onClick={() => app.push({ type: "room", id: r.id })} className="press block w-full text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div className="flex items-start gap-3"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><r.icon size={18} /></span><div className="min-w-0"><h3 className="text-[14px] font-medium leading-snug">{r.name}</h3><p className="text-[11px] text-ink-2 leading-snug">{r.desc}</p></div></div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-3"><span><Num>{fmt(r.members)}</Num> عضو</span>{on && <span className="text-accent">تتابعها</span>}</div>
      </button>
      {!compact && <button type="button" aria-pressed={on} onClick={() => { app.toggleRoom(r.id); app.toast(on ? `ألغيت متابعة ${r.name}` : `تتابع ${r.name} — هتظهر في رئيسيتك`); }} className={`press mt-3 w-full h-10 rounded-xl border text-[13px] transition-colors ${on ? "bg-wash border-accent/40 text-accent" : "bg-elevated border-line-2 text-ink"}`}>{on ? "تتابعها ✓" : "متابعة الغرفة"}</button>}
    </Panel>
  );
}
