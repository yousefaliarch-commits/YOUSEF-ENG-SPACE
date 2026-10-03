import { useState } from "react";
import {
  AtSign, Bell, BellRing, Bookmark, Briefcase, Building2, FileCheck, Flag, IdCard, Lightbulb, LifeBuoy, Mail, MessageCircle, Send,
  ShieldAlert, ShieldCheck, Sparkles, TrendingUp, Wallet
} from "lucide-react";
import { NOTIF_CATEGORIES, notifCategory, openTarget } from "../domain/notifications";
import { Empty } from "./chrome";
import { FilterChip } from "./primitives";

// The notification center: unread counters, mark read (one, or a whole category), filter by الوظائف / المجتمع / الدعم / النظام
export function NotificationsBody({ app }: any) {
  const icons: any = { reply: MessageCircle, mention: AtSign, job: Briefcase, match: Sparkles, saved: Bookmark, company: Building2, privacy: ShieldCheck, reaction: Lightbulb, ama: Sparkles, data: FileCheck, message: Send, team: ShieldCheck, support: LifeBuoy, salary: Wallet, inflation: TrendingUp, test: BellRing, contact: Mail, mod: ShieldAlert, report: Flag, verify: IdCard };
  // a notice may carry its own English (n.en) — then it is shown as written, in the interface language
  const en = (n?: any) => app.lang === "en" && !!n.en; const title = (n?: any) => (en(n) ? <span translate="no">{n.en.title}</span> : n.title); const body = (n?: any) => (en(n) ? <span translate="no">{n.en.body}</span> : app.moneyNote(n.body));
  const [onlyUnread, setOnlyUnread] = useState(false); const [cat, setCat] = useState<any>("all");
  const catOf = (n?: any) => n.category || notifCategory(n.kind);
  const unreadIn = (c?: any) => app.notifs.filter((n) => !n.read && (c === "all" || catOf(n) === c)).length;
  const list = app.notifs.filter((n) => (cat === "all" || catOf(n) === cat) && (!onlyUnread || !n.read));
  // tapping a notice marks it read and opens what it is about (a screen by id, or the market tab); one without a target just reads
  const open = (n?: any) => {
    app.markRead(n.id); const t = n.target; if (!t) return;
    if (t.type === "methodology") { app.openSheet("methodology"); return; }
    const o = openTarget(t); if (o && o.tab) { app.setTab(o.tab); return; }
    app.push({ type: t.type, ...(t.id ? { id: t.id } : {}) }); if (t.sheet) app.openSheet(t.sheet);
  };
  const shown = unreadIn(cat);
  return (
    <div className="space-y-2">
      <div role="group" aria-label="تصنيف الإشعارات" className="-mx-4 px-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[["all", "الكل"], ...NOTIF_CATEGORIES].map(([id, l]: any) => { const n = unreadIn(id); return <FilterChip key={id} on={cat === id} onClick={() => setCat(id)}>{l}{n > 0 && <span className="ms-1.5 min-w-[18px] h-[18px] px-1 inline-grid place-items-center rounded-full bg-accent text-on-accent font-grotesk text-[10px] font-semibold">{n}</span>}</FilterChip>; })}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 mb-1"><div className="flex items-center gap-2"><p className="text-[12px] text-ink-2">{shown ? `${shown} غير مقروء` : "كل شيء مقروء"}</p><FilterChip on={onlyUnread} onClick={() => setOnlyUnread((v) => !v)}>غير المقروء فقط</FilterChip></div>{shown > 0 && <button type="button" onClick={() => app.markAllRead(cat === "all" ? undefined : cat)} className="min-h-8 text-[12px] text-accent hover:underline underline-offset-4">تحديد الكل كمقروء</button>}</div>
      {list.length === 0 && <Empty icon={Bell} title="لا إشعارات هنا" body={onlyUnread ? "كل شيء مقروء." : cat === "all" ? "ستظهر هنا الوظائف المطابقة والردود وتحديثات الدعم." : "لا شيء في هذا القسم الآن."} />}
      <div className="space-y-2 stagger">{list.map((n) => { const Icon = icons[n.kind] || Bell; return (
        <button key={n.id} type="button" onClick={() => open(n)} className={`press w-full text-start p-3.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${n.read ? "bg-surface/60 border-line" : n.kind === "match" ? "bg-wash border-accent/30" : "bg-surface border-accent/20"}`}>
          <div className="flex gap-3"><span className={`grid place-items-center w-10 h-10 shrink-0 rounded-full ${n.read ? "bg-elevated text-ink-2" : "bg-wash text-accent"}`}><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start gap-2 flex-wrap"><span className={`text-[13.5px] leading-snug ${n.read ? "text-ink-2" : "text-ink font-medium"}`}>{title(n)}</span>{!n.read && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent" />}<span className="ms-auto shrink-0 text-[10.5px] text-ink-3">{n.when}</span></div><p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{body(n)}</p></div></div></button>); })}</div>
    </div>
  );
}

export function NotificationsScreen({ app }: any) { return <div className="py-4"><NotificationsBody app={app} /></div>; }
