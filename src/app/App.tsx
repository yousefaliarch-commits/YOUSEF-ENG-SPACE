// The root: theme (system / light / dark), language (Arabic / English) and the two views — the member app and, until Phase 3
// moves it to its own web app, the admin console. Both views share the app's stores (lib/runtime).
import React, { useEffect, useLayoutEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Bug, CircleCheck } from "lucide-react";
import { AppView, parseHash } from "./AppView";
import { TopBar } from "./TopBar";
import { AdminView } from "../features/admin/AdminView";
import { I18N, LANGS, LangCtx, i18nApply, loadLang, saveLang } from "../i18n/i18n";
import { ModeCtx, liveState, reducedMotion } from "../lib/runtime";
import { Primary } from "../ui/primitives";
import { ACCENTS } from "../ui/theme";

export const loadTheme = () => { try { return localStorage.getItem("engspace.theme") || "system"; } catch (e) { return "system"; } };

export const systemMode = () => { try { const host = document.documentElement.dataset.theme; if (host === "light" || host === "dark") return host; return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "dark"; } };

export function App() {
  const [init] = useState<any>(parseHash); const [view, setView] = useState<any>(init.view); const [accent, setAccent] = useState<any>("indigo"); const [toastMsg, setToastMsg] = useState<any>("");
  const [theme, setThemeRaw] = useState<any>(loadTheme); const [sys, setSys] = useState<any>(systemMode);
  // Language: chosen on the app's first screen (before the e-mail / registration screen), saved, switchable any time from
  // Settings. The swap runs in a layout effect, so the first paint is already in the chosen language; a switch cross-fades as a
  // View Transition and keeps all state. `lang` stays null until a choice is made (Arabic shows meanwhile).
  const [lang, setLangRaw] = useState<any>(loadLang); const L = lang || "ar";
  useLayoutEffect(() => { i18nApply(L); }, [L]);
  const setLang = (l?: any) => {
    l = l === "en" ? "en" : "ar"; const apply = () => { setLangRaw(l); saveLang(l); }; if (l === L) { if (lang == null) apply(); return; }
    const root = document.documentElement; const S = liveState();
    if (typeof document.startViewTransition !== "function" || reducedMotion() || S.vtBusy) { apply(); return; }
    root.dataset.vt = "lang"; S.vtBusy = true; const done = () => { S.vtBusy = false; if (root.dataset.vt === "lang") delete root.dataset.vt; };
    let t = null; try { t = document.startViewTransition(() => { ReactDOM.flushSync(apply); }); } catch (e) { done(); apply(); return; }
    [t.ready, t.updateCallbackDone].forEach((p) => p && p.catch(() => {})); t.finished.then(done, done);
  };
  const setTheme = (t?: any) => {
    const apply = () => { setThemeRaw(t); try { localStorage.setItem("engspace.theme", t); } catch (e) {} };
    const root = document.documentElement; const L = liveState();
    if (typeof document.startViewTransition !== "function" || reducedMotion() || L.vtBusy) { apply(); return; }
    const pt = L.lastTap || { x: innerWidth / 2, y: 0 }; root.style.setProperty("--vt-x", `${pt.x}px`); root.style.setProperty("--vt-y", `${pt.y}px`); root.dataset.vt = "theme"; L.vtBusy = true;
    const done = () => { L.vtBusy = false; if (root.dataset.vt === "theme") delete root.dataset.vt; };
    let tr = null; try { tr = document.startViewTransition(() => { ReactDOM.flushSync(apply); }); } catch (e) { done(); apply(); return; }
    [tr.ready, tr.updateCallbackDone].forEach((p) => p && p.catch(() => {})); tr.finished.then(done, done);
  };
  const mode = theme === "system" ? sys : theme;
  useEffect(() => { try { const mq = matchMedia("(prefers-color-scheme: dark)"); const on = () => setSys(systemMode()); mq.addEventListener("change", on); const mo = new MutationObserver(on); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => { mq.removeEventListener("change", on); mo.disconnect(); }; } catch (e) {} }, []);
  useEffect(() => { try { document.documentElement.dataset.mode = mode; document.documentElement.style.colorScheme = mode; const m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null; if (m) m.content = mode === "light" ? "#fafafa" : "#09090b"; } catch (e) {} }, [mode]);
  const a = mode === "light" ? ACCENTS[accent].light : ACCENTS[accent].rgb;
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToastMsg(""), 2600); return () => clearTimeout(t); }, [toastMsg]);
  const vars: any = { "--accent": a.accent, "--solid": a.solid, "--solid-hi": a.solidHi, "--hover": a.hover, "--wash": a.wash };
  return (
    <ModeCtx.Provider value={mode}><LangCtx.Provider value={L}><div dir={LANGS[L].dir} lang={L} data-mode={mode} className="theme-fade min-h-dvh bg-canvas text-ink" style={vars}>
      <div className={view === "app" ? "hidden sm:block" : ""}><TopBar view={view} setView={setView} accent={accent} setAccent={setAccent} theme={theme} setTheme={setTheme} mode={mode} lang={L} setLang={setLang} /></div>
      {view === "admin" ? <AdminView init={init} openApp={() => setView("app")} />
        : <AppView onBrand={() => {}} onAdmin={() => setView("admin")} init={init} theme={theme} setTheme={setTheme} mode={mode} lang={L} setLang={setLang} langChosen={lang != null} />}
      <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-elevated border border-line-2 text-[13px] shadow-float transition-all ${toastMsg ? "opacity-100" : "opacity-0 translate-y-3 pointer-events-none"}`}>{toastMsg && <><CircleCheck size={17} className="text-accent" /><span>{toastMsg}</span></>}</div>
    </div></LangCtx.Provider></ModeCtx.Provider>
  );
}

// A render error shows a plain recovery screen instead of a blank page
export class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { err: unknown }> {
  state = { err: null };
  static getDerivedStateFromError(err?: any) { return { err }; }
  componentDidCatch(err?: any, info?: any) { console.error("EngSpace crashed:", err, info && info.componentStack); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div dir={LANGS[I18N.lang].dir} lang={I18N.lang} className="min-h-dvh bg-canvas text-ink grid place-items-center p-6">
        <div className="max-w-[560px] w-full rounded-2xl border border-bad/40 bg-surface p-6 space-y-4">
          <h1 className="text-[18px] font-medium flex items-center gap-2"><Bug size={20} className="text-bad" />{I18N.lang === "en" ? "Something went wrong" : "حدث خطأ غير متوقع"}</h1>
          <p className="text-[13px] text-ink-2 break-words">{String((this.state.err as Error | null)?.message || this.state.err)}</p>
          <Primary onClick={() => { try { location.reload(); } catch (e) {} }}>{I18N.lang === "en" ? "Reload" : "إعادة التحميل"}</Primary>
        </div>
      </div>
    );
  }
}

// Physical press feedback on every control: it dips on press and springs back on release (Web Animations on the independent
// `scale` property, so it never fights a component's own transform, classes or transitions). Installed once per page.
export const PRESS_SEL = "button:not(:disabled), [role=button], [role=tab], [role=radio], [role=switch], a[href], summary";

export function installPressFeedback() {
  const L = liveState(); if (L.pressFx || typeof document === "undefined") return; L.pressFx = true; let cur = null;
  const target = (e?: any) => { const el = e.target && e.target.closest ? e.target.closest(PRESS_SEL) : null; return el && !el.closest("[data-no-press]") && typeof el.animate === "function" ? el : null; };
  document.addEventListener("pointerdown", (e) => {
    L.lastTap = { x: e.clientX, y: e.clientY }; if (e.button > 0 || reducedMotion()) return; const el = target(e); if (!el) return; const r = el.getBoundingClientRect(); if (r.width > 460 || r.height > 220) return;
    const k = r.width * r.height > 14000 ? 0.985 : r.width < 60 ? 0.9 : 0.955; cur = { el, k };
    try { if (el.__press) el.__press.cancel(); el.__press = el.animate([{ scale: "1" }, { scale: String(k) }], { duration: 110, easing: "cubic-bezier(.3,0,.5,1)", fill: "forwards" }); } catch (x) {}
  }, { passive: true, capture: true });
  const release = () => { const c = cur; cur = null; if (!c) return; try { if (c.el.__press) c.el.__press.cancel(); c.el.__press = c.el.animate([{ scale: String(c.k) }, { scale: "1.025", offset: 0.55 }, { scale: "1" }], { duration: 420, easing: "cubic-bezier(.22,1.2,.36,1)" }); } catch (x) {} };
  ["pointerup", "pointercancel", "dragstart"].forEach((t) => document.addEventListener(t, release, { passive: true, capture: true }));
  document.addEventListener("keydown", (e) => { if ((e.key !== "Enter" && e.key !== " ") || reducedMotion()) return; const el = document.activeElement; if (el && el.matches && el.matches(PRESS_SEL) && typeof el.animate === "function") try { el.animate([{ scale: "1" }, { scale: ".95" }, { scale: "1" }], { duration: 280, easing: "cubic-bezier(.22,1.2,.36,1)" }); } catch (x) {} }, true);
}
