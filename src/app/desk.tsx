// =====================================================================
//  engspace.org on a desktop (W5) — the same app, the same store and handlers, laid out for a wide screen:
//  · ≥ 1024 px: a sidebar at the start edge replaces the floating tab bar; content sits in readable centred columns.
//  · ≥ 1280 px: two panes — a pushed screen opens BESIDE the list it came from (documents list | document, feed | post),
//    and a screen opened from the left pane replaces the right one instead of stacking (`app.push(s, { beside: true })`).
//  · «توسيع»: the left pane folds away so a document gets the whole width (and its live A4 preview, ToolDocScreen).
//  The phone apps (Capacitor) and the device-mockup preview never take this layout; sheets become centred dialogs ([data-desk]).
// =====================================================================
import { useEffect, useState } from "react";
import { Bell, Languages, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck } from "lucide-react";
import { authorOf } from "../domain/identity";
import { LevelRing } from "../lib/helpers";
import { ThemeQuick } from "../ui/chrome";
import { IdentityFace } from "../ui/identity";
import { ArchMark, Wordmark } from "../ui/primitives";

export const DESK_MIN = 1024;
export const SPLIT_MIN = 1280;

export function useMedia(query: string) {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [on, setOn] = useState(get);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const change = () => setOn(mq.matches);
    change();
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, [query]);
  return on;
}

// `allowed`: the web build in a real browser window (never the phone apps, never inside a device mockup)
export function useDesk(allowed: boolean) {
  const lg = useMedia(`(min-width: ${DESK_MIN}px)`);
  const xl = useMedia(`(min-width: ${SPLIT_MIN}px)`);
  return { on: allowed && lg, split: allowed && xl };
}

// the folded left pane is a per-viewer convenience: remembered on this browser only
const FOCUS_KEY = "engspace.desk.focus";
export function useDeskFocus(): [boolean, (v: boolean) => void] {
  const [focus, setFocusRaw] = useState(() => {
    try {
      return localStorage.getItem(FOCUS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setFocus = (v: boolean) => {
    setFocusRaw(v);
    try {
      localStorage.setItem(FOCUS_KEY, v ? "1" : "0");
    } catch {
      /* private window: only this visit remembers it */
    }
  };
  return [focus, setFocus];
}

// ---- the sidebar: brand, the member's tabs, then notifications · settings · staff console · account ----
export function DeskNav({ app, tabs, active, onChange, badge = {} }: { app: any; tabs: any[]; active: string; onChange: (id: string) => void; badge?: Record<string, number> }) {
  const item = (on: boolean) =>
    `press w-full flex items-center gap-3 min-h-11 px-3 rounded-xl text-[14px] text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash text-accent font-medium" : "text-ink-2 hover:bg-surface hover:text-ink"}`;
  const count = (n?: number) => (n && n > 0 ? <span className="ms-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-accent text-on-accent font-grotesk text-[10.5px] font-semibold">{n}</span> : null);
  const top = app.stack[app.stack.length - 1];
  return (
    <aside className="desk-nav shrink-0 w-60 2xl:w-64 h-full flex flex-col border-e border-line bg-canvas" data-desk-nav>
      <div className="h-16 px-4 flex items-center gap-2 border-b border-line">
        <ArchMark size={22} />
        <Wordmark size="text-[17px]" />
      </div>
      <nav aria-label="التنقل الرئيسي" data-tour="tabbar" className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = t.id === active && !top;
          return (
            <button key={t.id} type="button" data-tour={"tab-" + t.id} aria-current={t.id === active ? "page" : undefined} onClick={() => onChange(t.id)} className={item(on || (t.id === active && !!top))}>
              <Icon size={19} strokeWidth={t.id === active ? 2.2 : 1.8} />
              <span className="min-w-0 truncate">{t.label}</span>
              {count(badge[t.id])}
            </button>
          );
        })}
      </nav>
      <div className="p-3 space-y-1 border-t border-line">
        <button type="button" data-tour="notifs" onClick={() => app.push({ type: "notifications" })} className={item(top?.type === "notifications")}>
          <Bell size={19} />
          <span>الإشعارات</span>
          {count(app.unread)}
        </button>
        <button type="button" data-tour="settings" onClick={() => app.push({ type: "settings" })} className={item(top?.type === "settings")}>
          <Settings size={19} />
          <span>الإعدادات</span>
        </button>
        {app.openAdmin && (
          <button type="button" onClick={app.openAdmin} className={item(false)}>
            <ShieldCheck size={19} />
            <span>لوحة الإدارة</span>
          </button>
        )}
        <div className="flex items-center gap-1 pt-1">
          <button type="button" data-tour="profile" aria-label="حسابك" onClick={() => app.push({ type: "profile" })} className={`${item(top?.type === "profile")} flex-1 min-w-0`}>
            <LevelRing pts={app.pts} size={32}><IdentityFace a={authorOf(app.profile, app.profile.identity)} size={24} /></LevelRing>
            <span className="min-w-0 truncate">حسابك</span>
          </button>
          <button
            type="button"
            translate="no"
            data-desk-lang
            onClick={() => app.setLang(app.lang === "en" ? "ar" : "en")}
            aria-label={app.lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
            title={app.lang === "en" ? "العربية" : "English"}
            className="press shrink-0 grid place-items-center w-10 h-10 rounded-full text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Languages size={18} />
          </button>
          <ThemeQuick app={app} />
        </div>
      </div>
    </aside>
  );
}

// the slim bar over a tab on the desktop (the brand and the account live in the sidebar)
export function DeskTabBar({ title }: { title: string }) {
  return (
    <header className="shrink-0 h-16 px-6 flex items-center border-b border-line bg-canvas/[.97] z-10">
      <h1 className="text-[17px] font-medium">{title}</h1>
    </header>
  );
}

export function FocusToggle({ focus, onChange }: { focus: boolean; onChange: (v: boolean) => void }) {
  const Icon = focus ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      data-desk-focus={focus ? "on" : "off"}
      aria-label={focus ? "إظهار القائمة" : "توسيع"}
      aria-pressed={focus}
      onClick={() => onChange(!focus)}
      className="press inline-flex items-center gap-1.5 h-9 px-3 me-1 rounded-full border border-line-2 text-[12.5px] text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon size={16} className="rtl:-scale-x-100" />
      {focus ? "إظهار القائمة" : "توسيع"}
    </button>
  );
}
