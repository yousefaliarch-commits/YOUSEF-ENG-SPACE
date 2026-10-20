// =====================================================================
//  «المهندس الذكي» — the assistant tab (docs/AI.md → assistant). A senior Egyptian engineer to ask anything technical:
//  codes and clauses, quantities, site practice, paperwork, contracts. Answers stream in as rich text; the conversation stays
//  on this phone (one running chat per account, cleared on demand); a first question asked before is answered from the
//  7-day cache without spending the allowance; tools the answer names become one-tap chips. Site supervisors never get pay
//  talk (the proxy enforces it from the account, whatever the app sends).
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Copy, RefreshCw, Sparkles, Square, ThumbsDown, ThumbsUp, Trash2, Wrench } from "lucide-react";
import { Panel } from "../../ui/primitives";
import { Markdown } from "../../ui/markdown";
import { L2, say, tr } from "../../i18n/i18n";
import { aiAvailable, ask, rateAnswer, refreshQuota, type AiError, type AiMsg } from "../../services/ai-service";
import { DAY, cached, remember } from "../../services/ai-cache";
import { toolRole, toolsForRole } from "../../tools/gate";
import { useQuota } from "./quota";

export type ChatMsg = { id: string; role: "user" | "model"; text: string; at: number; cached?: boolean; error?: AiError; rated?: 1 | -1 };

const MAX_KEEP = 60; // messages kept on the phone
const SEND_TURNS = 12; // turns that travel with a question
const SEND_CHARS = 18_000;

const X = {
  title: L2("المهندس الذكي", "Smart Engineer"),
  sub: L2("زميلك المهندس الكبير: الأكواد والبنود، الحصر، شغل الموقع، المكتب الفني والعقود.", "Your senior colleague: codes and clauses, quantities, site work, technical office and contracts."),
  placeholder: L2("اسأل سؤالك الهندسي…", "Ask your engineering question…"),
  send: L2("إرسال", "Send"),
  stop: L2("إيقاف", "Stop"),
  clear: L2("محادثة جديدة", "New chat"),
  clearAsk: L2("تمسح المحادثة الحالية من هذا الجهاز؟", "Clear this conversation from this phone?"),
  thinking: L2("بيفكّر…", "Thinking…"),
  copy: L2("نسخ", "Copy"),
  copied: L2("نُسخت", "Copied"),
  retry: L2("أعد المحاولة", "Try again"),
  fromCache: L2("من إجابة سابقة — لم يُخصم من رصيدك", "From an earlier answer — not counted"),
  open: L2("افتح", "Open"),
  remaining: L2("متبقٍ اليوم: {n} من {m}", "Left today: {n} of {m}"),
  rate: L2("مفيدة؟", "Helpful?"),
  thanks: L2("شكرًا على رأيك", "Thanks for the feedback"),
  disclaimer: L2("إجابات استرشادية — أي تصميم أو قرار سلامة يعتمده مهندس مختص. لا تكتب بيانات شخصية.", "Guidance only — any design or safety decision is for a licensed engineer. Don't type personal data."),
  demoT: L2("المهندس الذكي يعمل في التطبيق المتصل", "The Smart Engineer works in the connected app"),
  demo: L2("سجّل الدخول في النسخة المتصلة بالخادم لتسأل المهندس الذكي. أدوات الموقع تعمل كما هي بدون إنترنت.", "Sign in to the connected app to ask the Smart Engineer. The site tools keep working offline."),
  try: L2("جرّب تسأل", "Try asking"),
};

