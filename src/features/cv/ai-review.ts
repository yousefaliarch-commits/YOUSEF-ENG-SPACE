// =====================================================================
//  CV review v26 — the AI panel (docs/AI.md → CV review)
//  The on-device audit (audit.ts) still runs first and instantly: it is the offline answer, the source of the structural
//  «facts» the model is given, and the fallback when the AI is unavailable. With a connection, the redacted CV + those facts go
//  to Gemini through the ai-chat proxy, which answers in a fixed JSON shape (the same 100-point rubric, the four readers, the
//  Egyptian rules). Everything that comes back is validated and clamped here, then laid over the audit result so every card
//  on the screen renders it unchanged. The rebuilt CV is guarded: a number the original CV never states becomes an [ADD: …] slot.
// =====================================================================
import { L2 } from "../../i18n/i18n";
import { askJson, type AiError } from "../../services/ai-service";
import { redactCV, restore, type Redaction } from "../../services/ai-redact";
import { REVIEWERS, type Reviewer, type ReviewerId, type Verdict } from "./panel";
import { addMarks, rebuildCV, type CVDraft, type DraftSection } from "./rebuild";

type T = { ar: string; en: string };
const both = (s: string): T => ({ ar: String(s || ""), en: String(s || "") });
const str = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown, max = 40): any[] => (Array.isArray(v) ? v.slice(0, max) : []);
const RIDS: ReviewerId[] = ["screen", "manager", "recruiter", "teammate"];
const VERDICTS: Verdict[] = ["pass", "maybe", "reject"];
const SEV = ["critical", "high", "rec"] as const;
const PILLAR_IDS = ["software", "scope", "track", "codes", "ats"];

export type AiCv = {
  overall: number;
  projected: number;
  verdict: string;
  pillars: { id: string; pts: number; why: string }[];
  reviewers: { id: ReviewerId; verdict: Verdict; score: number; findings: { issue: string; severity: (typeof SEV)[number]; cvLine: string; fix: string }[] }[];
  top3: { issue: string; severity: (typeof SEV)[number]; fix: string; reviewer: ReviewerId }[];
  questions: { question: string; why: string; howToAnswer: string }[];
  honesty: string;
  inconsistencies: string[];
  knownProjects: { name: string; context: string; confidence: "high" | "medium" | "low" }[];
  drafts: { en: CVDraft | null; ar: CVDraft | null };
  guarded: number;
};

// ---------------------------------------------------------------- what the model is told about the CV's structure
export function factsOf(r: any, uiLang: "ar" | "en", jd?: string) {
  return {
    uiLang,
    cvLang: r.cv.lang,
    discipline: r.disc,
    targetTrack: r.target,
    detectedTrack: r.detected,
    years: r.years,
    freshGraduate: r.fresh,
    tools: r.software.filter((x: any) => x.level !== "missing").map((x: any) => `${x.name}: ${x.level}`),
    missingCoreTools: r.missing.core,
    codes: r.codes.filter((c: any) => c.state !== "missing").map((c: any) => `${c.name}: ${c.state}`),
    sections: Object.keys(r.cv.sections || {}),
    layout: { columns: !!r.layout.columns, tables: r.layout.tables || 0, pages: r.layout.pages || 1 },
    words: r.words,
    gaps: (r.cv.gaps || []).map((g: any) => `${g.months} months between «${g.after}» and «${g.before}»`),
    militaryStatus: r.cv.military || "not stated",
    syndicateStated: !!r.syndicate,
    onDeviceScore: r.overall,
    jobAd: jd ? String(jd).slice(0, 6000) : undefined,
  };
}

