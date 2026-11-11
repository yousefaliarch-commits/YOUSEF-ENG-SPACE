// =====================================================================
//  «قل المقاسات بصوتك» — dictate a concrete take-off inside the assistant. The sentence is read on the phone by the pure parser
//  (domain/tools/voice-parse.ts — no AI call, no allowance spent); the card shows what it understood, asks for what is missing
//  (a dimension is never guessed; grade and waste have visible defaults), then saves a concrete take-off document and opens it,
//  ready for the A4 / Word / Excel export.
//  The mic uses the browser's speech recognition where there is one; everywhere else (iOS web view, desktop Firefox) the text box
//  takes the phone keyboard's own dictation key — same sentence, same result.
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Wand2 } from "lucide-react";
import { L2, say } from "../../i18n/i18n";
import { Panel } from "../../ui/primitives";
import { newDocId, type ToolDoc } from "../../data/tool-docs";
import {
  KIND_NAME, VOICE_GRADES, applyAnswers, defaultWaste, parseDictation, previewTakeoff, toConcreteRows, type VoiceAnswers,
} from "../../domain/tools/voice-parse";

const X = {
  title: L2("قل المقاسات بصوتك", "Say the sizes"),
  sub: L2("«١٠ قواعد بمقاس ٢ في ٢٫٥ وارتفاع ٦٠ سم» — أفهمها وأسألك عن الناقص ثم أفتح جدول الحصر جاهزًا للتصدير.", "“10 footings 2 by 2.5, height 60 cm” — I read it, ask for what is missing, then open the take-off ready to export."),
  placeholder: L2("احسبلي كمية خرسانة لقواعد مسلحة 10 قواعد بمقاس 2 في 2.5 وارتفاع 60 سم", "Calculate concrete for 10 footings 2 by 2.5 m, height 60 cm"),
  mic: L2("تحدّث", "Speak"),
  stop: L2("إيقاف", "Stop"),
  understood: L2("فهمت", "Understood"),
  nothing: L2("لم أجد عنصرًا خرسانيًا في الجملة — جرّب: قواعد، بلاطة، سملات، أعمدة، كمرات، حوائط.", "No concrete element found — try footings, slab, tie beams, columns, beams, walls."),
  missing: L2("ناقص", "Missing"),
  optional: L2("اختياري", "Optional"),
  grade: L2("رتبة الخرسانة", "Concrete grade"),
  waste: L2("الهالك %", "Waste %"),
  wasteDef: L2("حسب نوع العنصر", "by element"),
  assumed: L2("اعتبرتها سنتيمترات", "read as centimetres"),
  net: L2("صافي", "Net"),
  order: L2("للطلب", "To order"),
  form: L2("شدات", "Formwork"),
  make: L2("أنشئ جدول الحصر", "Create the take-off"),
  made: L2("تم إنشاء الحصر", "Take-off created"),
  fail: L2("تعذّر الحفظ على الجهاز", "Could not save on this device"),
  noMic: L2("المايك غير متاح هنا — استخدم زر الإملاء في لوحة المفاتيح.", "No microphone here — use your keyboard's dictation key."),
  micFail: L2("تعذّر التسجيل — اكتب الجملة أو أملِها من لوحة المفاتيح.", "Could not listen — type it or use keyboard dictation."),
  count: L2("العدد", "Count"),
};