// starter questions, by who is asking
const STARTERS: Record<string, { ar: string; en: string }[]> = {
  engineer: [
    { ar: "إيه الغطاء الخرساني المطلوب للقواعد والأعمدة في ECP 203؟", en: "What concrete cover does ECP 203 require for footings and columns?" },
    { ar: "إزاي أحسب كمية الخرسانة والحديد لقاعدة منفصلة؟", en: "How do I take off concrete and steel for an isolated footing?" },
    { ar: "اكتبلي نص RFI عن تعارض بين اللوحات الإنشائية والمعمارية", en: "Draft an RFI about a clash between structural and architectural drawings" },
    { ar: "إيه أهم بنود FIDIC اللي لازم يعرفها مهندس التنفيذ؟", en: "Which FIDIC clauses should a site engineer know?" },
    { ar: "خطوات استلام حديد سقف قبل الصب", en: "Steps to inspect slab reinforcement before a pour" },
  ],
  supervisor: [
    { ar: "خطوات استلام حديد سقف قبل الصب", en: "Steps to inspect slab reinforcement before a pour" },
    { ar: "احتياطات السلامة قبل الشغل على السقالات", en: "Safety checks before working on scaffolding" },
    { ar: "إزاي أعالج الخرسانة صح في الصيف؟", en: "How do I cure concrete properly in summer?" },
    { ar: "إيه أسباب التعشيش في الأعمدة وإزاي أتجنبها؟", en: "What causes honeycombing in columns and how do I avoid it?" },
  ],
  hr: [
    { ar: "أسئلة مقابلة لمهندس مكتب فني بخبرة 3 سنين", en: "Interview questions for a technical office engineer with 3 years" },
    { ar: "الفرق بين مهندس التنفيذ ومهندس المكتب الفني ومهندس التخطيط", en: "Site vs technical office vs planning engineer — the difference" },
    { ar: "إيه الشهادات المهمة لمهندس جودة QA/QC؟", en: "Which certificates matter for a QA/QC engineer?" },
  ],
  owner: [
    { ar: "إزاي أكتب وصف وظيفة لمهندس موقع مدني؟", en: "How do I write a job description for a civil site engineer?" },
    { ar: "إيه الفرق بين عقد FIDIC الأحمر والأصفر؟", en: "Red vs Yellow FIDIC book — what's the difference?" },
    { ar: "أسئلة مقابلة لمهندس تخطيط Primavera", en: "Interview questions for a Primavera planning engineer" },
  ],
};

const key = (pid?: string) => `engspace.ai.chat:${pid || "guest"}`;
const load = (pid?: string): ChatMsg[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key(pid)) || "[]");
    return Array.isArray(v) ? v.filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string") : [];
  } catch {
    return [];
  }
};
const save = (pid: string | undefined, list: ChatMsg[]) => {
  try {
    localStorage.setItem(key(pid), JSON.stringify(list.filter((m) => !m.error).slice(-MAX_KEEP)));
  } catch {
    /* a full or private storage: the chat lives for this session */
  }
};
const uid = () => Math.random().toString(36).slice(2, 10);

