// =====================================================================
//  CV review — the hiring panel (v25)
//  Four independent readers over the same audit, each with the one question a real screener asks:
//    · the automated screen (ATS) — can a machine read it, and does it carry the track's words?
//    · the hiring manager — technical depth, project scope, codes, the track.
//    · the recruiter — 30 seconds, the top third only: title, summary, the latest role and one figure.
//    · the teammate — coordination across disciplines, the consultant / client / subcontractor interface, the team.
//  Plus the honesty line (which reader came closest to rejecting a strong CV), the graduation-grade advice, the tough
//  interview questions this CV invites, and the score it reaches once every fix is applied.
//  Pure and on the device: the same CV always gives the same panel. Nothing here invents a fact about the candidate.
// =====================================================================
import { L2 } from "../../i18n/i18n";

type T = { ar: string; en: string };
export type ReviewerId = "screen" | "manager" | "recruiter" | "teammate";
export type Verdict = "pass" | "maybe" | "reject";
export type Reason = { text: T; quote?: string; issue?: string; good?: boolean };
export type Reviewer = { id: ReviewerId; label: T; short: T; asks: T; score: number; verdict: Verdict; reasons: Reason[] };
export type GradeTier = "high" | "mid" | "low" | "none";
export type GradeIntel = { tier: GradeTier; label: string; atTop: boolean; matters: boolean; advice: T; state: "ok" | "advice" | "neutral" };
export type Question = { q: T; why: T; tip: T; from: string };
export type Projection = { now: number; projected: number; pillars: { id: string; now: number; projected: number; max: number }[] };
export type HonestyLine = { strong: boolean; reviewer: ReviewerId; text: T };

export const REVIEWERS: Record<ReviewerId, { label: T; short: T; asks: T }> = {
  screen: {
    label: L2("الفرز الآلي (ATS)", "Automated screen (ATS)"),
    short: L2("الفرز الآلي", "the automated screen"),
    asks: L2("هل يقرأ النظام السيرة سطرًا بسطر، وهل فيها كلمات مسارك؟", "Can a machine read it line by line, and does it carry your track's words?"),
  },
  manager: {
    label: L2("مدير التوظيف", "Hiring manager"),
    short: L2("مدير التوظيف", "the hiring manager"),
    asks: L2("هل العمق الفني وحجم المشاريع والأكواد تكفي لدعوتك للمقابلة؟", "Do the technical depth, project scope and codes earn an interview?"),
  },
  recruiter: {
    label: L2("مسؤول التوظيف — 30 ثانية", "Recruiter — 30 seconds"),
    short: L2("مسؤول التوظيف", "the recruiter"),
    asks: L2("الثلث الأول فقط: المسمّى، الملخص، آخر وظيفة، ورقم واحد.", "The top third only: title, summary, the latest role and one figure."),
  },
  teammate: {
    label: L2("زميل الفريق", "Teammate"),
    short: L2("زميل الفريق", "the teammate"),
    asks: L2("كيف تعمل مع الآخرين: التنسيق بين التخصصات، الاستشاري والمالك ومقاولي الباطن، والفريق.", "How you work with others: across disciplines, with the consultant, client and subcontractors, and in a team."),
  },
};

// which reader raises each audit issue (an issue can belong to more than one)
export const ISSUE_OWNERS: Record<string, ReviewerId[]> = {
  contact: ["screen", "recruiter"],
  dates: ["screen"],
  noexphead: ["screen"],
  thin: ["screen", "recruiter"],
  layout: ["screen"],
  keywords: ["screen"],
  tooltypo: ["screen"],
  length: ["screen", "recruiter"],
  email: ["recruiter"],
  core: ["screen", "manager"],
  drafting: ["manager"],
  nometrics: ["manager", "recruiter"],
  latestscope: ["manager", "recruiter"],
  weak: ["manager", "teammate"],
  overclaim: ["manager", "recruiter"],
  years: ["recruiter"],
  nocodes: ["manager"],
  pmp: ["manager"],
  nosummary: ["recruiter"],
  military: ["recruiter"],
  nid: ["recruiter"],
};

export const ownersOf = (id: string): ReviewerId[] => ISSUE_OWNERS[id] || ["manager"];

const verdictOf = (score: number, critical: number, high: number): Verdict =>
  critical > 0 || score < 50 ? "reject" : score < 75 || high > 1 ? "maybe" : "pass";

const pct = (r: any, ids: string[]) => {
  const ps = r.pillars.filter((p: any) => ids.includes(p.id));
  const max = ps.reduce((a: number, p: any) => a + p.max, 0);
  return max ? Math.round((ps.reduce((a: number, p: any) => a + p.pts, 0) / max) * 100) : 0;
};

const issuesFor = (r: any, who: ReviewerId) => {
  const crit = r.critical.filter((i: any) => ownersOf(i.id).includes(who));
  const high = r.high.filter((i: any) => ownersOf(i.id).includes(who));
  return { crit, high };
};

