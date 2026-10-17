// =====================================================================
//  CV review — the rebuilt CV (v25)
//  The same facts, with every fix the audit found applied: one column, standard headings, the contact line, the regional
//  personal block (birth date, marital status, nationality and military status kept — the national ID and the street
//  address dropped), the drafted summary and every rewritten bullet. English by default (Egyptian and Gulf corporate
//  convention); Arabic on request — the other language is built from the CV's structure by ./translate.ts.
//  Nothing is invented: whatever the CV does not say, or what cannot be translated with certainty, becomes a structured
//  [ADD: …] / [أضف: …] slot the engineer fills in the app before exporting. The exported A4 PDF is white-label — the
//  engineer's own document, with no app name, mark or credit (document kit, plain letterhead mode).
// =====================================================================
import { L2 } from "../../i18n/i18n";
import { TITLE_EN, auditCV, draftEngSummary, trackL2 } from "./audit";
import { CV_FLUFF_TEST, CV_MILITARY_RE, CV_PERSONAL } from "./extract";
import { gradeOf, hiringPanel, type Verdict } from "./panel";
import {
  ask, bulletT, certT, companyT, datesT, degreeLine, langOf, languagesT, militaryT, personalT, placeT, titleT, unitsT, type Lang,
} from "./translate";
import type { DocBlock, DocSpec } from "../../doc/model";

const APP_VERSION = typeof __BUILD__ !== "undefined" ? __BUILD__.version : "dev";

export type DraftSection = { id: string; title: string; items: { head?: string; lines: string[] }[] };
export type CVDraft = {
  lang: Lang;
  source: Lang;
  name: string;
  headline: string;
  contact: string;
  personal: string[];
  lead: string;
  summary: string;
  sections: DraftSection[];
  asks: string[];
  translated: number;
  // every bullet rebuilt in the other language, next to the engineer's original (shown in the app to check)
  pairs: { from: string; to: string }[];
};

const HEAD = {
  summary: L2("الملخص المهني", "Professional Summary"),
  experience: L2("الخبرات العملية", "Professional Experience"),
  training: L2("التدريب", "Internships & Training"),
  projects: L2("المشاريع", "Key Projects"),
  grad: L2("مشروع التخرج", "Graduation Project"),
  education: L2("التعليم", "Education"),
  skills: L2("المهارات", "Technical Skills"),
  certs: L2("الشهادات والدورات", "Certifications & Courses"),
  languages: L2("اللغات", "Languages"),
};

// shown above the draft in the app (never printed): the draft is a starting point, not a statement of fact
export const DRAFT_NOTE = L2(
  "كل [أضف: …] معلومة لم تذكرها سيرتك أو لا يمكن ترجمتها بدقة — املأها بالأسفل قبل التنزيل. البنود المعاد صياغتها أو المترجمة اقتراحات: احتفظ فقط بما حدث فعلًا وراجع المسودة سطرًا سطرًا.",
  "Every [ADD: …] is something your CV did not say, or that can't be translated with certainty — fill it in below before downloading. Rewritten or translated bullets are suggestions: keep only what really happened and check the draft line by line.",
);

// «[N] m²» → «[ADD: N m²]»: one shape for every gap, in the draft's language
export function addMarks(s: string, ar: boolean): string {
  const tag = ar ? "أضف" : "ADD";
  return String(s || "").replace(/\[([^\]]*)\]/g, (m0, inner) => {
    const x = String(inner).trim();
    if (/^(ADD|أضف)\s*:/.test(x)) return m0;
    return `[${tag}: ${x || (ar ? "القيمة" : "value")}]`;
  });
}

const KEEP_PERSONAL = ["تاريخ الميلاد أو السن", "الحالة الاجتماعية", "الجنسية", "النوع"];
const isGradLine = (l: string) => /(graduation project|مشروع التخرج)/i.test(l);