// the turns that travel: the latest ones that fit, always starting with a question
export function turnsFor(list: ChatMsg[]): AiMsg[] {
  const ok = list.filter((m) => !m.error && m.text.trim());
  const out: AiMsg[] = [];
  let chars = 0;
  for (let i = ok.length - 1; i >= 0 && out.length < SEND_TURNS; i--) {
    chars += ok[i].text.length;
    if (chars > SEND_CHARS && out.length) break;
    out.unshift({ role: ok[i].role, text: ok[i].text.slice(0, SEND_CHARS) });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// the tools an answer names (only those this member may open), as one-tap chips
export function toolsNamed(text: string, role: string) {
  const s = String(text || "");
  return toolsForRole(role as any)
    .filter((t) => t.status === "live" && (s.includes(t.name) || s.includes(tr(t.name))))
    .slice(0, 3);
}

export function AssistantScreen({ app }: any) {
  const t = (x: any) => say(app, x);
  const en = app.lang === "en";
  const pid = app.profile && app.profile.pid;
  const role = toolRole(app.profile);
  const noMoney = app.moneyAccess === "none";
  const [list, setList] = useState<ChatMsg[]>(() => load(pid));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const qRef = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const q = useQuota();
  const live = aiAvailable();

  useEffect(() => {
    setList(load(pid));
  }, [pid]);
  useEffect(() => {
    if (live) refreshQuota();
    return () => {
      if (ctl.current) ctl.current.abort();
    };
  }, []);

  const context = useMemo(() => {
    const p = app.profile || {};
    return {
      discipline: p.disc || undefined,
      track: p.track || undefined,
      level: p.pos || undefined,
      uiLang: en ? "en" : "ar",
      noMoney: noMoney || undefined,
      tools: toolsForRole(role).filter((x) => x.status === "live").map((x) => x.name),
    };
  }, [app.profile, en, noMoney, role]);
  const ctxKey = `${context.discipline || ""}|${context.uiLang}|${noMoney ? 1 : 0}`;

  const commit = (next: ChatMsg[]) => {
    setList(next);
    save(pid, next);
  };

  const run = async (history: ChatMsg[]) => {
    const question = history[history.length - 1];
    const first = history.filter((m) => !m.error).length === 1;
    // a first question asked before (on this phone, same profile and language) comes from the cache
    if (first) {
      const hit = cached("assistant", question.text, ctxKey, 7 * DAY);
      if (hit) {
        commit([...history, { id: uid(), role: "model", text: hit, at: Date.now(), cached: true }]);
        return;
      }
    }
    const answerId = uid();
    setBusy(true);
    setList([...history, { id: answerId, role: "model", text: "", at: Date.now() }]);
    const c = new AbortController();
    ctl.current = c;
    let frame = 0;
    let latest = "";
    const r = await ask({
      feature: "assistant",
      messages: turnsFor(history),
      context,
      signal: c.signal,
      onDelta: (_d, all) => {
        // one paint per frame however fast the words arrive
        latest = all;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          setList((l) => l.map((m) => (m.id === answerId ? { ...m, text: latest } : m)));
        });
      },
    });
    if (frame) cancelAnimationFrame(frame);
    ctl.current = null;
    setBusy(false);
    const done: ChatMsg = r.ok === true
      ? { id: answerId, role: "model", text: r.text, at: Date.now() }
      : r.text && r.error.code === "cancelled"
        ? { id: answerId, role: "model", text: r.text, at: Date.now() }
        : { id: answerId, role: "model", text: r.text || "", at: Date.now(), error: r.error };
    commit([...history, done]);
    if (r.ok === true && first && r.text.length > 40) remember("assistant", question.text, ctxKey, r.text);
  };

  const send = (raw?: string) => {
    const s = String(raw ?? text).trim();
    if (!s || busy || !live) return;
    setText("");
    if (input.current) input.current.style.height = "";
    const next = [...list.filter((m) => !m.error), { id: uid(), role: "user" as const, text: s.slice(0, 4000), at: Date.now() }];
    setList(next);
    run(next);
    // the question rises to the top of the screen and the answer grows under it
    requestAnimationFrame(() => {
      const el = qRef.current;
      if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const retry = () => {
    const h = list.filter((m) => !m.error);
    if (h.length && h[h.length - 1].role === "user") run(h);
  };

  const clear = () => {
    if (busy) return;
    if (list.length && !window.confirm(t(X.clearAsk))) return;
    commit([]);
  };

  const copy = (m: ChatMsg) => {
    try {
      navigator.clipboard.writeText(m.text);
    } catch {
      /* no clipboard here */
    }
    setCopied(m.id);
    setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1600);
  };

  const rate = (m: ChatMsg, v: 1 | -1) => {
    rateAnswer("assistant", v);
    commit(list.map((x) => (x.id === m.id ? { ...x, rated: v } : x)));
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "";
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
  };

  const starters = STARTERS[role] || STARTERS.engineer;
  const lastUser = (() => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].role === "user") return list[i].id;
    return null;
  })();

  return (
    <div className="pt-4 flex-1 flex flex-col" data-ai-assistant>
      <div className="px-1 flex items-start gap-3">
        <span className="grid place-items-center w-11 h-11 shrink-0 rounded-2xl bg-wash text-accent"><Sparkles size={20} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-medium leading-tight">{t(X.title)}</h1>
          <p className="mt-0.5 text-[12px] text-ink-2 leading-snug">{t(X.sub)}</p>
        </div>
        {list.length > 0 && (
          <button type="button" onClick={clear} disabled={busy} aria-label={t(X.clear)} className="press grid place-items-center w-11 h-11 -me-1 rounded-full text-ink-3 hover:text-ink disabled:opacity-40" data-ai-clear>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {!live && (
        <Panel className="mt-4 p-4" data-ai-demo>
          <p className="text-[13.5px] font-semibold">{t(X.demoT)}</p>
          <p className="mt-1 text-[12.5px] text-ink-2 leading-relaxed">{t(X.demo)}</p>
        </Panel>
      )}

      {live && list.length === 0 && (
        <div className="mt-5">
          <p className="px-1 text-[12px] font-medium text-ink-3">{t(X.try)}</p>
          <div className="mt-2 flex flex-col gap-2 stagger">
            {starters.map((s, i) => (
              <button key={i} type="button" onClick={() => send(en ? s.en : s.ar)} className="press min-h-11 px-3.5 py-2.5 rounded-2xl bg-surface border border-line text-start text-[13px] leading-snug hover:border-line-3" data-ai-starter={i}>
                {en ? s.en : s.ar}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3 pb-3" aria-live="polite">
        {list.map((m) =>
          m.role === "user" ? (
            <div key={m.id} ref={m.id === lastUser ? qRef : undefined} className="msg-in flex justify-end scroll-mt-4" data-ai-msg="user">
              <p translate="no" dir="auto" className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-ee-md bg-accent text-on-accent text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ unicodeBidi: "isolate" }}>{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="msg-in" data-ai-msg="model" data-ai-state={m.error ? "error" : m.text ? "done" : "wait"}>
              <div className="px-3.5 py-3 rounded-2xl rounded-es-md bg-surface border border-line">
                {m.text ? <Markdown text={m.text} /> : !m.error && <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Sparkles size={14} className="text-accent" /> {t(X.thinking)}</p>}
                {m.error && (
                  <div className={m.text ? "mt-2" : ""} data-ai-error={m.error.code}>
                    <p className="text-[12.5px] text-warn">{en ? m.error.en : m.error.ar}</p>
                    {!["quota", "not_ready", "disabled", "blocked", "auth"].includes(m.error.code) && (
                      <button type="button" onClick={retry} className="press mt-1 min-h-11 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent" data-ai-retry>
                        <RefreshCw size={14} /> {t(X.retry)}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {m.text && !m.error && !(busy && m.id === list[list.length - 1].id) && (
                <>
                  {toolsNamed(m.text, role).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {toolsNamed(m.text, role).map((x) => (
                        <button key={x.id} type="button" onClick={() => app.openTool(x.id)} className="press min-h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-wash text-accent text-[12px] font-medium" data-ai-tool={x.id}>
                          <Wrench size={13} /> {t(X.open)} {en ? tr(x.name) : x.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-ink-3">
                    <button type="button" onClick={() => copy(m)} aria-label={t(X.copy)} className="press grid place-items-center w-11 h-11 rounded-full hover:text-ink">
                      {copied === m.id ? <Check size={15} className="text-good" /> : <Copy size={15} />}
                    </button>
                    {m.cached ? (
                      <span className="text-[11px]" data-ai-cached>{t(X.fromCache)}</span>
                    ) : m.rated ? (
                      <span className="text-[11px] text-good">{t(X.thanks)}</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => rate(m, 1)} aria-label="👍" className="press grid place-items-center w-11 h-11 rounded-full hover:text-good"><ThumbsUp size={15} /></button>
                        <button type="button" onClick={() => rate(m, -1)} aria-label="👎" className="press grid place-items-center w-11 h-11 rounded-full hover:text-bad"><ThumbsDown size={15} /></button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ),
        )}
      </div>

      {live && (
        <div className="foot sticky bottom-0 z-[6] mt-auto -mx-4 px-3 pt-2 pb-2 bg-canvas border-t border-line">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={input}
              value={text}
              rows={1}
              dir="auto"
              translate="no"
              maxLength={4000}
              onChange={(e) => {
                setText(e.target.value);
                grow(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t(X.placeholder)}
              aria-label={t(X.placeholder)}
              className="flex-1 min-h-11 max-h-[140px] px-3.5 py-2.5 rounded-2xl bg-surface border border-line text-[14px] leading-snug resize-none focus:outline-none focus:border-accent"
              data-ai-input
            />
            {busy ? (
              <button type="button" onClick={() => ctl.current && ctl.current.abort()} aria-label={t(X.stop)} className="press grid place-items-center w-11 h-11 shrink-0 rounded-full bg-elevated text-ink" data-ai-stop>
                <Square size={15} />
              </button>
            ) : (
              <button type="submit" disabled={!text.trim()} aria-label={t(X.send)} className="press grid place-items-center w-11 h-11 shrink-0 rounded-full bg-accent text-on-accent disabled:opacity-40" data-ai-send>
                <ArrowUp size={18} />
              </button>
            )}
          </form>
          <p className="mt-1.5 px-1 flex items-center justify-between gap-2 text-[10.5px] text-ink-3 leading-snug">
            <span>{t(X.disclaimer)}</span>
            {q.remaining !== null && q.limit !== null && (
              <span className="shrink-0" data-ai-remaining={q.remaining}>
                {t(X.remaining).replace("{n}", String(q.remaining)).replace("{m}", String(q.limit))}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