// ---------------------------------------------------------------- the number guard
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const normNum = (s: string) => s.replace(/[,٬]/g, "").replace(/^0+(?=\d)/, "");
export function allowedNumbers(cvText: string, years?: number): Set<string> {
  const t = String(cvText || "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, (m) => ` ${String(MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1)} `);
  const out = new Set<string>((t.match(/\d[\d,٬.]*/g) || []).map((n) => normNum(n.replace(/\.$/, ""))));
  // a phone written with spaces is one number
  (t.match(/\d[\d\s-]{6,}\d/g) || []).forEach((n) => out.add(n.replace(/\D/g, "")));
  if (years) {
    out.add(String(Math.floor(years)));
    out.add(String(Math.round(years)));
  }
  ["2", "3"].forEach((n) => out.add(n)); // m² / m³ written as m2 / m3
  return out;
}

// every figure the CV never states becomes a slot; returns the text and how many were caught
export function guardNumbers(s: string, allowed: Set<string>, ar: boolean): { text: string; caught: number } {
  let caught = 0;
  const parts = String(s || "").split(/(\[[^\]]*\])/g); // never touch inside an existing slot
  const text = parts
    .map((p) =>
      /^\[[^\]]*\]$/.test(p)
        ? p
        : p.replace(/\d[\d,٬.]*/g, (m) => {
            const n = normNum(m.replace(/[.,]$/, ""));
            if (allowed.has(n) || allowed.has(n.replace(/\.0+$/, ""))) return m;
            caught++;
            return ar ? "[أضف: الرقم]" : "[ADD: figure]";
          }),
    )
    .join("");
  return { text, caught };
}

// ---------------------------------------------------------------- validating what came back
function draftOf(doc: any, lang: "ar" | "en", r: any, red: Redaction, allowed: Set<string>, counter: { n: number }): CVDraft | null {
  if (!doc || typeof doc !== "object") return null;
  const ar = lang === "ar";
  const base = rebuildCV(r, lang); // name, contact and the personal block come from the device, never from the model
  const clean = (s: string) => {
    const g = guardNumbers(addMarks(restore(str(s, 1200), red.values), ar), allowed, ar);
    counter.n += g.caught;
    return g.text;
  };
  const sections: DraftSection[] = arr(doc.sections, 12)
    .map((s: any) => ({
      id: str(s.id, 20) || "experience",
      title: str(s.title, 80) || (ar ? "القسم" : "Section"),
      items: arr(s.items, 30).map((it: any) => ({
        head: str(it.head, 300) ? clean(it.head) : undefined,
        lines: arr(it.lines, 20).map((l: any) => clean(l)).filter(Boolean),
      })).filter((it: any) => it.head || it.lines.length),
    }))
    .filter((s: DraftSection) => s.items.length);
  if (!sections.length) return null;
  const personal = arr(doc.personal, 6).map((p: any) => clean(p)).filter((p: string) => p && !/(national id|الرقم القومي|religion|الديانة)/i.test(p));
  const d: CVDraft = {
    lang, source: r.cv.lang === "ar" ? "ar" : "en",
    name: base.name, headline: clean(doc.headline) || base.headline, contact: base.contact,
    personal: personal.length ? personal : base.personal, lead: base.lead,
    summary: clean(doc.summary), sections, asks: [], translated: 0, pairs: [],
  };
  d.asks = [...new Set((JSON.stringify(d).match(/\[(?:ADD|أضف):[^\]]*\]/g) || []))];
  return d;
}

export function sanitize(raw: any, r: any, red: Redaction): AiCv {
  const maxOf = Object.fromEntries(r.pillars.map((p: any) => [p.id, p.max]));
  const pillars = PILLAR_IDS.map((id) => {
    const p = arr(raw.pillars).find((x: any) => x && x.id === id) || {};
    const pts = Math.max(0, Math.min(maxOf[id] || 0, Math.round(Number(p.pts) * 2) / 2 || 0));
    return { id, pts, why: str(p.why, 400) };
  });
  const overall = Math.round(pillars.reduce((a, p) => a + p.pts, 0));
  const reviewers = RIDS.map((id) => {
    const x = arr(raw.reviewers).find((v: any) => v && v.id === id) || {};
    return {
      id,
      verdict: (VERDICTS.includes(x.verdict) ? x.verdict : "maybe") as Verdict,
      score: Math.max(0, Math.min(100, Math.round(Number(x.score) || 0))),
      findings: arr(x.findings, 12).map((f: any) => ({
        issue: str(f.issue, 240), severity: (SEV.includes(f.severity) ? f.severity : "rec") as (typeof SEV)[number],
        cvLine: str(restore(str(f.cvLine, 300), red.values), 300), fix: str(f.fix, 500),
      })).filter((f: any) => f.issue),
    };
  });
  const allowed = allowedNumbers(r.cv.text, r.years);
  const counter = { n: 0 };
  return {
    overall,
    projected: Math.max(overall, Math.min(100, Math.round(Number(raw.projectedScore) || overall))),
    verdict: str(raw.verdict, 160),
    pillars,
    reviewers,
    top3: arr(raw.top3, 3).map((t: any) => ({ issue: str(t.issue, 240), severity: (SEV.includes(t.severity) ? t.severity : "high") as (typeof SEV)[number], fix: str(t.fix, 400), reviewer: (RIDS.includes(t.reviewer) ? t.reviewer : "manager") as ReviewerId })).filter((t: any) => t.issue),
    questions: arr(raw.interviewQuestions, 8).map((q: any) => ({ question: str(q.question, 300), why: str(q.why, 300), howToAnswer: str(q.howToAnswer, 400) })).filter((q: any) => q.question),
    honesty: str(raw.honestyLine, 400),
    inconsistencies: arr(raw.inconsistencies, 8).map((s: any) => str(s, 300)).filter(Boolean),
    knownProjects: arr(raw.knownProjects, 6).map((p: any) => ({ name: str(p.name, 120), context: str(p.context, 400), confidence: (["high", "medium", "low"].includes(p.confidence) ? p.confidence : "low") as "high" | "medium" | "low" })).filter((p: any) => p.name),
    drafts: {
      en: draftOf(raw.rebuilt && raw.rebuilt.en, "en", r, red, allowed, counter),
      ar: draftOf(raw.rebuilt && raw.rebuilt.ar, "ar", r, red, allowed, counter),
    },
    guarded: counter.n,
  };
}

