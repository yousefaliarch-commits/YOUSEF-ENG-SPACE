// =====================================================================
//  CV review — the regional HR layer (v0.1.14)
//  Egyptian and Arab engineering recruitment reads a CV differently from an international ATS: date of birth, marital status,
//  nationality and a local mobile number are expected, and for a male Egyptian engineer the military-service status is one of the
//  first things HR checks. This module (1) states what the regional personal block holds and what it lacks, and (2) writes the
//  assessment a seasoned Senior Engineering HR Director would give: fit and level, real experience, decisive gaps, and concrete actions.
//  Pure functions over the parsed CV and the audit result — the same input always gives the same words.
// =====================================================================
import { L2 } from "../../i18n/i18n";
import { CV_UNIS } from "./extract";

type T = { ar: string; en: string; arF?: string };
export type RegionalItem = { key: string; label: T; state: "ok" | "missing" | "advice" | "neutral"; note: T; rel?: "yes" | "maybe" };
export type HrAssessment = {
  verdict: { label: T; tone: "good" | "accent" | "warn" | "bad" }; level: T; fit: T;
  experience: T[]; software: T; missing: { title: T; why: T }[]; actions: T[]; standOut: T[];
};

// ---------------------------------------------------------------- who the candidate is (as far as the CV says)
const MALE = /(\b(gender|sex)\s*[:：]\s*male\b|(النوع|الجنس)\s*[:：]\s*ذكر|\bmr\.\s)/i;
const FEMALE = /(\bfemale\b|(النوع|الجنس)\s*[:：]\s*أنثى|\bms\.\s|\bmrs\.\s|عزباء|متزوجة|المهندسة\s)/i;
export function candidateGender(text: string): "male" | "female" | null { const t = String(text || ""); if (FEMALE.test(t)) return "female"; if (MALE.test(t)) return "male"; return null; }
const EG_PHONE = /(\+?20|0020)?[\s-]?1[0125][\s-]?\d{4}[\s-]?\d{4}\b/;
const EG_PLACE = /(egypt|cairo|giza|alexandria|new capital|6th of october|مصر|القاهرة|الجيزة|الإسكندرية|العاصمة الإدارية|أكتوبر|المنصورة|طنطا|أسيوط)/i;
export const egyptian = (cv: any) => !!cv && (CV_UNIS.test(cv.text || "") || EG_PHONE.test((cv.contact && cv.contact.phone) || "") || EG_PLACE.test(cv.text || "") || !!cv.syndicate);
// the person reviewing: an engineer reviewing their own CV, or HR / an employer reviewing a candidate's
export const reviewingOwn = (profile: any) => !profile || !["hr", "owner"].includes(profile.role);

// does military-service status matter for this CV? (male Egyptian engineers; unknown gender → asked conditionally)
export function militaryRelevance(cv: any, profile: any): "yes" | "maybe" | "no" {
  if (!egyptian(cv)) return "no";
  const g = candidateGender(cv.text) || (reviewingOwn(profile) && profile && profile.gender ? profile.gender : null);
  return g === "female" ? "no" : g === "male" ? "yes" : "maybe";
}

