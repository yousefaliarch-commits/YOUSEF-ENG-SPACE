// =====================================================================
//  «املأ بالمهندس الذكي» — the card at the top of a smart form (RFI, material submittal, custody handover, toolbox talk,
//  permit). The engineer describes the situation in their own words; the Smart Engineer returns the form's fields as
//  structured JSON (server-side schema per form) and the tool merges them into its document. Missing facts come back as
//  «[أضف: …]» slots, never invented. Offline or in the demo the card says so and the form stays fully manual.
// =====================================================================
import { useState } from "react";
import { CircleAlert, Sparkles } from "lucide-react";
import { L2, say } from "../../i18n/i18n";
import { aiAvailable, askJson, type AiError } from "../../services/ai-service";
import { useQuota } from "./quota";

export type FormKind = "rfi" | "submittal" | "custody" | "toolbox" | "permit";

const X = {
  title: L2("املأ بالمهندس الذكي", "Fill with the Smart Engineer"),
  hint: L2("اكتب الموقف بكلامك — هيرتّبه في النموذج بصياغة مكتب فني، والناقص يظهر كـ [أضف: …].", "Describe it in your own words — it is laid into the form in technical-office wording; anything missing shows as [ADD: …]."),
  go: L2("املأ النموذج", "Fill the form"),
  busy: L2("بيكتب النموذج…", "Writing the form…"),
  done: L2("تم الملء — راجع كل خانة قبل الإصدار.", "Filled — check every field before issuing."),
  off: L2("الملء الذكي يحتاج اتصالًا والنسخة المتصلة — النموذج يعمل يدويًا كما هو.", "Smart fill needs a connection and the connected app — the form works by hand as it is."),
  left: L2("متبقٍ اليوم: {n}", "Left today: {n}"),
};

export function AiFillCard({ app, form, project, placeholder, onFill, disabled = false }: {
  app: any;
  form: FormKind;
  project?: { name?: string; location?: string; contractNo?: string } | null;
  placeholder: { ar: string; en: string };
  onFill: (data: any) => void;
  disabled?: boolean;
}) {
  const t = (x: any) => say(app, x);
  const en = app.lang === "en";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<AiError | null>(null);
  const [ok, setOk] = useState(false);
  const q = useQuota();
  if (disabled) return null;
  if (!aiAvailable()) {
    return <p className="px-1 text-[11.5px] text-ink-3 leading-relaxed" data-ai-fill-off>{t(X.off)}</p>;
  }
  const run = async () => {
    const s = text.trim();
    if (s.length < 8 || busy) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    const p = app.profile || {};
    const r = await askJson({
      feature: "form-fill",
      messages: [{ role: "user", text: s.slice(0, 3500) }],
      context: {
        form,
        uiLang: en ? "en" : "ar",
        discipline: p.disc || undefined,
        project: project ? { name: project.name || undefined, location: project.location || undefined, contractNo: project.contractNo || undefined } : undefined,
      },
    });
    setBusy(false);
    if (r.ok === true) {
      onFill(r.data);
      setOk(true);
    } else setErr(r.error);
  };
  return (
    <section className="p-3.5 rounded-2xl bg-wash border border-accent/20" data-ai-fill={form}>
      <p className="text-[13.5px] font-semibold inline-flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> {t(X.title)}</p>
      <p className="mt-1 text-[11.5px] text-ink-2 leading-relaxed">{t(X.hint)}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        dir="auto"
        translate="no"
        maxLength={3500}
        placeholder={en ? placeholder.en : placeholder.ar}
        className="mt-2 w-full px-3 py-2.5 rounded-xl bg-surface border border-line-2 text-[13.5px] leading-relaxed resize-y focus:outline-none focus:border-accent"
        data-ai-fill-input
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={run} disabled={busy || text.trim().length < 8} className="press min-h-11 px-4 inline-flex items-center gap-1.5 rounded-xl btn-primary text-[13.5px] font-medium disabled:opacity-50" data-ai-fill-go>
          <Sparkles size={15} /> {busy ? t(X.busy) : t(X.go)}
        </button>
        {q.remaining !== null && <span className="text-[10.5px] text-ink-3">{t(X.left).replace("{n}", String(q.remaining))}</span>}
      </div>
      {ok && <p className="mt-2 text-[12px] text-good" data-ai-fill-done>{t(X.done)}</p>}
      {err && <p className="mt-2 text-[12px] text-warn inline-flex items-start gap-1.5" data-ai-fill-error={err.code}><CircleAlert size={14} className="shrink-0 mt-0.5" /> {en ? err.en : err.ar}</p>}
    </section>
  );
}

// text the model sent: a string, trimmed and capped (anything else becomes "")
export const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
export const strs = (v: unknown, n = 20, max = 400) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