export function rebuildCV(r: any, lang?: Lang): CVDraft {
  const cv = r.cv;
  const source: Lang = cv.lang === "ar" ? "ar" : "en";
  const to: Lang = lang || "en";
  const ar = to === "ar";
  const same = to === source;
  const say = (x: { ar: string; en: string }) => (ar ? x.ar : x.en);
  const mark = (s: string) => addMarks(s, ar);
  let translated = 0;
  const pairs: { from: string; to: string }[] = [];
  // a line in the other script is translated or asked for — never left in the wrong language
  const inLang = (s: string) => !s || langOf(s) === to;
  const orAsk = (v: string | null, orig: string, en: string, arT: string) => v || (orig ? ask(to, `${en} — «${orig}»`, `${arT} — «${orig}»`) : "");
  const allLines: string[] = String(cv.text || "").split(/\n/).map((l) => l.trim()).filter(Boolean);

  // the header: name, title, one contact line
  const name = !cv.name ? ask(to, "full name", "الاسم الكامل") : inLang(cv.name) ? cv.name : ask(to, `your name in English — «${cv.name}»`, `اسمك بالعربية — «${cv.name}»`);
  const track = trackL2(r.target, r.disc);
  const discAr = String(r.profile.discLabel.ar || "");
  const genTitle = ar ? `${discAr.startsWith("مهندس") ? discAr : `مهندس ${discAr}`} — ${track.ar}` : `${TITLE_EN[r.disc] || "Engineer"} — ${track.en}`;
  // a translated headline that is only the discipline («Civil Engineer») gives way to discipline — track
  const BARE = /^(Civil Engineer|Architect|Electrical Engineer|Mechanical Engineer|MEP Engineer|Surveyor|مهندس مدني|مهندس معماري|مهندس كهرباء|مهندس ميكانيكا|مهندس كهروميكانيك|مهندس مساحة)$/;
  const tHead = cv.headline && !inLang(cv.headline) ? titleT(cv.headline, to) : null;
  const headline = !cv.headline ? genTitle : inLang(cv.headline) ? cv.headline : tHead && !BARE.test(tHead) ? tHead : genTitle;
  const ct = cv.contact || {};
  const badMail = r.high.some((i: any) => i.id === "email");
  const city = ct.location
    ? inLang(ct.location) ? ct.location : placeT(ct.location, to) || ask(to, `city — «${ct.location}»`, `المدينة — «${ct.location}»`)
    : ask(to, "city", "المدينة");
  const contact = [
    ct.phone || ask(to, "phone +20 1xx xxx xxxx", "الهاتف +20 1xx xxx xxxx"),
    ct.email && !badMail ? ct.email : ask(to, "e-mail as name.surname", "بريد بصيغة الاسم.اللقب"),
    city,
    ct.linkedin || "",
  ].filter(Boolean).join(" · ");

  // the regional personal block: kept, the military line made explicit
  const personal: string[] = [];
  KEEP_PERSONAL.forEach((k) => {
    const re = (CV_PERSONAL as any)[k];
    const l = re && allLines.find((x) => re.test(x) && x.length <= 80 && !CV_MILITARY_RE.test(x));
    const v = l && (same ? l : personalT(l, to));
    if (v && !personal.includes(v)) personal.push(v);
  });
  const mil = (r.regional || []).find((x: any) => x.key === "military");
  const milLine = allLines.find((l) => CV_MILITARY_RE.test(l) && l.length <= 80);
  if (mil && (mil.state === "missing" || cv.military === "mentioned")) {
    personal.push(militaryT(null, "", to));
  } else if (milLine) {
    const noYear = cv.military === "postponed" && !/(19|20)\d{2}/.test(milLine);
    personal.push(same ? (noYear ? `${milLine} ${ar ? "حتى [أضف: السنة]" : "until [ADD: year]"}` : milLine) : militaryT(cv.military, milLine, to));
  }

  // a strong grade leads for a fresh or junior engineer
  const g = gradeOf(cv);
  const edu0 = cv.education[0];
  const degree0 = edu0 && edu0.lines && edu0.lines.find((l: string) => !isGradLine(l));
  const leadOn = g.tier === "high" && (r.fresh || r.years < 3) && degree0;
  const lead = !leadOn ? "" : same ? degree0 : degreeLine(cv, edu0, r.disc, to);

  // experience with the rewritten bullets in place (or rebuilt in the other language)
  const rw = new Map<string, Map<string, string>>();
  (r.rewrites || []).forEach((grp: any) => rw.set(grp.role, new Map(grp.items.map((it: any) => [it.before, it.after]))));
  const toolCtx = { tool: r.software.filter((x: any) => x.level !== "missing" && !["Excel", "Microsoft Office"].includes(x.name)).map((x: any) => x.name)[0] || null };
  const slot = ask(to, "another achievement — what you did, on which project, with which measurable result", "إنجاز آخر — ماذا فعلت، في أي مشروع، وبأي نتيجة بالأرقام");
  const roleItem = (e: any) => {
    const key = [e.title, e.company].filter(Boolean).join(" — ");
    const m = rw.get(key);
    let head: string;
    if (same) {
      head = e.headerLines[0] || key;
      if (!e.start && !e.year) head += ar ? " · [أضف: من – إلى]" : " · [ADD: from – to]";
    } else {
      const title = orAsk(titleT(e.title, to), e.title, "job title in English", "المسمى الوظيفي بالعربية") || ask(to, "job title", "المسمى الوظيفي");
      const company = e.company ? (inLang(e.company) ? e.company : orAsk(companyT(e.company, to), e.company, "employer name in English", "اسم جهة العمل بالعربية")) : "";
      const place = e.location ? (inLang(e.location) ? e.location : placeT(e.location, to) || "") : "";
      const dates = datesT(e, to) || ask(to, "from – to", "من – إلى");
      head = [title, company, place].filter(Boolean).join(" — ") + ` · ${dates}`;
    }
    const lines = e.bullets
      .map((b: any) => {
        const own = (m && m.get(b.text)) || b.text;
        if (same || inLang(b.text)) return own;
        translated++;
        const out = bulletT(b.text, r.disc, to, toolCtx);
        pairs.push({ from: b.text, to: addMarks(out, ar) });
        return out;
      })
      // a bare soft-skill line («team player») goes; a real bullet that mentions one stays
      .filter((t: string) => t && (!CV_FLUFF_TEST.test(t) || t.split(/\s+/).length > 6))
      .map(mark);
    // a main role shows 3 bullets at least: the missing ones are asked for, never written for the candidate
    while (lines.length < 3) lines.push(slot);
    return { head: mark(head), lines };
  };
  const real = cv.experience.filter((e: any) => !e.intern);
  const interns = cv.experience.filter((e: any) => e.intern);
  const exp: DraftSection = { id: "experience", title: say(HEAD.experience), items: (r.fresh ? cv.experience : real).map(roleItem) };
  const train: DraftSection = { id: "training", title: say(HEAD.training), items: r.fresh ? [] : interns.map(roleItem) };

  const sec = (id: string) => (cv.sections[id] ? cv.sections[id].lines.filter(Boolean) : []);
  const keepOrAsk = (l: string, what: [string, string]) => (inLang(l) ? l : ask(to, `${what[0]} — «${l}»`, `${what[1]} — «${l}»`));
  const projects: DraftSection = {
    id: "projects", title: say(HEAD.projects),
    items: sec("projects").length ? [{ lines: sec("projects").map((l: string) => mark(keepOrAsk(l, ["this project in English", "هذا المشروع بالعربية"]))) }] : [],
  };
  const gradLines = cv.education
    .map((e: any) => e.gradProject)
    .filter(Boolean)
    .map((l: string) => l.replace(/^(graduation project|مشروع التخرج)\s*[:：-]\s*/i, ""));
  const grad: DraftSection = {
    id: "grad", title: say(HEAD.grad),
    items: gradLines.length ? [{ lines: gradLines.map((l: string) => keepOrAsk(l, ["the graduation project in English", "مشروع التخرج بالعربية"])) }] : [],
  };
  if (r.fresh && !gradLines.length) {
    grad.items.push({ lines: [ask(to, "graduation project — system, software and your role in the team", "عنوان مشروع التخرج — النظام، البرامج، ودورك في الفريق")] });
  }
  const education: DraftSection = {
    id: "education", title: say(HEAD.education),
    items: cv.education.map((e: any) => ({
      lines: same
        ? (e.lines && e.lines.length ? e.lines : [e.degree, e.university, e.grade].filter(Boolean)).filter((l: string) => !isGradLine(l))
        : [degreeLine(cv, e, r.disc, to)],
    })).filter((x: any) => x.lines.length),
  };

  // skills: only what the CV already shows, grouped; soft-skill clichés dropped
  const tools = [...new Set([...(cv.tools || []).map((x: any) => x.name), ...r.software.filter((x: any) => x.level !== "missing").map((x: any) => x.name)])];
  const codes = r.codes.filter((c: any) => c.state !== "missing").map((c: any) => (ar && c.name === "Egyptian Code" ? "الكود المصري" : c.name));
  const skillLines = [
    tools.length ? `${ar ? "البرامج" : "Software"}: ${tools.join(" · ")}` : "",
    codes.length ? `${ar ? "الأكواد والمعايير" : "Codes & standards"}: ${codes.join(" · ")}` : "",
  ].filter(Boolean);
  const skills: DraftSection = { id: "skills", title: say(HEAD.skills), items: skillLines.length ? [{ lines: skillLines }] : [] };
  const certLines = sec("certs").map((l: string) => (same ? l : certT(l, r, to)));
  const certs: DraftSection = { id: "certs", title: say(HEAD.certs), items: certLines.length ? [{ lines: certLines }] : [] };
  const langLine = same ? sec("languages") : [languagesT(cv, to)].filter(Boolean);
  const langs: DraftSection = { id: "languages", title: say(HEAD.languages), items: langLine.length ? [{ lines: langLine }] : [] };

  // order: experience first once there is real experience; a fresh graduate with a modest grade leads with the
  // graduation project and training, one with a strong grade with the education
  const low = g.tier === "low" || g.tier === "none";
  const order = !r.fresh
    ? [exp, train, projects, education, skills, certs, langs]
    : low
      ? [grad, exp, projects, skills, education, certs, langs]
      : [education, grad, exp, projects, skills, certs, langs];
  const sections = order.filter((s) => s.items.length);

  const summary = mark(same ? (r.summary && r.summary.after) || "" : r.sumCtx ? unitsT(draftEngSummary({ ...cv, lang: to }, r.sumCtx), to) : "");
  const draft: CVDraft = { lang: to, source, name, headline, contact, personal, lead, summary, sections, asks: [], translated, pairs };
  draft.asks = [...new Set(draftText(draft).match(/\[(?:ADD|أضف):[^\]]*\]/g) || [])];
  return draft;
}