// ---------------------------------------------------------------- the regional personal block
export function regionalProfile(cv: any, profile: any): RegionalItem[] {
  const has = (k: string) => (cv.personal || []).includes(k); const rel = militaryRelevance(cv, profile); const out: RegionalItem[] = [];
  if (rel !== "no") {
    const m = cv.military;
    out.push({ key: "military", rel, label: L2("الموقف من التجنيد", "Military service status"),
      state: m === "done" || m === "exempt" ? "ok" : m === "postponed" || m === "mentioned" ? "advice" : "missing",
      note: m === "done" ? L2("أدّى الخدمة — يطمئن جهة العمل لعدم انقطاعك.", "Completed — reassures the employer you won't be called away.")
        : m === "exempt" ? L2("معافى — اذكر «نهائيًا» إن كان كذلك.", "Exempt — say «permanently» if so.")
        : m === "postponed" ? L2("مؤجل — اكتب «مؤجل حتى [السنة]»؛ جهة العمل تريد أن تعرف متى قد تنقطع.", "Postponed — write «postponed until [year]»; employers want to know when you might be called up.")
        : m === "mentioned" ? L2("مذكور لكن الحالة غير واضحة — اكتب: أدّى الخدمة / معافى / مؤجل حتى [السنة].", "Mentioned but unclear — write: completed / exempt / postponed until [year].")
        : rel === "yes" ? L2("غير مذكور — أول سؤال من الموارد البشرية لمهندس مصري، وكثير من الشركات لا تكمل التواصل بدونه.", "Not stated — HR's first question for an Egyptian male engineer; many firms won't proceed without it.")
          : L2("غير مذكور — إن كان المرشح ذكرًا فهو من أول ما تسأل عنه الموارد البشرية في مصر.", "Not stated — for a male candidate, one of the first things Egyptian HR asks.") });
  }
  out.push({ key: "dob", label: L2("تاريخ الميلاد / السن", "Date of birth / age"), state: has("تاريخ الميلاد أو السن") ? "ok" : "neutral",
    note: has("تاريخ الميلاد أو السن") ? L2("معتاد في السير المصرية والخليجية — ليس عيبًا.", "Standard in Egyptian and Gulf CVs — not a flaw.") : L2("اختياري؛ كثير من الشركات المحلية تتوقعه لتقدير المستوى.", "Optional; many local firms expect it to gauge seniority.") });
  out.push({ key: "marital", label: L2("الحالة الاجتماعية", "Marital status"), state: has("الحالة الاجتماعية") ? "ok" : "neutral",
    note: has("الحالة الاجتماعية") ? L2("معتادة إقليميًا، وتهم في وظائف السفر والإقامة بالمواقع.", "Normal regionally; relevant for travel and on-site residence roles.") : L2("اختيارية — تفيد عند التقديم للخليج أو المواقع البعيدة.", "Optional — useful for Gulf or remote-site applications.") });
  out.push({ key: "phone", label: L2("رقم الهاتف", "Phone number"), state: cv.contact && cv.contact.phone ? "ok" : "missing",
    note: cv.contact && cv.contact.phone ? (EG_PHONE.test(cv.contact.phone) ? L2("رقم مصري صحيح — يُفضّل بصيغة \u2066+20 1xx xxx xxxx\u2069 وعليه واتساب.", "A valid Egyptian number — +20 1xx xxx xxxx with WhatsApp is best.") : L2("موجود — تأكد أنه يعمل وعليه واتساب.", "Present — make sure it works and has WhatsApp.")) : L2("لا رقم مقروء — الموارد البشرية تتصل هاتفيًا قبل أي بريد.", "No readable number — HR calls before e-mailing.") });
  out.push({ key: "city", label: L2("المدينة / مكان الإقامة", "City of residence"), state: cv.contact && cv.contact.location ? "ok" : "advice",
    note: cv.contact && cv.contact.location ? L2("يساعد في المواقع والمسافات — المدينة تكفي، لا العنوان التفصيلي.", "Helps for site distance — the city is enough, not the full address.") : L2("اذكر المدينة (القاهرة / الجيزة…) — تُستخدم لتقدير القرب من الموقع.", "Add your city (Cairo / Giza…) — used to judge distance to site.") });
  if (has("الرقم القومي")) out.push({ key: "nid", label: L2("الرقم القومي", "National ID number"), state: "advice", note: L2("احذفه — لا تطلبه أي شركة في السيرة، ونشره خطر انتحال شخصية.", "Remove it — no employer needs it on a CV, and sharing it risks identity fraud.") });
  if (has("الديانة")) out.push({ key: "religion", label: L2("الديانة", "Religion"), state: "neutral", note: L2("غير مطلوبة — يمكنك حذفها دون أي أثر على فرصك.", "Not required — you can remove it with no effect on your chances.") });
  if (cv.photoHint) out.push({ key: "photo", label: L2("الصورة الشخصية", "Photo"), state: "ok", note: L2("شائعة في مصر والخليج — صورة رسمية بخلفية فاتحة. احذفها فقط للشركات الأوروبية والأمريكية.", "Common in Egypt and the Gulf — formal, light background. Drop it only for European / US firms.") });
  return out;
}

