// Web-only top bar (hidden on phones): switch between the member app and the admin console, accent, language and theme.
import {
  Languages
} from "lucide-react";
import { ArchMark, Wordmark } from "../ui/primitives";
import { ACCENTS, THEMES, accentHex } from "../ui/theme";

// =====================================================================
//  Top bar
// =====================================================================
export function TopBar({ view, setView, accent, setAccent, theme, setTheme, mode, lang = "ar", setLang = () => {} }: any) {
  const ti = THEMES.findIndex((t) => t[0] === theme); const [, tLabel, TIcon] = THEMES[ti];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-canvas/80 border-b border-line">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        {/* the logo leads back to the app from the admin console; in the app it is only the mark */}
        {view === "app" ? <div className="flex items-center gap-2.5 shrink-0"><ArchMark size={26} /><span className="hidden md:block"><Wordmark size="text-[20px]" /></span></div>
          : <a href="#app" aria-label="EngSpace" className="flex items-center gap-2.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={(e) => { e.preventDefault(); setView("app"); }}><ArchMark size={26} /><span className="hidden md:block"><Wordmark size="text-[20px]" /></span></a>}
        <div role="tablist" aria-label="طريقة العرض" className="flex p-1 rounded-full bg-surface border border-line">
          {[["app", "معاينة التطبيق", "التطبيق"], ["admin", "لوحة الإدارة", "الإدارة"]].map(([id, label, short]: any) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`h-9 px-2.5 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  view === id ? "bg-elevated text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-ink-2 hover:text-ink"}`}><span className="hidden lg:inline">{label}</span><span className="lg:hidden">{short}</span></button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div role="radiogroup" aria-label="لون الهوية" className="flex items-center gap-1 p-1 rounded-full bg-surface border border-line">
            {Object.entries(ACCENTS).map(([id, a]: any) => (
              <button key={id} role="radio" aria-checked={accent === id} aria-label={a.name} title={a.name} onClick={() => setAccent(id)}
                className={`grid place-items-center w-8 h-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${accent === id ? "bg-elevated" : "hover:bg-elevated/60"}`}>
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: accentHex(a, mode), boxShadow: accent === id ? `0 0 12px ${accentHex(a, mode)}` : "none" }} />
              </button>
            ))}
          </div>
          <button type="button" translate="no" onClick={() => setLang(lang === "en" ? "ar" : "en")} aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"} title={lang === "en" ? "العربية" : "English"}
            className="press inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-surface border border-line text-[12px] text-ink-2 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Languages size={15} className="text-accent" /><span className={lang === "en" ? "" : "font-grotesk"}>{lang === "en" ? "العربية" : "English"}</span></button>
          <button type="button" onClick={() => setTheme(THEMES[(ti + 1) % THEMES.length][0])} aria-label={`المظهر: ${tLabel} — اضغط للتبديل`} title={`المظهر: ${tLabel}`}
            className="press inline-flex items-center gap-1.5 h-10 ps-3 pe-3.5 rounded-full bg-surface border border-line text-[12px] text-ink-2 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><TIcon size={15} className="text-accent" />{tLabel}</button>
        </div>
      </div>
    </header>
  );
}
