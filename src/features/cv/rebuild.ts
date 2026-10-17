// =====================================================================
//  CV review — the rebuilt draft (v25)
//  The same facts, with every fix the audit found applied: one column, standard headings, the contact line, the
//  regional personal block (birth date, marital status, nationality and military status kept — the national ID and the
//  street address dropped), the drafted summary and every rewritten bullet. Nothing is invented: whatever the CV does not
//  say becomes a structured [ADD: …] / [أضف: …] placeholder, and every placeholder is listed as a question to answer.
//  The draft prints as an A4 PDF through the document kit (src/doc, plain letterhead mode) and is re-screened by the
//  same audit, so the screen's verdict before and after is measured, not promised.
// =====================================================================
import { L2 } from "../../i18n/i18n";
import { TITLE_EN, auditCV, trackL2 } from "./audit";
import { CV_FLUFF_TEST, CV_MILITARY_RE, CV_PERSONAL } from "./extract";
import { gradeOf, hiringPanel, type Verdict } from "./panel";
import type { DocBlock, DocSpec } from "../../doc/model";

const APP_VERSION = typeof __BUILD__ !== "undefined" ? __BUILD__.version : "dev";

export type DraftSection = { id: string; title: string; items: { head?: string; lines: string[] }[] };
export type CVDraft = {
  lang: "ar" | "en";
  name: string;
  headline: string;
  contact: string;
  personal: string[];
  lead: string;
  summary: string;
  sections: DraftSection[];
  asks: string[];
};

const HEAD = {
  summary: L2("الملخص المهني", "Professional Summary"),
  experience: L2("الخبرات العملية", "Work Experience"),
  training: L2("التدريب", "Internships & Training"),
  projects: L2("المشاريع", "Projects"),
  grad: L2("مشروع التخرج", "Graduation Project"),
  education: L2("التعليم", "Education"),
  skills: L2("المهارات", "Skills"),
  certs: L2("الشهادات والدورات", "Certifications"),
  languages: L2("اللغات", "Languages"),
  personal: L2("البيانات الشخصية", "Personal Details"),
};

// printed with the draft and shown above it: the draft is a starting point, not a statement of fact
export const DRAFT_NOTE = L2(
  "كل [أضف: …] معلومة لم تذكرها سيرتك — اكتبها بأرقامك الحقيقية أو احذف الجملة. البنود المعاد صياغتها اقتراحات: احتفظ فقط بما حدث فعلًا، ولا ترسل المسودة قبل مراجعتها سطرًا سطرًا.",
  "Every [ADD: …] is something your CV did not say — fill it with your real figures or drop the sentence. Rewritten bullets are suggestions: keep only what really happened, and don't send the draft before checking it line by line.",
);

// «[N] m²» → «[ADD: N m²]»: one shape for every gap, in the CV's own language
export function addMarks(s: string, ar: boolean): string {
  const tag = ar ? "أضف" : "ADD";
  return String(s || "").replace(/\[([^\]]*)\]/g, (m0, inner) => {
    const x = String(inner).trim();
    if (/^(ADD|أضف)\s*:/.test(x)) return m0;
    return `[${tag}: ${x || (ar ? "القيمة" : "value")}]`;
  });
}

const KEEP_PERSONAL = ["تاريخ الميلاد أو السن", "الحالة الاجتماعية", "الجنسية", "النوع"];

