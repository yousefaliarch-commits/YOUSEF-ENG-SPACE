// =====================================================================
//  💡 «اقتراح المهندس الذكي» inside a tool (concrete, BBS, site diary, level book) — docs/AI.md → in-tool suggestions.
//  · Never blocks the tool: a small card under the editor; nothing is sent until the engineer taps it (one unit), the answer
//    is 2–4 sentences, and the same result asked again within 7 days comes from the phone.
//  · What travels is the tool's own one-screen summary (quantities, counts, closure error) — never names.
//  · ✕ hides it for now; «لا تظهر هنا» hides it in that tool for good (this phone).
// =====================================================================
import { useState } from "react";
import { Lightbulb, X as Close } from "lucide-react";
import { L2, say } from "../../i18n/i18n";
import { aiAvailable, ask } from "../../services/ai-service";
import { DAY, cached, remember } from "../../services/ai-cache";
import { Markdown } from "../../ui/markdown";

export const TIP_KINDS = ["concrete", "bbs", "siteDiary", "levelBook"];
const OFF = "engspace.ai.tipsOff";

const X = {
  title: L2("اقتراح من المهندس الذكي", "A tip from the Smart Engineer"),
  ask: L2("💡 اطلب نصيحة على هذه النتيجة", "💡 Ask for a tip on this result"),
  busy: L2("بيراجع النتيجة…", "Checking the result…"),
  never: L2("لا تظهر في هذه الأداة", "Don't show in this tool"),
  close: L2("إخفاء", "Hide"),
};

const offList = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(OFF) || "[]");
  } catch {
    return [];
  }
};

export function ToolTipCard({ app, kind, summary }: { app: any; kind: string; summary: string }) {
  const t = (x: any) => say(app, x);
  const [hidden, setHidden] = useState(() => offList().includes(kind));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (hidden || !TIP_KINDS.includes(kind) || !aiAvailable() || !summary.trim()) return null;
  const en = app.lang === "en";
  const facts = summary.replace(/[⁦-⁩]/g, "").slice(0, 1500);
  const run = async () => {
    const hit = cached("tool-tip", facts, kind, 7 * DAY);
    if (hit) {
      setText(hit);
      return;
    }
    setBusy(true);
    setErr("");
    const r = await ask({
      feature: "tool-tip",
      messages: [{ role: "user", text: facts }],
      context: { tool: kind, uiLang: en ? "en" : "ar", discipline: (app.profile && app.profile.disc) || undefined },
      onDelta: (_d, all) => setText(all),
    });
    setBusy(false);
    if (r.ok === true) {
      setText(r.text);
      remember("tool-tip", facts, kind, r.text);
    } else setErr(en ? r.error.en : r.error.ar);
  };
  const never = () => {
    try {
      localStorage.setItem(OFF, JSON.stringify([...new Set([...offList(), kind])]));
    } catch {
      /* hidden for now only */
    }
    setHidden(true);
  };
  if (!text && !busy && !err) {
    return (
      <button type="button" onClick={run} className="press w-full min-h-11 px-3.5 py-2.5 rounded-2xl border border-dashed border-accent/40 bg-wash/60 text-start text-[12.5px] font-medium text-accent inline-flex items-center gap-2" data-ai-tip-ask={kind}>
        <Lightbulb size={15} /> {t(X.ask)}
      </button>
    );
  }
  return (
    <section className="msg-in p-3.5 rounded-2xl bg-wash border border-accent/25" data-ai-tip={kind} role="note">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-accent inline-flex items-center gap-1.5"><Lightbulb size={15} /> {t(X.title)}</p>
        <button type="button" onClick={() => setHidden(true)} aria-label={t(X.close)} className="press grid place-items-center w-11 h-11 -me-2 -my-2 rounded-full text-ink-3 hover:text-ink" data-ai-tip-close><Close size={16} /></button>
      </div>
      {busy && !text && <p className="mt-1 text-[12px] text-ink-3">{t(X.busy)}</p>}
      {text && <div className="mt-1.5"><Markdown text={text} /></div>}
      {err && <p className="mt-1 text-[12px] text-warn">{err}</p>}
      {!busy && <button type="button" onClick={never} className="press mt-1 min-h-11 text-[11.5px] text-ink-3 hover:text-ink" data-ai-tip-never>{t(X.never)}</button>}
    </section>
  );
}