// ---------------------------------------------------------------- the AI panel laid over the audit result
export function overlay(r: any, ai: AiCv): any {
  const tone = ai.overall >= 85 ? "good" : ai.overall >= 70 ? "accent" : ai.overall >= 55 ? "warn" : "bad";
  const pillars = r.pillars.map((p: any) => {
    const a = ai.pillars.find((x) => x.id === p.id)!;
    return { ...p, pts: a.pts, pct: Math.round((a.pts / p.max) * 100), why: a.why ? both(a.why) : undefined };
  });
  // findings become the action plan's issues, deduplicated, tagged with every reviewer who raised them
  const byIssue = new Map<string, any>();
  ai.reviewers.forEach((v) => v.findings.forEach((f, i) => {
    if (f.severity === "rec") return;
    const key = f.issue.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    const cur = byIssue.get(key);
    if (cur) {
      if (!cur.by.includes(v.id)) cur.by.push(v.id);
      if (f.severity === "critical") cur.sev = "critical";
    } else {
      byIssue.set(key, { id: `ai-${v.id}-${i}`, sev: f.severity, title: both(f.issue), why: both(f.cvLine ? `«${f.cvLine}»` : ""), fix: f.fix ? [both(f.fix)] : [], by: [v.id], ex: f.cvLine || undefined });
    }
  }));
  const issues = [...byIssue.values()];
  const panel: Reviewer[] = ai.reviewers.map((v) => ({
    id: v.id, ...REVIEWERS[v.id], score: v.score, verdict: v.verdict,
    reasons: v.findings.length
      ? v.findings.map((f) => ({ text: both(f.issue), quote: f.cvLine || undefined, good: f.severity === "rec" && /✓|strong|قوي|ممتاز|واضح/i.test(f.issue) }))
      : [{ text: both(ai.verdict || "—"), good: v.verdict === "pass" }],
  }));
  const low = [...panel].sort((a, b) => a.score - b.score)[0];
  const questions = [
    ...ai.questions.map((q, i) => ({ from: `ai${i}`, q: both(q.question), why: both(q.why), tip: both(q.howToAnswer) })),
    ...(r.questions || []),
  ].slice(0, Math.max(4, Math.min(8, ai.questions.length || 4)));
  const scale = ai.projected > ai.overall ? (ai.projected - ai.overall) : 0;
  const gap = pillars.reduce((a: number, p: any) => a + (p.max - p.pts), 0) || 1;
  return {
    ...r,
    ai: true,
    aiData: ai,
    overall: ai.overall,
    grade: [ai.verdict ? both(ai.verdict) : r.grade[0], tone],
    pillars,
    critical: issues.filter((i) => i.sev === "critical"),
    high: issues.filter((i) => i.sev === "high"),
    panel,
    honesty: { strong: ai.overall >= 75 && !issues.some((i) => i.sev === "critical"), reviewer: low ? low.id : "screen", text: both(ai.honesty || "") },
    questions,
    projection: {
      now: ai.overall,
      projected: ai.projected,
      pillars: pillars.map((p: any) => ({ id: p.id, now: p.pts, max: p.max, projected: Math.min(p.max, Math.round((p.pts + (scale * (p.max - p.pts)) / gap) * 2) / 2) })),
    },
    aiTop: ai.top3,
  };
}