export function rebuildCV(r: any): CVDraft {
  const cv = r.cv;
  const ar = cv.lang === "ar";
  const say = (x: { ar: string; en: string }) => (ar ? x.ar : x.en);
  const mark = (s: string) => addMarks(s, ar);
  const allLines: string[] = String(cv.text || "").split(/\n/).map((l) => l.trim()).filter(Boolean);

  // the header: name, title, one contact line
  const name = cv.name || (ar ? "[أضف: الاسم الكامل]" : "[ADD: full name]");
  const track = trackL2(r.target, r.disc);
  const headline = cv.headline || (ar ? `مهندس ${r.profile.discLabel.ar} — ${track.ar}` : `${TITLE_EN[r.disc] || "Engineer"} — ${track.en}`);
  const ct = cv.contact || {};
  const badMail = r.high.some((i: any) => i.id === "email");
  const contact = [
    ct.phone || (ar ? "[أضف: الهاتف +20 1xx xxx xxxx]" : "[ADD: phone +20 1xx xxx xxxx]"),
    ct.email && !badMail ? ct.email : ar ? "[أضف: بريد بصيغة الاسم.اللقب]" : "[ADD: e-mail as name.surname]",
    ct.location || (ar ? "[أضف: المدينة]" : "[ADD: city]"),
    ct.linkedin || "",
  ].filter(Boolean).join(" · ");

  // the regional personal block: kept as written, the military line made explicit
  const personal: string[] = [];
  KEEP_PERSONAL.forEach((k) => {
    const re = (CV_PERSONAL as any)[k];
    const l = re && allLines.find((x) => re.test(x) && x.length <= 80);
    if (l && !personal.includes(l)) personal.push(l);
  });
  const mil = (r.regional || []).find((x: any) => x.key === "military");
  const milLine = allLines.find((l) => CV_MILITARY_RE.test(l) && l.length <= 80);
  if (mil && (mil.state === "missing" || cv.military === "mentioned")) {
    personal.push(ar ? "الموقف من التجنيد: [أضف: أدّى الخدمة (السنة) / معافى نهائيًا / مؤجل حتى السنة]" : "Military status: [ADD: completed (year) / permanently exempt / postponed until year]");
  } else if (milLine) {
    // «postponed» alone leaves the employer guessing: ask for the year
    const noYear = cv.military === "postponed" && !/(19|20)\d{2}/.test(milLine);
    personal.push(noYear ? `${milLine} ${ar ? "حتى [أضف: السنة]" : "until [ADD: year]"}` : milLine);
  }

  // a strong grade leads for a fresh or junior engineer
  const g = gradeOf(cv);
  const edu0 = cv.education[0];
  const degreeLine = edu0 && edu0.lines && edu0.lines.find((l: string) => !/(graduation project|مشروع التخرج)/i.test(l));
  const lead = g.tier === "high" && (r.fresh || r.years < 3) && degreeLine ? degreeLine : "";

  // experience with the rewritten bullets in place
  const rw = new Map<string, Map<string, string>>();
  (r.rewrites || []).forEach((grp: any) => {
    rw.set(grp.role, new Map(grp.items.map((it: any) => [it.before, it.after])));
  });
  const roleItem = (e: any) => {
    const key = [e.title, e.company].filter(Boolean).join(" — ");
    const m = rw.get(key);
    let head = e.headerLines[0] || key;
    if (!e.start && !e.year) head += ar ? " · [أضف: من – إلى]" : " · [ADD: from – to]";
    const lines = e.bullets
      .map((b: any) => (m && m.get(b.text)) || b.text)
      // a bare soft-skill line («team player») goes; a real bullet that mentions one stays
      .filter((t: string) => t && (!CV_FLUFF_TEST.test(t) || t.split(/\s+/).length > 6))
      .map(mark);
    // a main role shows 3 bullets at least: the missing ones are asked for, never written for the candidate
    const slot = ar
      ? "[أضف: إنجاز آخر — ماذا فعلت، في أي مشروع، وبأي نتيجة بالأرقام]"
      : "[ADD: another achievement — what you did, on which project, with which measurable result]";
    while (lines.length < 3) lines.push(slot);
    return { head: mark(head), lines };
  };
  const real = cv.experience.filter((e: any) => !e.intern);
  const interns = cv.experience.filter((e: any) => e.intern);
  const exp: DraftSection = { id: "experience", title: say(HEAD.experience), items: (r.fresh ? cv.experience : real).map(roleItem) };
  const train: DraftSection = { id: "training", title: say(HEAD.training), items: r.fresh ? [] : interns.map(roleItem) };

  const sec = (id: string) => (cv.sections[id] ? cv.sections[id].lines.filter(Boolean) : []);
  const projects: DraftSection = { id: "projects", title: say(HEAD.projects), items: sec("projects").length ? [{ lines: sec("projects").map(mark) }] : [] };
  const gradLines = cv.education.map((e: any) => e.gradProject).filter(Boolean);
  const grad: DraftSection = { id: "grad", title: say(HEAD.grad), items: gradLines.length ? [{ lines: gradLines.map((l: string) => l.replace(/^(graduation project|مشروع التخرج)\s*[:：-]\s*/i, "")) }] : [] };
  const education: DraftSection = {
    id: "education", title: say(HEAD.education),
    items: cv.education.map((e: any) => ({
      lines: (e.lines && e.lines.length ? e.lines : [e.degree, e.university, e.grade].filter(Boolean))
        .filter((l: string) => !/(graduation project|مشروع التخرج)/i.test(l)),
    })).filter((x: any) => x.lines.length),
  };
  if (r.fresh && !gradLines.length) {
    grad.items.push({ lines: [ar ? "[أضف: عنوان مشروع التخرج — النظام، البرامج، ودورك في الفريق]" : "[ADD: graduation project — system, software and your role in the team]"] });
  }

  // skills: only what the CV already shows, grouped; soft-skill clichés dropped
  const tools = [...new Set([...(cv.tools || []).map((x: any) => x.name), ...r.software.filter((x: any) => x.level !== "missing").map((x: any) => x.name)])];
  const codes = r.codes.filter((c: any) => c.state !== "missing").map((c: any) => c.name);
  const skillLines = [
    tools.length ? `${ar ? "البرامج" : "Software"}: ${tools.join(" · ")}` : "",
    codes.length ? `${ar ? "الأكواد والمعايير" : "Codes & standards"}: ${codes.join(" · ")}` : "",
  ].filter(Boolean);
  const skills: DraftSection = { id: "skills", title: say(HEAD.skills), items: skillLines.length ? [{ lines: skillLines }] : [] };
  const certs: DraftSection = { id: "certs", title: say(HEAD.certs), items: sec("certs").length ? [{ lines: sec("certs") }] : [] };
  const langs: DraftSection = { id: "languages", title: say(HEAD.languages), items: sec("languages").length ? [{ lines: sec("languages") }] : [] };

  // order: experience first once there is real experience; a fresh graduate with a modest grade leads with the
  // graduation project and training, one with a strong grade with the education
  const low = g.tier === "low" || g.tier === "none";
  const order = !r.fresh
    ? [exp, train, projects, education, skills, certs, langs]
    : low
      ? [grad, exp, projects, skills, education, certs, langs]
      : [education, grad, exp, projects, skills, certs, langs];
  const sections = order.filter((s) => s.items.length);

  const summary = mark(r.summary && r.summary.after ? r.summary.after : "");
  const draft: CVDraft = { lang: ar ? "ar" : "en", name, headline, contact, personal, lead, summary, sections, asks: [] };
  draft.asks = [...new Set(draftText(draft).match(/\[(?:ADD|أضف):[^\]]*\]/g) || [])];
  return draft;
}