// every line of the draft with a stable key, in reading order (the fill-in form and the substitution walk the same list)
type LineRef = { key: string; text: string; set: (v: string) => void };
function lineRefs(d: CVDraft): LineRef[] {
  const out: LineRef[] = [];
  const add = (key: string, text: string, set: (v: string) => void) => out.push({ key, text, set });
  add("name", d.name, (v) => { d.name = v; });
  add("headline", d.headline, (v) => { d.headline = v; });
  add("contact", d.contact, (v) => { d.contact = v; });
  add("lead", d.lead, (v) => { d.lead = v; });
  d.personal.forEach((t, i) => add(`p${i}`, t, (v) => { d.personal[i] = v; }));
  add("summary", d.summary, (v) => { d.summary = v; });
  d.sections.forEach((s, si) => s.items.forEach((it, ii) => {
    if (it.head !== undefined) add(`s${si}.${ii}.h`, it.head, (v) => { it.head = v; });
    it.lines.forEach((t, li) => add(`s${si}.${ii}.${li}`, t, (v) => { it.lines[li] = v; }));
  }));
  return out;
}

const SLOT = /\[(?:ADD|أضف):\s*([^\]]*)\]/g;
export type Slot = { id: string; line: string; hint: string };

// every [ADD: …] the engineer can fill, with the line it sits in
export function slotsOf(d: CVDraft): Slot[] {
  return lineRefs(d).flatMap((l) => {
    const out: Slot[] = [];
    let k = 0;
    for (const m of String(l.text || "").matchAll(SLOT)) out.push({ id: `${l.key}#${k++}`, line: l.text, hint: m[1].trim() });
    return out;
  });
}