const issueReasons = (crit: any[], high: any[]): Reason[] =>
  [...crit, ...high].map((i) => ({ text: i.title, issue: i.id, quote: typeof i.ex === "string" ? i.ex : undefined }));

// the lines a recruiter actually reads: the top third of page one — about 14 printed rows, a long line taking as many
// rows as it wraps to (≈ 85 characters a row on A4)
export function topThird(cv: any): string[] {
  const ls = String(cv.text || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  let rows = 0;
  for (const l of ls) {
    if (rows >= 14) break;
    out.push(l);
    rows += Math.max(1, Math.ceil(l.length / 85));
  }
  return out;
}

// a figure an engineer would quote (area, value, count, %) — not a phone number, a date or a year
// (the audit imports this module, so the number pattern is local rather than audit.NUMX)
const NUM = "\\d{1,3}(?:[,٬]\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?";
const FIGURE = new RegExp(`(?:${NUM})\\s*(?:%|m²|م²|m2|m³|م³|mw|kw|kv|ton|طن|units?|وحدة|floors?|طوابق|طابق|برج|towers?|buildings?|عمارة|عمارات|villas?|فيلا|million|مليون|bn|billion|egp|جنيه|km|كم|engineers?|مهندس)`, "i");

function recruiterRead(r: any) {
  const cv = r.cv;
  const top = topThird(cv);
  const topText = top.join("\n");
  const reasons: Reason[] = [];
  let score = 0;
  // 1 · a title that names the role
  if (cv.headline) {
    score += 25;
    reasons.push({ good: true, text: L2("المسمّى واضح تحت الاسم", "A clear title under the name"), quote: cv.headline });
  } else {
    reasons.push({ text: L2("لا مسمّى وظيفي تحت الاسم — لا يعرف في الثانية الأولى من أنت", "No job title under the name — in the first second it says nothing about who you are") });
  }
  // 2 · a summary inside the top third
  const sum = String(cv.summaryText || "");
  const sumTop = sum && top.some((l) => sum.includes(l.slice(0, 40)));
  if (sumTop && cv.summaryWords >= 20 && cv.summaryWords <= 110) {
    score += 25;
    reasons.push({ good: true, text: L2("ملخص مهني في أعلى الصفحة", "A professional summary at the top") });
  } else if (sum) {
    score += 10;
    reasons.push({ text: L2("الملخص موجود لكنه طويل أو بعيد عن أعلى الصفحة", "There is a summary, but it is long or not at the top"), quote: sum.split(/\n/)[0].slice(0, 120) });
  } else {
    reasons.push({ text: L2("لا ملخص — يقفز مباشرة إلى التفاصيل", "No summary — it jumps straight into details") });
  }
  // 3 · the latest role (or, for a fresh graduate, the education / training) visible in the top third
  const latest = (r.fresh ? cv.experience[0] : cv.experience.find((e: any) => !e.intern)) || cv.experience[0];
  const latestLine = latest && latest.headerLines && latest.headerLines[0];
  const eduTop = r.fresh && cv.education[0] && cv.education[0].lines && top.some((l) => cv.education[0].lines.some((x: string) => x && l.includes(x.slice(0, 30))));
  if ((latestLine && top.some((l) => l.includes(latestLine.slice(0, 30)))) || eduTop) {
    score += 20;
    reasons.push({ good: true, text: L2("آخر وظيفة ظاهرة في الثلث الأول", "The latest role shows in the top third"), quote: latestLine || undefined });
  } else {
    reasons.push({ text: L2("آخر وظيفة لا تظهر في الثلث الأول — يتوقف قبل أن يصل إليها", "The latest role isn't in the top third — the reader stops before reaching it"), quote: latestLine || undefined });
  }
  // 4 · one figure
  const fig = top.find((l) => FIGURE.test(l));
  if (fig) {
    score += 15;
    reasons.push({ good: true, text: L2("رقم يلفت النظر في أعلى الصفحة", "A figure that catches the eye at the top"), quote: fig.slice(0, 120) });
  } else {
    reasons.push({ text: L2("لا رقم واحد في أعلى الصفحة (مساحة، قيمة، عدد، نسبة)", "Not one figure at the top (area, value, count, %)") });
  }
  // 5 · reachable
  const ct = cv.contact || {};
  if (ct.email && ct.phone) score += 15;
  const { crit, high } = issuesFor(r, "recruiter");
  return { score, crit, high, reasons: [...issueReasons(crit, high), ...reasons] };
}

// the teammate reads for evidence of working with others — not for «team player» in a skills list
const COORD = /(coordinat|clash|interdisciplin|multi-?disciplin|navisworks|federated|تنسيق|التنسيق|تعارض|بين التخصصات|مع (?:قسم |مهندسي )?(?:الكهرباء|الميكانيكا|الإنشائي|المعماري|التصميم|الموقع)|structural (?:and|&) (?:architectural|mep)|architectural (?:and|&) (?:structural|mep)|mep (?:and|&) (?:structural|architectural))/i;
const IFACE = /(consultant|client|owner(?:'s)? (?:rep|engineer)|subcontractor|sub-contractor|supplier|\brfis?\b|submittals?|\bmir\b|\bwir\b|inspection requests?|الاستشاري|استشاري|المالك|العميل|مقاولي? الباطن|مقاول الباطن|الموردين|طلبات? الاستلام|طلبات? الفحص|اعتمادات?|عينات)/i;
const TEAM = /(team of \d+|led (?:a )?team|leading|supervis|mentor|coach|trained|foremen|foreman|crew|\d+\s*(?:engineers?|technicians?|workers?|labou?rers?)|فريق|أشرفت|أشرف|قيادة|قُدت|قدت|درّبت|دربت|تدريب|العمال|عمال|ملاحظين|فنيين|\d+\s*(?:مهندس|فني|عامل))/i;
const COMMS = /(meetings?|weekly|reports?\b|reporting|presentations?|reported to|اجتماع|اجتماعات|تقارير|تقرير|عرض|أسبوعي)/i;
const TEAM_CLICHE = /(team player|teamwork|team work|روح الفريق|العمل الجماعي|العمل ضمن فريق)/i;

function teammateRead(r: any) {
  const cv = r.cv;
  const exp: string[] = cv.experience.flatMap((e: any) => [...e.headerLines, ...e.bullets.map((b: any) => b.text)]);
  const proj: string[] = [...((cv.sections.projects && cv.sections.projects.lines) || []), ...cv.education.map((e: any) => e.gradProject).filter(Boolean)];
  const pool = [...exp, ...proj];
  const find = (re: RegExp) => pool.find((l) => re.test(l));
  const reasons: Reason[] = [];
  let score = 0;
  const sig: [RegExp, number, T, T][] = [
    [COORD, 30, L2("تنسيق بين التخصصات (معماري / إنشائي / MEP)", "Coordination across disciplines (architectural / structural / MEP)"), L2("لا دليل على تنسيق بين التخصصات — من يحل التعارضات معك؟", "No sign of cross-discipline coordination — who resolves clashes with you?")],
    [IFACE, 25, L2("تعامل مع الاستشاري / المالك / مقاولي الباطن", "Works with the consultant / client / subcontractors"), L2("لا ذكر للاستشاري أو المالك أو مقاولي الباطن — مع من تتعامل يوميًا؟", "No mention of the consultant, client or subcontractors — who do you deal with every day?")],
    [TEAM, 25, L2("فريق أو إشراف أو تدريب بالأرقام", "A team, supervision or training, with numbers"), L2("لا حجم فريق ولا إشراف ولا تدريب لأحد", "No team size, supervision or anyone you trained")],
    [COMMS, 20, L2("اجتماعات وتقارير دورية", "Meetings and regular reports"), L2("لا اجتماعات ولا تقارير — كيف يعرف الفريق ما أنجزته؟", "No meetings or reports — how does the team know what you delivered?")],
  ];
  sig.forEach(([re, pts, ok, miss]) => {
    const line = find(re);
    if (line) {
      score += pts;
      reasons.push({ good: true, text: ok, quote: line.slice(0, 140) });
    } else {
      reasons.push({ text: miss });
    }
  });
  // a fresh graduate's graduation project is team work by nature — it counts once, as an invitation to say the role
  const gp = r.fresh && cv.education.map((e: any) => e.gradProject).find(Boolean);
  if (gp && score < 25) {
    score += 15;
    reasons.push({ text: L2("مشروع التخرج عمل فريق — اذكر دورك فيه وعدد الزملاء", "The graduation project is team work — state your role and the team size"), quote: gp.slice(0, 120) });
  }
  const cliche = String(cv.text || "").split(/\n/).find((l) => TEAM_CLICHE.test(l));
  if (cliche && score < 50) {
    reasons.unshift({ text: L2("«روح الفريق» مكتوبة في المهارات لكن لا بند يثبتها", "«Team player» is written in the skills, but no bullet proves it"), quote: cliche.slice(0, 120) });
  }
  const { crit, high } = issuesFor(r, "teammate");
  return { score, crit, high, reasons: [...issueReasons(crit, high), ...reasons] };
}

export function hiringPanel(r: any): Reviewer[] {
  const out: Reviewer[] = [];
  const mk = (id: ReviewerId, score: number, crit: any[], high: any[], reasons: Reason[]) => {
    const s = Math.max(0, Math.min(100, Math.round(score - crit.length * 10)));
    out.push({ id, ...REVIEWERS[id], score: s, verdict: verdictOf(s, crit.length, high.length), reasons: reasons.slice(0, 6) });
  };
  const sc = issuesFor(r, "screen");
  const atsChecks = r.pillars.find((p: any) => p.id === "ats").checks;
  const screenGood: Reason[] = atsChecks
    .filter((c: any) => c.status === "pass")
    .slice(0, 2)
    .map((c: any) => ({ good: true, text: c.label }));
  mk("screen", pct(r, ["ats"]), sc.crit, sc.high, [...issueReasons(sc.crit, sc.high), ...screenGood]);
  const mg = issuesFor(r, "manager");
  const strongest = r.pillars
    .filter((p: any) => ["software", "scope", "track", "codes"].includes(p.id) && p.pct >= 75)
    .map((p: any) => ({ good: true, text: p.label }));
  mk("manager", pct(r, ["software", "scope", "track", "codes"]), mg.crit, mg.high, [...issueReasons(mg.crit, mg.high), ...strongest]);
  const rc = recruiterRead(r);
  mk("recruiter", rc.score, rc.crit, rc.high, rc.reasons);
  const tm = teammateRead(r);
  mk("teammate", tm.score, tm.crit, tm.high, tm.reasons);
  return out;
}

// for a strong CV: which reader came closest to saying no, and why it still held
export function honestyLine(r: any, panel: Reviewer[]): HonestyLine {
  const low = [...panel].sort((a, b) => a.score - b.score)[0];
  const concern = low.reasons.find((x) => !x.good);
  const why = concern ? concern.text : L2("ملاحظات صغيرة فقط", "only minor notes");
  const best = [...panel].sort((a, b) => b.score - a.score)[0];
  const strong = r.overall >= 75 && !r.critical.length;
  const text = strong
    ? L2(
        `سيرة قوية. أقرب من كاد يرفضها: ${low.short.ar} (${low.score}/100) — ${why.ar}. وصمدت لأن ${best.short.ar} أعطاها ${best.score}/100 والعوائق الحاسمة صفر.`,
        `A strong CV. The reader who came closest to rejecting it: ${low.short.en} (${low.score}/100) — ${why.en}. It held because ${best.short.en} gave it ${best.score}/100 and nothing is a deal-breaker.`,
      )
    : L2(
        `أصعب قارئ لهذه السيرة: ${low.short.ar} (${low.score}/100) — ${why.ar}. ابدأ بملاحظاته.`,
        `The toughest reader for this CV: ${low.short.en} (${low.score}/100) — ${why.en}. Start with their notes.`,
      );
  return { strong, reviewer: low.id, text };
}

// ---------------------------------------------------------------- graduation grade
// Egyptian faculties grade by percentage: امتياز ≥ 85 · جيد جدًا 75–85 · جيد 65–75 · مقبول 50–65; credit-hour programmes print a GPA
const G_HONORS = /(مع مرتبة الشرف|بمرتبة الشرف|مرتبة الشرف|with honou?rs|honou?rs|cum laude|first class)/i;
const G_EXC = /(امتياز|excellent|distinction)/i;
const G_VG = /(جيد\s*جد[\u064B-\u0652]*ا?|very\s*good)/i;
const G_GOOD = /(^|[^ء-ي])جيد(?!\s*جد)|\bgood\b/i;
const G_PASS = /(مقبول|\bpass\b|satisfactory)/i;

export function gradeOf(cv: any): { tier: GradeTier; label: string } {
  const lines: string[] = (cv.education || [])
    .flatMap((e: any) => (e.lines && e.lines.length ? e.lines : [e.grade]).filter(Boolean))
    .filter((l: string) => !/(graduation project|مشروع التخرج)/i.test(l));
  const t = lines.join(" \n ");
  if (!t.trim()) return { tier: "none", label: "" };
  const pick = (re: RegExp) => {
    const m = re.exec(t);
    return m ? m[0].trim() : "";
  };
  const honors = G_HONORS.test(t);
  if (G_EXC.test(t)) return { tier: "high", label: pick(G_EXC) + (honors ? ` · ${pick(G_HONORS)}` : "") };
  if (G_VG.test(t)) return { tier: honors ? "high" : "mid", label: pick(G_VG) + (honors ? ` · ${pick(G_HONORS)}` : "") };
  if (G_PASS.test(t)) return { tier: "low", label: pick(G_PASS) };
  if (G_GOOD.test(t)) return { tier: "low", label: pick(G_GOOD).replace(/^[^ء-يA-Za-z]+/, "") };
  const pc = /(\d{2}(?:[.,]\d+)?)\s*%/.exec(t);
  if (pc) {
    const v = parseFloat(pc[1].replace(",", "."));
    return { tier: v >= 85 ? "high" : v >= 75 ? "mid" : "low", label: pc[0] };
  }
  const gpa = /(\d(?:[.,]\d{1,2}))\s*\/\s*4|gpa\s*[:=]?\s*(\d(?:[.,]\d{1,2}))/i.exec(t);
  if (gpa) {
    const v = parseFloat((gpa[1] || gpa[2]).replace(",", "."));
    return { tier: v >= 3.4 ? "high" : v >= 2.8 ? "mid" : "low", label: gpa[0] };
  }
  return { tier: "none", label: "" };
}

export function gradeIntel(r: any): GradeIntel | null {
  const cv = r.cv;
  if (!cv.education || !cv.education.length) return null;
  const g = gradeOf(cv);
  const years = r.years || 0;
  const matters = r.fresh || years < 5;
  const top = topThird(cv).join("\n");
  const atTop = !!g.label && top.includes(g.label.split(" · ")[0]);
  if (!matters) {
    return {
      ...g, atTop, matters, state: "neutral",
      advice: L2("بعد 5 سنوات خبرة لا يحسم التقدير — يكفي في سطر التعليم، والخبرة هي ما يُقرأ.", "After 5 years of experience the grade no longer decides — keep it on the education line; the experience is what gets read."),
    };
  }
  if (g.tier === "high") {
    return atTop
      ? { ...g, atTop, matters, state: "ok", advice: L2(`«${g.label}» ظاهر في أعلى السيرة — نقطة قوة لبرامج الخريجين والشركات الكبرى.`, `«${g.label}» shows at the top — a strength for graduate programmes and top firms.`) }
      : { ...g, atTop, matters, state: "advice", advice: L2(`صدّر «${g.label}»: اكتبه في الملخص أو تحت الاسم («بكالوريوس الهندسة … بتقدير ${g.label}») — أول ما تفلتر عليه برامج الخريجين.`, `Lead with «${g.label}»: put it in the summary or under your name («B.Sc. … ${g.label}») — the first thing graduate programmes filter on.`) };
  }
  if (g.tier === "mid") {
    return {
      ...g, atTop, matters, state: "neutral",
      advice: r.fresh
        ? L2(`«${g.label}» تقدير جيد — اذكره في سطر التعليم كما هو، ودع مشروع التخرج والتدريب يتصدران.`, `«${g.label}» is a solid grade — keep it on the education line and let the graduation project and training lead.`)
        : L2(`«${g.label}» تقدير جيد — مكانه سطر التعليم؛ خبرتك هي ما يتصدر.`, `«${g.label}» is a solid grade — it belongs on the education line; your experience leads.`),
    };
  }
  if (g.tier === "low") {
    return {
      ...g, atTop, matters, state: "advice",
      advice: atTop
        ? L2(`لا تصدّر «${g.label}» في أعلى السيرة؛ انقله إلى سطر التعليم (لا تحذفه — يسأل عنه أغلب أصحاب العمل في مصر). صدّر بدلًا منه مشروع التخرج والتدريب الصيفي وخبرة التنفيذ.`, `Don't lead with «${g.label}»; move it to the education line (don't delete it — most Egyptian employers ask). Lead instead with the graduation project, summer training and site execution.`)
        : L2(`اترك «${g.label}» في سطر التعليم فقط، وصدّر ما يعوّضه: مشروع التخرج (النظام والبرامج ودورك)، التدريب الصيفي، وأي خبرة تنفيذ بالموقع بالأرقام.`, `Keep «${g.label}» on the education line only, and lead with what outweighs it: the graduation project (system, software, your role), summer training and any site execution with figures.`),
    };
  }
  return r.fresh
    ? { ...g, atTop, matters, state: "advice", advice: L2("اذكر التقدير في سطر التعليم — برامج الخريجين تسأل عنه أولًا.", "State your grade on the education line — graduate programmes ask for it first.") }
    : null;
}

// ---------------------------------------------------------------- tough interview questions
const STOCK: Record<string, [T, T][]> = {
  site: [
    [L2("نتيجة مكعبات صبّة جاءت أقل من المطلوب — ما خطواتك من أول يوم؟", "A pour's cube results came in below spec — what are your steps from day one?"), L2("يختبر معرفتك بالاختبارات غير الإتلافية والقلب الخرساني ومسؤولية القرار.", "Tests your grasp of NDT, cores and who owns the decision.")],
    [L2("مقاول باطن متأخر أسبوعين والاستشاري يضغط — ماذا تفعل اليوم؟", "A subcontractor is two weeks late and the consultant is pushing — what do you do today?"), L2("يقيس إدارة مقاولي الباطن والتصعيد الموثّق.", "Measures subcontractor management and documented escalation.")],
  ],
  tech: [
    [L2("لوحة رُدّت من الاستشاري بكود C مرتين — ماذا تغيّر في المرة الثالثة؟", "A shop drawing came back code C twice — what changes on the third submission?"), L2("يختبر فهمك لتعليقات الاستشاري وتتبع الـ submittals.", "Tests how you read consultant comments and track submittals.")],
    [L2("كيف تحسب مستخلص مقاول باطن بند تشوينات لم تُركّب بعد؟", "How do you certify a subcontractor's materials-on-site item that isn't installed yet?"), L2("سؤال حصر ومستخلصات مباشر.", "A direct quantity-survey question.")],
  ],
  design: [
    [L2("المعماري غيّر بحرًا بعد اعتماد التصميم الإنشائي — كيف تتعامل؟", "The architect changed a span after the structural design was approved — how do you handle it?"), L2("يختبر إدارة التغيير والتنسيق والتوثيق.", "Tests change management, coordination and records.")],
    [L2("اشرح افتراضًا تصميميًا اتخذته ثم اكتشفت أنه خطأ.", "Walk me through a design assumption you made that turned out wrong."), L2("يقيس الأمانة الفنية والتحقق.", "Measures technical honesty and checking.")],
  ],
  planning: [
    [L2("المشروع متأخر 3 أشهر — كيف تعيد الجدولة دون أن تخفي التأخير؟", "The project is 3 months late — how do you re-baseline without hiding the delay?"), L2("يختبر المسار الحرج وتحليل التأخير (TIA).", "Tests critical path and delay analysis (TIA).")],
  ],
  supervision: [
    [L2("المقاول طلب استلام بند والمعاينة لم تكتمل — ماذا توقّع؟", "The contractor wants an item signed off and the inspection isn't complete — what do you sign?"), L2("يختبر النزاهة والإجراءات.", "Tests integrity and procedure.")],
  ],
  bim: [
    [L2("تقرير Navisworks فيه 2,000 تعارض — كيف ترتبها وتغلقها؟", "A Navisworks run shows 2,000 clashes — how do you triage and close them?"), L2("يختبر منهجية التنسيق لا البرنامج فقط.", "Tests coordination method, not just the software.")],
  ],
};

export function interviewQuestions(r: any, panel: Reviewer[]): Question[] {
  const cv = r.cv;
  const out: Question[] = [];
  const add = (from: string, q: T, why: T, tip: T) => {
    if (out.length < 8 && !out.some((x) => x.from === from)) out.push({ from, q, why, tip });
  };
  // gaps between roles
  (cv.gaps || []).slice(0, 2).forEach((g: any, i: number) => {
    add(`gap${i}`,
      L2(`ماذا كنت تفعل بين «${g.after}» و«${g.before}» (${g.months} شهرًا)؟`, `What were you doing between «${g.after}» and «${g.before}» (${g.months} months)?`),
      L2("فجوة 6 أشهر أو أكثر بين وظيفتين — أول ما يسأل عنه المقابل.", "A gap of 6+ months between roles — the first thing an interviewer asks."),
      L2("جواب قصير وصادق: تجنيد، دراسة، مشروع حر، ظرف عائلي — مع ما تعلمته فيها.", "A short, honest answer: military service, study, freelance work, family — and what you learned."));
  });
  // title above the years
  if (r.high.some((i: any) => i.id === "overclaim")) {
    add("overclaim",
      L2(`مسمّاك أعلى من سنوات خبرتك (≈ ${r.years} سنة) — ما الذي كنت مسؤولًا عنه فعلًا؟`, `Your title is above your years (≈ ${r.years}) — what were you actually accountable for?`),
      L2("المسمّى لا يطابق سنوات الخبرة.", "The title doesn't match the years of experience."),
      L2("اذكر قرارًا واحدًا اتخذته بنفسك وأثره بالأرقام.", "Name one decision you owned and its effect in numbers."));
  }
  // a tool claimed but never shown at work
  const ADV_CLAIM = /(advanced|expert|professional|proficient|متقدم|محترف|احترافي|إتقان|أتقن)/i;
  const skills: string[] = (cv.sections.skills && cv.sections.skills.lines) || [];
  const claimed = r.software.filter((x: any) => x.level === "listed" || (x.level !== "missing" && x.level !== "advanced" && skills.some((l) => l.includes(x.name) && ADV_CLAIM.test(l))));
  claimed.filter((x: any) => !["Excel", "Microsoft Office"].includes(x.name)).slice(0, 2).forEach((x: any) => {
    add(`tool:${x.name}`,
      L2(`تذكر ${x.name} — افتح لي آخر ملف عملته عليه: ما المشروع، ماذا بنيت، ومن استخدم الناتج؟`, `You list ${x.name} — open the last file you built in it: which project, what did you build, who used the output?`),
      L2(`${x.name} مذكور في المهارات بلا مشروع يثبته.`, `${x.name} appears in the skills with no project behind it.`),
      L2("جهّز ملفًا أو صورة من عملك الفعلي (بإذن جهة العمل) وكلمتين عن حجمه.", "Have one real file or screenshot ready (with your employer's permission) and its size."));
  });
  // no figures
  if ([...r.critical, ...r.high].some((i: any) => i.id === "nometrics" || i.id === "latestscope")) {
    add("scope",
      L2("ما مساحة أو قيمة أكبر مشروع عملت فيه، وما الجزء الذي كان مسؤوليتك أنت؟", "What was the area or value of your largest project, and which part was yours?"),
      L2("السيرة لا تذكر حجم المشاريع.", "The CV gives no project scope."),
      L2("احفظ ثلاثة أرقام: المساحة م²، القيمة بالجنيه، وعدد من كانوا معك.", "Know three numbers by heart: the area in m², the value in EGP and the team size."));
  }
  // short stays
  const short = cv.experience.filter((e: any) => !e.intern && !e.current && e.months > 0 && e.months < 12);
  if (short.length >= 2) {
    add("short",
      L2(`غيّرت ${short.length} وظائف قبل إكمال سنة — لماذا سنبقى نحن معك أطول؟`, `You left ${short.length} roles before a year — why would you stay longer with us?`),
      L2("أكثر من وظيفة قصيرة متتالية.", "More than one short role in a row."),
      L2("سبب واحد مقنع لكل انتقال (مشروع انتهى، ترقية، مسار) — بلا لوم لجهة سابقة.", "One convincing reason per move (project ended, promotion, track) — never blame a past employer."));
  }
  // military service
  if (cv.military === "postponed") {
    add("military",
      L2("موقفك من التجنيد مؤجل — حتى متى؟ وماذا لو استُدعيت أثناء المشروع؟", "Your military service is postponed — until when, and what if you're called up mid-project?"),
      L2("جهة العمل تخطط لمدة بقائك.", "The employer plans around how long you'll stay."),
      L2("اذكر سنة انتهاء التأجيل بدقة، وما يحدث بعدها.", "Give the exact year the postponement ends, and what happens after."));
  }
  // the CV reads as another track
  if (r.detected && r.target && r.detected !== r.target) {
    add("track",
      L2(`سيرتك تُقرأ كـ ${r.profile.detected.ar} وتتقدم لـ ${r.profile.target.ar} — لماذا التحول وما دليلك؟`, `Your CV reads as ${r.profile.detected.en} and you're applying for ${r.profile.target.en} — why the move, and what's your evidence?`),
      L2("المسار المستهدف غير المسار الظاهر في الخبرات.", "The target track differs from the one your experience shows."),
      L2("مشروع أو مهمة واحدة من المسار الجديد، بأرقامها.", "One project or task from the new track, with its figures."));
  }
  // a code listed but never applied
  const listedCode = r.codes.find((c: any) => c.kind === "code" && c.state === "listed");
  if (listedCode) {
    add("code",
      L2(`تذكر ${listedCode.name} — أي بند طبّقته بيدك؟ أعطني مثالًا بالأرقام.`, `You list ${listedCode.name} — which clause did you apply yourself? Give me an example with numbers.`),
      L2(`${listedCode.name} مذكور بلا تطبيق في الخبرات.`, `${listedCode.name} is listed but never applied in the experience.`),
      L2("بند واحد تعرفه جيدًا: ما يشترطه وأين طبقته.", "One clause you know well: what it requires and where you applied it."));
  }
  // the teammate saw no coordination
  const tm = panel.find((p) => p.id === "teammate");
  if (tm && tm.score < 50) {
    add("team",
      L2("احكِ عن تعارض بين التخصصات (معماري / إنشائي / MEP) حللته — من كان طرفًا وكيف أُغلق؟", "Tell me about a clash between disciplines (architectural / structural / MEP) you resolved — who was involved and how was it closed?"),
      L2("لا دليل في السيرة على العمل مع التخصصات الأخرى.", "The CV shows no work across disciplines."),
      L2("قصة قصيرة: المشكلة، من جمعت، القرار، والنتيجة (أيام أو تكلفة وُفّرت).", "A short story: the problem, who you brought together, the decision and the result (days or cost saved)."));
  }
  // fresh graduates: the graduation project
  if (r.fresh && cv.education.some((e: any) => e.gradProject)) {
    add("gradproj",
      L2("ما الذي حسبته أو صممته أنت بيدك في مشروع التخرج؟ وما الذي ستفعله بشكل مختلف الآن؟", "What did you calculate or design yourself in the graduation project, and what would you do differently now?"),
      L2("مشروع التخرج هو خبرتك الأولى — سيُسأل عنه بالتفصيل.", "The graduation project is your first experience — expect detailed questions."),
      L2("حدّد دورك في الفريق، البرنامج، وحسابًا واحدًا تعرفه جيدًا.", "Know your role in the team, the software, and one calculation inside out."));
  }
  // a low grade
  const g = gradeOf(cv);
  if ((r.fresh || r.years < 3) && g.tier === "low") {
    add("grade",
      L2(`تقديرك «${g.label}» — ما الذي يعوّضه في عملك؟`, `Your grade is «${g.label}» — what makes up for it in your work?`),
      L2("يسأل عنه أغلب المقابلين للخريجين الجدد في مصر.", "Most Egyptian interviewers ask fresh graduates about it."),
      L2("لا تبرير؛ انتقل مباشرة إلى مشروع التخرج والتدريب وما تجيده.", "Don't justify — move straight to your graduation project, training and what you master."));
  }
  // fill with the track's standard tough questions, then the ones every Egyptian engineer is asked
  const stock = STOCK[r.target] || STOCK[r.target === "qa" || r.target === "contracts" ? "tech" : "site"];
  const real = L2("أجب بموقف حقيقي حدث لك: الموقف، ما فعلته، والنتيجة.", "Answer with a real situation: what happened, what you did, the result.");
  stock.forEach(([q, why], i) => {
    if (out.length < 4) add(`stock${i}`, q, why, real);
  });
  if (out.length < 4) {
    add("why",
      L2("لماذا تترك عملك الحالي؟", "Why are you leaving your current job?"),
      L2("سؤال ثابت في كل مقابلة — يقيس الاستقرار والدوافع.", "Asked in every interview — it measures stability and motive."),
      L2("سبب مهني للأمام (مشروع أكبر، مسار، مسؤولية) — بلا شكوى من جهة سابقة.", "A forward-looking professional reason (a bigger project, a track, responsibility) — never a complaint."));
  }
  if (out.length < 4) {
    add("salary",
      L2("كم الراتب الصافي الذي تتوقعه؟", "What net salary do you expect?"),
      L2("يُسأل في أول مكالمة غالبًا.", "Often asked on the first call."),
      L2("رقم صافٍ واحد مبني على السوق لمسارك وسنواتك (مستكشف الرواتب في EngSpace)، مع هامش صغير للتفاوض.", "One net figure based on the market for your track and years (EngSpace's salary explorer), with a small margin to negotiate."));
  }
  if (out.length < 4) add("mistake", L2("ما أكبر خطأ فني ارتكبته، وماذا تعلمت منه؟", "What's the biggest technical mistake you've made, and what did you learn?"), L2("يقيس الأمانة والنضج المهني.", "Measures honesty and professional maturity."), real);
  return out;
}

// ---------------------------------------------------------------- score projection
// What each check can reach once every recommendation is applied with facts the candidate already has. Formatting,
// headings, contact, dates, the summary, tying listed tools to projects and filling every [ADD] with real figures all
// count; tools, codes, certificates or years the CV does not have are never assumed.
const LW: Record<string, number> = { advanced: 1, applied: 0.85, listed: 0.5, basic: 0.35, missing: 0 };

export function projectScore(r: any): Projection {
  const pillars = r.pillars.map((p: any) => {
    const reach = p.checks.reduce((a: number, c: any) => a + Math.max(c.pts, reachable(r, p.id, c)), 0);
    const projected = Math.round(Math.min(p.max, Math.max(p.pts, reach)) * 2) / 2;
    return { id: p.id, now: p.pts, projected, max: p.max };
  });
  return {
    now: r.overall,
    projected: Math.max(r.overall, Math.round(pillars.reduce((a: number, p: any) => a + p.projected, 0))),
    pillars,
  };
}

function reachable(r: any, pid: string, c: any): number {
  const full = c.max;
  const keep = c.pts;
  if (pid === "software") {
    if (c.id === "core") {
      const core = r.software.filter((x: any) => x.tier === "core");
      if (!core.length) return full;
      // a listed tool can be proven in a bullet (→ applied); a missing tool stays missing
      return (full * core.reduce((a: number, x: any) => a + (x.level === "missing" ? 0 : Math.max(LW[x.level], 0.85)), 0)) / core.length;
    }
    if (c.id === "proof" || c.id === "present") return r.software.some((x: any) => x.level !== "missing") ? full : keep;
    return keep;
  }
  if (pid === "scope") return full;
  if (pid === "track") return c.id === "titles" || c.id === "summary" ? full : keep;
  if (pid === "codes") {
    if (c.id === "codes" || c.id === "contracts") {
      // a listed code can be written into the bullet where it was applied; a missing one is not assumed
      const kind = c.id === "codes" ? "code" : "contract";
      const exp = r.codes.filter((x: any) => x.expected && (c.id === "codes" ? x.kind === kind : x.kind !== "code"));
      if (!exp.length) return full;
      const best = exp.map((x: any) => (x.state === "missing" ? 0 : 1)).sort((a: number, b: number) => b - a);
      const n = c.id === "codes" ? Math.min(3, exp.length) : exp.length;
      return (full * best.slice(0, n).reduce((a: number, b: number) => a + b, 0)) / n;
    }
    return keep;
  }
  if (pid === "ats") return c.id === "keywords" ? keep : full;
  return keep;
}