// ---------------------------------------------------------------- the HR director's read
const LEVELS: [number, T, T][] = [
  [2, L2("مهندس مبتدئ (Junior)", "Junior engineer"), L2("وظائف مهندس موقع / مكتب فني مبتدئ أو برامج تدريب الخريجين", "junior site / technical-office roles or graduate programmes")],
  [5, L2("مهندس (Mid-level)", "Mid-level engineer"), L2("وظائف مهندس تنفيذ أو مكتب فني مستقل يدير جزءًا من مشروع", "site or technical-office engineer running a project area on their own")],
  [9, L2("مهندس أول (Senior)", "Senior engineer"), L2("وظائف مهندس أول / مسؤول قطاع في مشروع كبير", "senior engineer / zone lead on a large project")],
  [14, L2("رئيس قسم / قائد فريق", "Section head / team lead"), L2("رئاسة قسم المكتب الفني أو التنفيذ وإدارة فريق مهندسين", "heading a technical-office or construction section and leading engineers")],
  [99, L2("مدير مشروع / مدير فني", "Project / technical manager"), L2("إدارة مشروع كامل أو إدارة فنية لدى مقاول أو مطور", "running a whole project or a technical department for a contractor or developer")],
];
const EMPLOYERS: Record<string, T> = {
  site: L2("شركات المقاولات (الفئة الأولى والثانية)", "contracting companies (grades 1–2)"), tech: L2("المكاتب الفنية للمقاولين والاستشاريين", "technical offices at contractors and consultants"),
  design: L2("المكاتب الاستشارية وبيوت الخبرة", "design consultancies"), supervision: L2("الاستشاريين وجهات الإشراف", "consultants and supervision bodies"),
  planning: L2("إدارات التخطيط لدى المقاولين والمطورين", "planning departments at contractors and developers"), contracts: L2("إدارات العقود والمستخلصات", "contracts and QS departments"),
  qa: L2("إدارات الجودة والسلامة في المقاولين الكبار", "QA/QC and HSE departments at major contractors"), bim: L2("الاستشاريين والمقاولين الدوليين وشركات BIM", "international consultants, contractors and BIM firms"),
  gis: L2("شركات المساحة ونظم المعلومات الجغرافية", "surveying and GIS firms"), pm: L2("المطورين العقاريين وشركات إدارة المشاريع", "developers and project-management firms"),
};
const pick = (r: any, id: string) => [...(r.critical || []), ...(r.high || [])].find((i: any) => i.id === id);