// ---------------------------------------------------------------- the call
export async function reviewWithAi(r: any, o: { uiLang: "ar" | "en"; jd?: string; signal?: AbortSignal; onProgress?: (chars: number) => void }):
  Promise<{ ok: true; ai: AiCv } | { ok: false; error: AiError }> {
  const red = redactCV(r.cv.text, r.cv.name);
  const res = await askJson({
    feature: "cv-review",
    messages: [{ role: "user", text: red.text }],
    context: { facts: { ...factsOf(r, o.uiLang, o.jd), nationalIdPresent: red.hadNationalId } },
    signal: o.signal,
    onDelta: (_d, all) => o.onProgress && o.onProgress(all.length),
  });
  if (res.ok === false) return res;
  try {
    return { ok: true, ai: sanitize(res.data, r, red) };
  } catch {
    return { ok: false, error: { code: "parse", ar: "وصل رد غير مكتمل — حاول مرة أخرى", en: "The answer arrived incomplete — try again" } };
  }
}

export const AIX = {
  badge: L2("تحليل المهندس الذكي", "Smart Engineer analysis"),
  badgeSub: L2("مراجعة بالذكاء الاصطناعي على نفس معايير EngSpace", "AI review on EngSpace's own rubric"),
  device: L2("تحليل الجهاز", "On-device analysis"),
  showDevice: L2("عرض تحليل الجهاز", "Show the on-device analysis"),
  showAi: L2("عرض تحليل المهندس الذكي", "Show the Smart Engineer analysis"),
  run: L2("حلّل بالمهندس الذكي", "Analyse with the Smart Engineer"),
  running: L2("المهندس الذكي يراجع سيرتك…", "The Smart Engineer is reviewing your CV…"),
  runningSub: L2("لجنة من 4 مراجعين تقرأ السيرة الآن — يستغرق عادةً أقل من دقيقة.", "A four-reviewer panel is reading the CV — usually under a minute."),
  consentT: L2("قبل التحليل بالذكاء الاصطناعي", "Before the AI review"),
  consent: L2("سيُرسل نص سيرتك إلى Google Gemini للتحليل بعد حذف اسمك وهاتفك وبريدك وLinkedIn والعنوان والرقم القومي. لا يُحفظ النص على خوادمنا. يمكنك دائمًا الاكتفاء بتحليل الجهاز.", "Your CV text goes to Google Gemini for the review after your name, phone, e-mail, LinkedIn, address and national ID are removed. We don't store it on our servers. You can always stay with the on-device analysis."),
  agree: L2("موافق، حلّل", "OK, analyse"),
  stay: L2("تحليل الجهاز فقط", "On-device only"),
  failed: L2("تعذّر تحليل المهندس الذكي — يظهر تحليل الجهاز", "The Smart Engineer couldn't finish — showing the on-device analysis"),
  retry: L2("إعادة المحاولة", "Try again"),
  insights: L2("ملاحظات المهندس الذكي", "Smart Engineer notes"),
  inconsist: L2("تناقضات في السيرة", "Inconsistencies in the CV"),
  projects: L2("مشاريع معروفة ذكرتها", "Known projects you mention"),
  projectsNote: L2("معلومات عامة للتحقق — لا تُضاف إلى سيرتك تلقائيًا.", "Public context to verify — never added to your CV automatically."),
  guarded: L2("{n} رقمًا لم يرد في سيرتك استُبدل بخانة [أضف] — لا يُخترع أي رقم.", "{n} figure(s) not in your CV were turned into [ADD] slots — no number is invented."),
  rate: L2("هل كان التحليل مفيدًا؟", "Was this analysis useful?"),
  thanks: L2("شكرًا — رأيك يحسّن المهندس الذكي", "Thanks — your rating improves the Smart Engineer"),
  remaining: L2("{n} طلب متبقٍ اليوم", "{n} requests left today"),
};