// the browser's recogniser, when it has one (never assumed)
type Recogniser = {
  lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void;
};
function recogniserCtor(): (new () => Recogniser) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recogniser; webkitSpeechRecognition?: new () => Recogniser };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// the slice of the app this card uses
type VoiceApp = {
  lang?: string; activeProject?: string | null; toast(m: string): void; push(s: { type: string; id: string }): void;
  toolStore(): Promise<{ save(d: ToolDoc): Promise<{ status: string; doc: ToolDoc }> }>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function VoiceTool({ app }: { app: VoiceApp }) {
  const t = (x: Parameters<typeof say>[1]) => say(app, x);
  const ar = (app?.lang || "ar") === "ar";
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<VoiceAnswers>({});
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const rec = useRef<Recogniser | null>(null);

  const parsed = useMemo(() => parseDictation(text), [text]);
  const applied = useMemo(() => applyAnswers(parsed, answers), [parsed, answers]);
  const rows = useMemo(() => toConcreteRows(applied.elements, applied.wastePct), [applied]);
  const ready = parsed.elements.length > 0 && applied.open.length === 0;
  const totals = useMemo(() => (ready ? previewTakeoff(rows) : null), [ready, rows]);

  useEffect(() => () => rec.current?.stop(), []);

  const listen = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recogniserCtor();
    if (!Ctor) {
      setNote(t(X.noMic));
      return;
    }
    setNote("");
    try {
      const r = new Ctor();
      r.lang = ar ? "ar-EG" : "en-US";
      r.interimResults = true;
      r.continuous = false;
      r.onresult = (e) => {
        let s = "";
        for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript + " ";
        setText(s.trim());
        setAnswers({});
      };
      r.onerror = () => {
        setNote(t(X.micFail));
        setListening(false);
      };
      r.onend = () => setListening(false);
      rec.current = r;
      r.start();
      setListening(true);
    } catch {
      setNote(t(X.micFail));
      setListening(false);
    }
  };

  const make = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const { TOOL_MODULES } = await import("../tools/module");
      const mod = await TOOL_MODULES.concrete();
      const body = { ...mod.blank(), scope: "takeoff", grade: applied.grade, rows };
      const doc: ToolDoc = {
        id: newDocId(), kind: "concrete", v: mod.v, at: 0, createdAt: Date.now(), projectId: app.activeProject || null, title: "حصر الخرسانة",
        dateIso: today(), docNo: null, rev: "00", status: "draft", profile: mod.profile, body, photos: {}, log: [],
      };
      const s = await app.toolStore();
      const r = await s.save(doc);
      if (r.status === "failed") {
        app.toast(t(X.fail));
        return;
      }
      app.toast(t(X.made));
      app.push({ type: "tooldoc", id: `concrete:${r.doc.id}` });
    } catch {
      app.toast(t(X.fail));
    } finally {
      setBusy(false);
    }
  };

  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const input = "w-full min-h-11 rounded-xl border border-line-3 bg-wash px-3 text-[14px]";
  const supported = typeof window !== "undefined" && !!recogniserCtor();

  return (
    <Panel className="mt-4 p-4" data-voice-tool>
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-2xl bg-wash text-accent"><Wand2 size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{t(X.title)}</p>
          <p className="mt-0.5 text-[12px] text-ink-2 leading-snug">{t(X.sub)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAnswers({});
          }}
          rows={2}
          dir="auto"
          placeholder={t(X.placeholder)}
          aria-label={t(X.title)}
          className={`${input} py-2 leading-snug resize-none`}
          data-voice-text
        />
        <button
          type="button"
          onClick={listen}
          aria-label={t(listening ? X.stop : X.mic)}
          aria-pressed={listening}
          disabled={!supported && !listening}
          className={`press grid place-items-center w-11 h-11 shrink-0 rounded-full ${listening ? "bg-accent text-white" : "bg-wash text-accent"} disabled:opacity-40`}
          data-voice-mic
        >
          {listening ? <Square size={16} /> : <Mic size={18} />}
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] text-ink-2" role="status">{note}</p>}

      {text.trim() !== "" && parsed.elements.length === 0 && <p className="mt-3 text-[12.5px] text-ink-2" data-voice-none>{t(X.nothing)}</p>}

      {parsed.elements.length > 0 && (
        <div className="mt-3 space-y-3" data-voice-result>
          <p className="text-[12px] text-ink-3">{t(X.understood)}</p>
          {applied.elements.map((e, i) => (
            <div key={i} className="rounded-xl bg-wash p-3 text-[13px]" data-voice-el={e.kind}>
              <p className="font-medium">
                {ar ? KIND_NAME[e.kind].ar : KIND_NAME[e.kind].en} × <bdi dir="ltr">{e.n ?? "?"}</bdi>
              </p>
              <p className="mt-1 text-ink-2">
                {Object.entries(e.dims)
                  .filter(([, v]) => v != null)
                  .map(([k, v]) => `${k} = ${v} m`)
                  .join(" · ")}
              </p>
              {e.assumed.length > 0 && <p className="mt-1 text-[11.5px] text-ink-3">{e.assumed.join("، ")} — {t(X.assumed)}</p>}
            </div>
          ))}

          {parsed.questions.map((q) => {
            const done = applied.open.every((o) => o.id !== q.id) && (q.required ? true : false);
            if (q.field === "grade") {
              return (
                <label key={q.id} className="block text-[12.5px]">
                  <span className="text-ink-2">{t(X.grade)} · {t(X.optional)}</span>
                  <select value={answers.grade || "C30"} onChange={(e) => set("grade", e.target.value)} className={`${input} mt-1`} data-voice-q="grade">
                    {VOICE_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
              );
            }
            if (q.field === "waste") {
              return (
                <label key={q.id} className="block text-[12.5px]">
                  <span className="text-ink-2">{t(X.waste)} · {t(X.optional)} ({t(X.wasteDef)}: {applied.elements.map((e) => defaultWaste(e.kind)).join(" / ")})</span>
                  <input value={answers.waste || ""} onChange={(e) => set("waste", e.target.value)} inputMode="decimal" dir="ltr" className={`${input} mt-1`} data-voice-q="waste" />
                </label>
              );
            }
            if (done) return null;
            return (
              <label key={q.id} className="block text-[12.5px]">
                <span className="text-ink-2">{q.required ? t(X.missing) : t(X.optional)} · {ar ? q.ask.ar : q.ask.en}</span>
                <input value={answers[q.id] || ""} onChange={(e) => set(q.id, e.target.value)} inputMode="decimal" dir="ltr" className={`${input} mt-1`} data-voice-q={q.id} />
              </label>
            );
          })}

          {totals && (
            <p className="text-[12.5px] text-ink-2" data-voice-total>
              {t(X.net)} <bdi dir="ltr">{totals.netM3.toFixed(2)} m³</bdi> · {t(X.order)} <bdi dir="ltr">{totals.orderM3.toFixed(2)} m³</bdi> · {t(X.form)} <bdi dir="ltr">{totals.formworkM2.toFixed(1)} m²</bdi>
            </p>
          )}
          <button
            type="button"
            onClick={make}
            disabled={!ready || busy}
            className="press w-full min-h-11 rounded-full bg-accent text-white text-[14px] font-medium disabled:opacity-40"
            data-voice-make
          >
            {t(X.make)}
          </button>
        </div>
      )}
    </Panel>
  );
}
