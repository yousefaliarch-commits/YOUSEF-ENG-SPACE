// «يتوفر تحديث جديد» — shown once a web update has finished downloading in the background (src/native/updater.ts).
// One tap applies it (the app reloads on the new bundle about a second later); ✕ dismisses it for this session and the update is then
// applied silently at the next cold start. Never blocks anything: it sits under the header and takes no input focus.
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { applyUpdateNow, onOtaState, otaState } from "../native/updater";

export function UpdateBanner() {
  const [s, setS] = useState<any>(otaState()); const [gone, setGone] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => onOtaState(setS), []);
  if (s.status !== "ready" || !s.pending || gone === s.pending.version) return null;
  const go = () => { if (busy) return; setBusy(true); setTimeout(() => { applyUpdateNow(); }, 900); };
  return (
    <div role="status" data-update-banner className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-2xl bg-wash border border-accent/25 flex items-center gap-2">
      <Sparkles size={15} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-ink">{busy ? "جارٍ تطبيق التحديث…" : "يتوفر تحديث جديد للمنصة لتحسين الأداء"}</p>
      {!busy && <button type="button" onClick={go} className="press shrink-0 h-8 px-3 rounded-full bg-accent text-white text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">تحديث الآن</button>}
      {!busy && <button type="button" onClick={() => setGone(s.pending.version)} aria-label="إغلاق" className="press shrink-0 w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={15} /></button>}
    </div>
  );
}
