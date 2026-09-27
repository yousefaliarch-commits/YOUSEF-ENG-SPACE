import { useState } from "react";
import {
  Bell, Bookmark, Briefcase, Building2, FileCheck, Flag, IdCard, Lightbulb, Mail, MessageCircle, Send, 
  ShieldAlert, ShieldCheck, Sparkles
} from "lucide-react";
import { Empty } from "./chrome";
import { FilterChip } from "./primitives";

export function NotificationsBody({ app }: any) {
  const icons: any = { reply: MessageCircle, job: Briefcase, match: Sparkles, saved: Bookmark, company: Building2, privacy: ShieldCheck, reaction: Lightbulb, ama: Sparkles, data: FileCheck, message: Send, contact: Mail, mod: ShieldAlert, report: Flag, verify: IdCard };
  // a notice may carry its own English (n.en) — then it is shown as written, in the interface language
  const en = (n?: any) => app.lang === "en" && !!n.en; const title = (n?: any) => (en(n) ? <span translate="no">{n.en.title}</span> : n.title); const body = (n?: any) => (en(n) ? <span translate="no">{n.en.body}</span> : app.moneyNote(n.body));
  const [onlyUnread, setOnlyUnread] = useState(false); const list = app.notifs.filter((n) => !onlyUnread || !n.read);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1 mb-1"><div className="flex items-center gap-2"><p className="text-[12px] text-ink-2">{app.unread ? `${app.unread} غير مقروء` : "كل شيء مقروء"}</p><FilterChip on={onlyUnread} onClick={() => setOnlyUnread((v) => !v)}>غير المقروء فقط</FilterChip></div>{app.unread > 0 && <button type="button" onClick={app.markAllRead} className="min-h-8 text-[12px] text-accent hover:underline underline-offset-4">تحديد الكل كمقروء</button>}</div>
      {list.length === 0 && <Empty icon={Bell} title="لا إشعارات هنا" body="كل شيء مقروء." />}
      <div className="space-y-2 stagger">{list.map((n) => { const Icon = icons[n.kind] || Bell; return (
        <button key={n.id} type="button" onClick={() => { app.markRead(n.id); if (n.target.type === "methodology") app.openSheet("methodology"); else { app.push({ type: n.target.type, ...(n.target.id ? { id: n.target.id } : {}) }); if (n.target.sheet) app.openSheet(n.target.sheet); } }} className={`press w-full text-start p-3.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${n.read ? "bg-surface/60 border-line" : n.kind === "match" ? "bg-wash border-accent/30" : "bg-surface border-accent/20"}`}>
          <div className="flex gap-3"><span className={`grid place-items-center w-10 h-10 shrink-0 rounded-full ${n.read ? "bg-elevated text-ink-2" : "bg-wash text-accent"}`}><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start gap-2 flex-wrap"><span className={`text-[13.5px] leading-snug ${n.read ? "text-ink-2" : "text-ink font-medium"}`}>{title(n)}</span>{!n.read && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent" />}<span className="ms-auto shrink-0 text-[10.5px] text-ink-3">{n.when}</span></div><p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{body(n)}</p></div></div></button>); })}</div>
    </div>
  );
}

export function NotificationsScreen({ app }: any) { return <div className="py-4"><NotificationsBody app={app} /></div>; }
