// =====================================================================
//  CV review v26 — the AI cards: consent (once), progress while the panel reads, failure with retry, the «Smart Engineer»
//  badge with the device ⇄ AI switch, the rating, the allowance left today, and the notes the rule engine can't make
//  (inconsistencies, known projects to verify, how many invented figures were caught).
// =====================================================================
import { useEffect, useState } from "react";
import { CircleAlert, Cpu, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Num, Panel, Primary, Secondary } from "../../ui/primitives";
import { onQuota, quotaNow, rateAnswer } from "../../services/ai-service";
import { AIX } from "./ai-review";

export function AiConsentCard({ t, onYes, onNo }: any) {
  return (
    <Panel className="p-4" data-ai-consent>
      <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-accent" /> {t(AIX.consentT)}</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{t(AIX.consent)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Primary onClick={onYes} className="h-12 press" data-ai-agree><Sparkles size={15} /> {t(AIX.agree)}</Primary>
        <Secondary onClick={onNo} className="h-12 press"><Cpu size={15} /> {t(AIX.stay)}</Secondary>
      </div>
    </Panel>
  );
}

export function AiRunningCard({ t, chars }: any) {
  // the bar fills with what has arrived (a typical review is ~11k characters), never past 95 % until it's done
  const pct = Math.min(95, Math.round((chars / 11_000) * 100));
  return (
    <Panel className="p-4" data-ai-running aria-live="polite">
      <p className="text-[13.5px] font-semibold inline-flex items-center gap-2"><Sparkles size={15} className="text-accent" /> {t(AIX.running)}</p>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(AIX.runningSub)}</p>
      <div className="mt-3 h-2 rounded-full bg-elevated overflow-hidden">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(6, pct)}%`, transition: "width .5s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </Panel>
  );
}

export function AiErrorCard({ t, error, onRetry }: any) {
  return (
    <Panel className="p-4" data-ai-error={error && error.code}>
      <p className="text-[13px] font-medium inline-flex items-start gap-2 text-warn"><CircleAlert size={15} className="shrink-0 mt-0.5" /> <span>{t(AIX.failed)}</span></p>
      {error && <p className="mt-1 text-[11.5px] text-ink-3">{t(error)}</p>}
      {error && !["quota", "not_ready", "disabled", "demo"].includes(error.code) && (
        <Secondary onClick={onRetry} className="mt-3 w-full h-11 press"><RefreshCw size={15} /> {t(AIX.retry)}</Secondary>
      )}
    </Panel>
  );
}

export function useQuota() {
  const [q, setQ] = useState(quotaNow());
  useEffect(() => {
    const off = onQuota(setQ);
    return () => {
      off();
    };
  }, []);
  return q;
}

export function AiBadge({ t, showDevice, onToggle }: any) {
  const q = useQuota();
  const [rated, setRated] = useState<0 | 1 | -1>(0);
  const rate = (v: 1 | -1) => {
    setRated(v);
    rateAnswer("cv-review", v);
  };
  return (
    <div className="flex items-center gap-2 flex-wrap" data-ai-badge={showDevice ? "device" : "ai"}>
      <span className={`inline-flex items-center gap-1.5 min-h-8 px-3 rounded-full text-[11.5px] font-medium ${showDevice ? "bg-elevated text-ink-2" : "bg-wash text-accent"}`}>
        {showDevice ? <Cpu size={13} /> : <Sparkles size={13} />} {t(showDevice ? AIX.device : AIX.badge)}
      </span>
      <button type="button" onClick={onToggle} className="press min-h-11 px-2 text-[12px] font-medium text-accent" data-ai-toggle>{t(showDevice ? AIX.showAi : AIX.showDevice)}</button>
      {!showDevice && (
        <span className="ms-auto inline-flex items-center gap-1">
          {rated ? <span className="text-[11px] text-good">{t(AIX.thanks)}</span> : (
            <>
              <span className="text-[11px] text-ink-3">{t(AIX.rate)}</span>
              <button type="button" aria-label="👍" onClick={() => rate(1)} className="press grid place-items-center w-11 h-11 rounded-full text-ink-3 hover:text-good"><ThumbsUp size={15} /></button>
              <button type="button" aria-label="👎" onClick={() => rate(-1)} className="press grid place-items-center w-11 h-11 rounded-full text-ink-3 hover:text-bad"><ThumbsDown size={15} /></button>
            </>
          )}
        </span>
      )}
      {q.remaining !== null && <span className="w-full text-[10.5px] text-ink-3" data-ai-remaining={q.remaining}>{t(AIX.remaining).replace("{n}", String(q.remaining))}</span>}
    </div>
  );
}

export function AiInsightsCard({ r, t }: any) {
  const ai = r.aiData;
  if (!ai || (!ai.inconsistencies.length && !ai.knownProjects.length && !ai.guarded)) return null;
  return (
    <Panel className="p-4" data-ai-insights>
      <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> {t(AIX.insights)}</h3>
      {ai.inconsistencies.length > 0 && (
        <>
          <p className="mt-3 text-[12.5px] font-medium">{t(AIX.inconsist)}</p>
          <ul className="mt-1.5 space-y-1.5">{ai.inconsistencies.map((s: string, i: number) => <li key={i} dir="auto" className="text-[12.5px] leading-relaxed text-ink-2 flex gap-2"><CircleAlert size={13} className="shrink-0 mt-1 text-warn" /><span>{s}</span></li>)}</ul>
        </>
      )}
      {ai.knownProjects.length > 0 && (
        <>
          <p className="mt-3 text-[12.5px] font-medium">{t(AIX.projects)}</p>
          <p className="text-[11px] text-ink-3">{t(AIX.projectsNote)}</p>
          <ul className="mt-1.5 space-y-2">{ai.knownProjects.map((p: any, i: number) => (
            <li key={i} className="p-2.5 rounded-xl bg-canvas/60 border border-line" dir="auto">
              <p className="text-[12.5px] font-medium">{p.name} <span className={`ms-1 text-[10px] ${p.confidence === "high" ? "text-good" : p.confidence === "medium" ? "text-warn" : "text-ink-3"}`}>· {p.confidence}</span></p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">{p.context}</p>
            </li>
          ))}</ul>
        </>
      )}
      {ai.guarded > 0 && <p className="mt-3 text-[11.5px] text-ink-3 leading-relaxed" data-ai-guarded={ai.guarded}>{t(AIX.guarded).replace("{n}", String(ai.guarded))}</p>}
      <span className="sr-only"><Num>{ai.overall}</Num></span>
    </Panel>
  );
}