export function hrAssessment(r: any, regional: RegionalItem[], typeEn: Record<string, string> = {}): HrAssessment {
  const cv = r.cv; const years = r.years || 0; const fresh = !!r.fresh;
  const lvl = fresh ? LEVELS[0] : LEVELS.find(([max]) => years <= max) || LEVELS[LEVELS.length - 1];
  const emp = EMPLOYERS[r.target] || EMPLOYERS.site; const tgt = r.profile.target; const disc = r.profile.discLabel;
  const roles = (cv.experience || []).filter((e: any) => !e.intern);
  const sw = r.software || []; const adv = sw.filter((x: any) => x.level === "advanced").map((x: any) => x.name); const applied = sw.filter((x: any) => x.level === "applied").map((x: any) => x.name);
  const listed = sw.filter((x: any) => x.level === "listed").map((x: any) => x.name); const coreMissing = sw.filter((x: any) => x.tier === "core" && x.level === "missing").map((x: any) => x.name);
  const mil = regional.find((x) => x.key === "military");
  // a missing military status for a male Egyptian engineer stops HR as surely as a critical audit issue
  const blockers = (r.critical || []).length + (mil && mil.state === "missing" && mil.rel === "yes" ? 1 : 0);

  // verdict — how HR would file this CV today
  const verdict: HrAssessment["verdict"] = r.overall >= 80 && !blockers ? { label: L2("مرشح قوي — يُدعى للمقابلة", "Strong candidate — invite to interview"), tone: "good" }
    : r.overall >= 65 && blockers <= 1 ? { label: L2("يستحق مقابلة — مع تحفظات محددة", "Worth an interview — with specific reservations"), tone: "accent" }
    : r.overall >= 45 ? { label: L2("يحتاج تعديلات قبل الترشيح", "Needs revisions before shortlisting"), tone: "warn" }
    : { label: L2("غير جاهز للتقديم بصيغته الحالية", "Not ready to submit in its current form"), tone: "bad" };

  const latest = roles[0] || (cv.experience || [])[0];
  const fit = fresh
    ? L2(`خريج ${disc.ar} يستهدف مسار ${tgt.ar}. المستوى الواقعي: ${lvl[1].ar} — المناسب الآن ${lvl[2].ar}، والمقياس الحاسم هو مشروع التخرج والتدريب الصيفي والبرامج التي تجيدها فعلًا.`,
        `${/^[AEIOU]/i.test(disc.en) ? "An" : "A"} ${disc.en} graduate aiming at ${tgt.en}. Realistic level: ${lvl[1].en} — the right targets now are ${lvl[2].en}; what decides is the graduation project, summer training and the software actually mastered.`)
    : L2(`${disc.ar} بخبرة ${years ? `≈ ${years} سنة` : "غير محسوبة (التواريخ لا تُقرأ)"}${latest && latest.title ? `، آخر مسمّى «${latest.title}»` : ""}. يُقرأ في مستوى ${lvl[1].ar}، ومكانه الطبيعي ${lvl[2].ar} لدى ${emp.ar}${r.target !== r.detected ? ` — مع أن معظم خبرته تُقرأ كـ ${r.profile.detected.ar}، وهذا أول ما سيُسأل عنه.` : "."}`,
        `${disc.en} engineer with ${years ? `≈ ${years} years` : "no countable experience (dates unreadable)"}${latest && latest.title ? `, latest title «${latest.title}»` : ""}. Reads at ${lvl[1].en} level; the natural fit is ${lvl[2].en} at ${emp.en}${r.target !== r.detected ? ` — though most experience reads as ${r.profile.detected.en}, which will be the first interview question.` : "."}`);

  // practical experience, as an HR director would weigh it
  const experience: T[] = [];
  if (roles.length) experience.push(L2(`${roles.length === 1 ? "وظيفة واحدة" : roles.length === 2 ? "وظيفتان" : `${roles.length} ${roles.length <= 10 ? "وظائف" : "وظيفة"}`}${latest && latest.company ? `، الأحدث لدى «${latest.company}»` : ""}${cv.gaps && cv.gaps.length ? ` · فجوة ${cv.gaps[0].months} شهرًا تحتاج تفسيرًا جاهزًا` : ""}.`, `${roles.length} ${roles.length === 1 ? "role" : "roles"}${latest && latest.company ? `, latest at «${latest.company}»` : ""}${cv.gaps && cv.gaps.length ? ` · a ${cv.gaps[0].months}-month gap needs a ready explanation` : ""}.`));
  else if (!fresh) experience.push(L2("لا توجد وظائف مؤرخة يمكن قراءتها — المحاور لن يعرف أين عملت ولا لكم من الوقت.", "No readable dated roles — the interviewer can't tell where you worked or for how long."));
  const sh = r.shares || {}; const siteS = Math.round(((sh.site || 0) + (sh.supervision || 0)) * 100); const officeS = Math.round(((sh.tech || 0) + (sh.design || 0) + (sh.planning || 0) + (sh.contracts || 0) + (sh.bim || 0)) * 100);
  if (siteS + officeS > 0) experience.push(L2(`توزيع الخبرة كما تقرؤه السيرة: موقع وتنفيذ ≈ ${siteS}% · مكتب فني وتصميم وتخطيط ≈ ${officeS}%.`, `Experience mix as the CV reads: site & execution ≈ ${siteS}% · technical office, design & planning ≈ ${officeS}%.`));
  const types = [...new Set((cv.projectTypes || []).map((x: any) => (Array.isArray(x) ? x[0] : x)))].slice(0, 4);
  const typesEn = types.map((x: any) => typeEn[x] || x).join(", ");
  const scope = pick(r, "nometrics") || pick(r, "latestscope");
  experience.push(scope ? L2(`حجم المشاريع غير مذكور${types.length ? ` (الأنواع: ${types.join("، ")})` : ""} — المحاور سيسأل فورًا: كم متر؟ كم دور؟ ما قيمة العقد؟ وما دورك أنت بالضبط؟`, `Project scale isn't stated${types.length ? ` (types: ${typesEn})` : ""} — the interviewer will ask at once: how many m²? floors? contract value? and your exact role?`)
    : L2(`المشاريع مذكورة بحجمها${types.length ? ` (${types.join("، ")})` : ""} — نقطة قوة واضحة أمام أي لجنة.`, `Projects are stated with their scale${types.length ? ` (${typesEn})` : ""} — a clear strength before any panel.`));
  const software = L2(`${adv.length ? `إتقان مثبت بالاستخدام: ${adv.join("، ")}` : "لا برنامج مثبت باستخدام فعلي داخل الخبرات"}${applied.length ? ` · استخدام عملي: ${applied.join("، ")}` : ""}${listed.length ? ` · مذكور فقط: ${listed.slice(0, 4).join("، ")}` : ""}${coreMissing.length ? ` · غائب وأساسي لمسار ${tgt.ar}: ${coreMissing.join("، ")}` : ""}.`,
    `${adv.length ? `Proven by use: ${adv.join(", ")}` : "No software proven by real use inside the roles"}${applied.length ? ` · applied: ${applied.join(", ")}` : ""}${listed.length ? ` · listed only: ${listed.slice(0, 4).join(", ")}` : ""}${coreMissing.length ? ` · missing and core for ${tgt.en}: ${coreMissing.join(", ")}` : ""}.`);

  // what actually blocks a hiring decision — in the order HR meets it
  const missing: HrAssessment["missing"] = [];
  const c = (id: string) => pick(r, id);
  if (c("contact")) missing.push({ title: L2("وسيلة تواصل", "A way to reach you"), why: L2("بدون هاتف وبريد واضحين لا تصل السيرة لمرحلة الاتصال أصلًا.", "Without a clear phone and e-mail the CV never reaches the call stage.") });
  if (mil && mil.state === "missing") missing.push({ title: L2("الموقف من التجنيد", "Military service status"), why: mil.note });
  if (c("dates")) missing.push({ title: L2("تواريخ الوظائف", "Role dates"), why: L2("سنوات الخبرة تُحسب من التواريخ — بدونها تُعامل كخبرة صفر في أي فلتر.", "Years are counted from dates — without them you're treated as zero experience in any filter.") });
  if (c("syndicate")) missing.push({ title: L2("قيد نقابة المهندسين", "Engineers Syndicate registration"), why: L2("شرط للتوقيع والعمل الرسمي في مصر، وتسأل عنه أغلب الشركات قبل العرض.", "Required to sign and practise in Egypt; most firms ask before any offer.") });
  if (coreMissing.length) missing.push({ title: L2(`برامج أساسية لمسار ${tgt.ar}`, `Core software for ${tgt.en}`), why: L2(`${coreMissing.join(" و")} — يُطلب بالاسم في إعلانات هذا المسار، وغيابه يُسقط السيرة قبل القراءة.`, `${coreMissing.join(" and ")} — asked for by name in these job ads; its absence drops the CV before reading.`) });
  if (scope) missing.push({ title: L2("حجم المشاريع ودورك فيها", "Project scale and your role in it"), why: L2("هو ما يفرّق بينك وبين عشرات السير بنفس المسمّى.", "It's what separates you from dozens of CVs with the same title.") });
  if (c("overclaim") || c("years")) missing.push({ title: L2("اتساق المسمّى والسنوات", "Consistent title and years"), why: L2("أي تضارب بين المسمّى والسنوات والتواريخ يُفقد الثقة في أول دقيقة من المقابلة.", "Any mismatch between title, years and dates costs trust in the first minute of the interview.") });
  if (c("nocodes")) missing.push({ title: L2("الأكواد التصميمية", "Design codes"), why: L2("مهندس تصميم بلا كود مذكور يُقرأ كرسّام.", "A design engineer naming no code reads as a draughtsman.") });

  // concrete actions, most decisive first (from the audit's own fixes), then the moves that make a candidate stand out
  const actions: T[] = []; const seen = new Set<string>();
  for (const i of [...(r.critical || []), ...(r.high || [])]) { const f = (i.fix || [])[0]; if (f && !seen.has(f.ar)) { seen.add(f.ar); actions.push(f); } if (actions.length >= 6) break; }
  if (mil && mil.state !== "ok" && !pick(r, "military")) actions.unshift(L2("في البيانات الشخصية: «الموقف من التجنيد: أدّى الخدمة ([السنة]) / معافى نهائيًا / مؤجل حتى [السنة]».", "In the personal block: «Military status: completed ([year]) / permanently exempt / postponed until [year]»."));
  const standOut: T[] = [
    L2("سطر مشروع تحت كل وظيفة: اسم المشروع · نوعه · المساحة م² · عدد الأدوار · قيمة العقد · دورك أنت.", "One project line under each role: name · type · m² · floors · contract value · your own role."),
    L2("أقوى إنجاز رقمي لك في أول سطرين من الملخص (مثال: وفّرت 6% من كميات الحديد في برج 18 دورًا).", "Your strongest figure in the first two lines of the summary (e.g. cut rebar quantities 6% on an 18-floor tower)."),
    L2("للتقديم في الخليج: جواز سفر ساري، الاستعداد للسفر، رخصة قيادة إن وُجدت، وقيد النقابة برقمه.", "For Gulf applications: a valid passport, willingness to travel, a driving licence if you have one, and the syndicate number."),
  ];
  if (!fresh && years >= 6) standOut.push(L2("اذكر حجم الفريق الذي أشرفت عليه وأهم قرار فني اتخذته — هذا ما يبحث عنه مدير التوظيف في المستوى الأول.", "State the team size you led and the key technical decision you made — what hiring managers look for at senior level."));
  if (fresh) standOut.push(L2("مشروع التخرج كأنه وظيفة: النظام الإنشائي، البرامج المستخدمة، ودورك في الفريق — مع رابط لملف أعمال صغير.", "Treat the graduation project like a job: structural system, software used and your part in the team — with a link to a small portfolio."));
  return { verdict, level: lvl[1], fit, experience, software, missing, actions: actions.slice(0, 7), standOut };
}