// the draft as plain text (copy, and the re-screen); headings on their own line, bullets with «- »
export function draftText(d: CVDraft): string {
  const ar = d.lang === "ar";
  const out: string[] = [d.name, d.headline, d.contact];
  if (d.lead) out.push(d.lead);
  out.push(...d.personal);
  if (d.summary) out.push("", ar ? HEAD.summary.ar : HEAD.summary.en, d.summary);
  d.sections.forEach((s) => {
    out.push("", s.title);
    s.items.forEach((it) => {
      if (it.head) out.push(it.head);
      it.lines.forEach((l) => out.push(it.head ? `- ${l}` : l));
    });
  });
  return out.join("\n");
}

// the draft as it reads once every placeholder holds a value of the right shape (a date range, a number, the first
// option offered) — used only to re-screen the structure, never shown or exported as the candidate's facts
export function filledText(d: CVDraft): string {
  return draftText(d).replace(/\[(?:ADD|أضف):\s*([^\]]*)\]/g, (_m, inner: string) => {
    const x = inner.trim();
    if (/(from|من)\s*[–-]\s*(to|إلى)/i.test(x)) return "01/2020 – 12/2021";
    if (/(e-?mail|بريد)/i.test(x)) return "name.surname@gmail.com";
    if (/(phone|الهاتف)/i.test(x)) return "+20 100 000 0000";
    if (/^(N|X|العدد|القيمة|\d)/i.test(x) || x.length <= 2) return "12";
    return x.split(/\s*\/\s*/)[0];
  });
}