// the draft with the engineer's answers in place (an empty answer keeps the slot)
export function applyFills(d: CVDraft, fills: Record<string, string>): CVDraft {
  const c: CVDraft = JSON.parse(JSON.stringify(d));
  lineRefs(c).forEach((l) => {
    let k = 0;
    const next = String(l.text || "").replace(SLOT, (m0) => (fills[`${l.key}#${k++}`] || "").trim() || m0);
    if (next !== l.text) l.set(next);
  });
  c.asks = [...new Set(draftText(c).match(/\[(?:ADD|أضف):[^\]]*\]/g) || [])];
  return c;
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
    const x = inner.trim().replace(/\s*—\s*«[^»]*»\s*$/, "");
    if (/(from|من)\s*[–-]\s*(to|إلى)/i.test(x)) return "01/2020 – 12/2021";
    if (/(e-?mail|بريد)/i.test(x)) return "name.surname@gmail.com";
    if (/(phone|الهاتف)/i.test(x)) return "+20 100 000 0000";
    if (/^(N|X|العدد|القيمة|\d)/i.test(x) || x.length <= 2) return "12";
    return x.split(/\s*\/\s*/)[0];
  });
}

// the automated screen's verdict on the original CV and on its rebuilt draft (same language) once the slots are filled
export function rescreen(r: any, ctx: any = {}): { before: Verdict; after: Verdict; draftScore: number; still: { ar: string; en: string }[] } {
  const before = hiringPanel(r).find((x) => x.id === "screen")!.verdict;
  try {
    const d = auditCV(filledText(rebuildCV(r, r.cv.lang === "ar" ? "ar" : "en")), {
      profile: ctx.profile, track: r.target, jd: ctx.jd, layout: { pages: 1, images: 0, columns: false, tables: 0, type: "txt", glyphs: 0 },
    });
    const screen = hiringPanel(d).find((x) => x.id === "screen")!;
    // what still stops the screen once the draft is filled — it needs facts the original CV never gave
    const still = screen.verdict === "pass" ? [] : screen.reasons.filter((x) => !x.good).map((x) => x.text);
    return { before, after: screen.verdict, draftScore: d.overall, still };
  } catch {
    return { before, after: before, draftScore: r.overall, still: [] };
  }
}

// the draft as an A4 document — white-label: the engineer's letterhead, headings and paragraphs / bullets, nothing else
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
  const now = new Date().toISOString();
  const nm = d.name.replace(/\[[^\]]*\]/g, "").trim() || (ar ? "السيرة الذاتية" : "Curriculum Vitae");
  return {
    meta: {
      docType: "CV", docTypeName: ar ? "السيرة الذاتية" : "Curriculum Vitae", docNo: null, rev: "0", status: "draft",
      dateIso: now.slice(0, 10), lang: d.lang, issuer: nm, issuerRole: "contractor",
      appVersion: APP_VERSION, profileLabel: "", engines: [], hash: "",
      plain: { name: d.name, lines: [d.headline, d.contact, d.lead, d.personal.join(" · ")].filter(Boolean) },
    },
    title: { parties: [], title: ar ? "السيرة الذاتية" : "Curriculum Vitae", discipline: "", location: "", reference: "" },
    revisions: [],
    sections: [{ orientation: "portrait", blocks }],
    colophon: { generatedAt: now, appVersion: APP_VERSION, backend: "raster", profiles: [], unverified: 0, overridden: [], hash: "", disclaimer: "" },
  };
}