// the automated screen's verdict on the original CV and on the rebuilt draft once its [ADD] items are filled
export function rescreen(r: any, ctx: any = {}): { before: Verdict; after: Verdict; draftScore: number; still: { ar: string; en: string }[] } {
  const before = hiringPanel(r).find((x) => x.id === "screen")!.verdict;
  try {
    const d = auditCV(filledText(rebuildCV(r)), { profile: ctx.profile, track: r.target, jd: ctx.jd, layout: { pages: 1, images: 0, columns: false, tables: 0, type: "txt", glyphs: 0 } });
    const screen = hiringPanel(d).find((x) => x.id === "screen")!;
    // what still stops the screen once the draft is filled — it needs facts the original CV never gave
    const still = screen.verdict === "pass" ? [] : screen.reasons.filter((x) => !x.good).map((x) => x.text);
    return { before, after: screen.verdict, draftScore: d.overall, still };
  } catch {
    return { before, after: before, draftScore: r.overall, still: [] };
  }
}

// the draft as an A4 document: the person's letterhead, then headings and paragraphs / bullets
export function draftSpec(d: CVDraft): DocSpec {
  const ar = d.lang === "ar";
  const blocks: DocBlock[] = [];
  if (d.summary) {
    blocks.push({ k: "heading", text: ar ? HEAD.summary.ar : HEAD.summary.en });
    blocks.push({ k: "para", text: d.summary });
  }
  d.sections.forEach((s) => {
    blocks.push({ k: "heading", text: s.title });
    s.items.forEach((it) => {
      if (it.head) blocks.push({ k: "para", text: it.head, strong: true });
      it.lines.forEach((l) => blocks.push({ k: "para", text: l, bullet: !!it.head }));
    });
  });
  if (d.asks.length) {
    blocks.push({ k: "pageBreak" });
    blocks.push({ k: "heading", text: ar ? "قبل الإرسال: املأ هذه البيانات" : "Before you send it: fill these in" });
    blocks.push({ k: "para", muted: true, text: DRAFT_NOTE[ar ? "ar" : "en"] });
    d.asks.forEach((q) => blocks.push({ k: "para", text: q, bullet: true }));
  }
  const now = new Date().toISOString();
  return {
    meta: {
      docType: "CV", docTypeName: ar ? "مسودة سيرة ذاتية" : "CV draft", docNo: null, rev: "0", status: "draft",
      dateIso: now.slice(0, 10), lang: d.lang, issuer: d.name.replace(/\[[^\]]*\]/g, "").trim() || "EngSpace member", issuerRole: "contractor",
      appVersion: APP_VERSION, profileLabel: "", engines: [], hash: "",
      plain: { name: d.name, lines: [d.headline, d.contact, d.lead, d.personal.join(" · ")].filter(Boolean) },
    },
    title: { parties: [], title: ar ? "مسودة سيرة ذاتية" : "CV draft", discipline: "", location: "", reference: "" },
    revisions: [],
    sections: [{ orientation: "portrait", blocks }],
    colophon: { generatedAt: now, appVersion: APP_VERSION, backend: "raster", profiles: [], unverified: 0, overridden: [], hash: "", disclaimer: "" },
  };
}
