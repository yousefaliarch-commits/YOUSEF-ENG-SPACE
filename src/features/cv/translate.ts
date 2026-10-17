// =====================================================================
//  CV review — the rebuilt CV in the other language (v25), structured, on the device, no AI
//  Everything the audit understands is written natively in the target language: headings, the personal block, job titles,
//  employers (the company dataset's Arabic / English names), places, universities, degrees, grades, dates, languages,
//  certifications, figures and units. A bullet in the other language is rebuilt from its own structure — the task the
//  audit recognised (TASKS, which carry both languages) and the figures it measured — with the result left as a
//  placeholder. What cannot be translated with certainty is never guessed: it becomes an [ADD: …] / [أضف: …] to fill.
// =====================================================================
import { COMPANIES } from "../../data/companies";
import { DESIGN_BY_DISC, TASK_GENERIC, dimPhrase, scopeOf, tasksOf } from "./audit";
import { gradeOf } from "./panel";

export type Lang = "ar" | "en";
export const hasAr = (s: string) => /[ء-ي]/.test(String(s || ""));
// the script a line is mostly written in
export const langOf = (s: string): Lang => {
  const t = String(s || "");
  return (t.match(/[ء-ي]/g) || []).length > (t.match(/[A-Za-z]/g) || []).length * 0.6 ? "ar" : "en";
};
export const ask = (to: Lang, en: string, ar: string) => (to === "ar" ? `[أضف: ${ar}]` : `[ADD: ${en}]`);

// ---------------------------------------------------------------- figures and units
const UNIT_AR_EN: [RegExp, string][] = [
  [/(\d[\d,.]*)\s*(?:مليار)\s*(?:جنيه|ج\.م)/g, "EGP $1 billion"],
  [/(\d[\d,.]*)\s*(?:مليون)\s*(?:جنيه|ج\.م)/g, "EGP $1 million"],
  [/(\d[\d,.]*)\s*(?:ألف)\s*(?:جنيه|ج\.م)/g, "EGP $1,000"],
  [/(\d[\d,.]*)\s*(?:جنيه|ج\.م)/g, "EGP $1"],
  [/(\d[\d,.]*)\s*(?:م²|م2|متر(?:ًا|ا)? مربع(?:ًا|ا)?)/g, "$1 m²"],
  [/(\d[\d,.]*)\s*(?:م³|م3|متر(?:ًا|ا)? مكعب(?:ًا|ا)?)/g, "$1 m³"],
  [/(\d[\d,.]*)\s*(?:طن تبريد)/g, "$1 TR"],
  [/(\d[\d,.]*)\s*(?:طن|أطنان)/g, "$1 tons"],
  [/(\d[\d,.]*)\s*(?:كم|كيلومتر(?:ًا|ات)?)/g, "$1 km"],
  [/(\d[\d,.]*)\s*(?:طابق(?:ًا|ا)?|طوابق|دور(?:ًا|ا)?|أدوار|ادوار)/g, "$1 floors"],
  [/(\d[\d,.]*)\s*(?:عمارة|عمارات|مبنى|مباني|مبانٍ)/g, "$1 buildings"],
  [/(\d[\d,.]*)\s*(?:برج|أبراج)/g, "$1 towers"],
  [/(\d[\d,.]*)\s*(?:فيلا|فيلات|فلل)/g, "$1 villas"],
  [/(\d[\d,.]*)\s*(?:وحدة|وحدات)/g, "$1 units"],
  [/(\d[\d,.]*)\s*(?:مهندس(?:ين|ون)?)/g, "$1 engineers"],
  [/(\d[\d,.]*)\s*(?:عامل|عمال)/g, "$1 workers"],
  [/(\d[\d,.]*)\s*(?:فني|فنيين)/g, "$1 technicians"],
  [/(\d[\d,.]*)\s*(?:مقاولي? (?:ال)?باطن|مقاول (?:ال)?باطن)/g, "$1 subcontractors"],
  [/(\d[\d,.]*)\s*(?:لوحة|لوحات)/g, "$1 drawings"],
  [/(\d[\d,.]*)\s*(?:مستخلص(?:ات)?)/g, "$1 IPCs"],
  [/(\d[\d,.]*)\s*(?:ملاحظة|ملاحظات)/g, "$1 comments"],
  [/(\d[\d,.]*)\s*(?:يوم(?:ًا|ا)?|أيام)/g, "$1 days"],
  [/(\d[\d,.]*)\s*(?:أسبوع(?:ًا|ا)?|أسابيع)/g, "$1 weeks"],
  [/(\d[\d,.]*)\s*(?:شهر(?:ًا|ا)?|أشهر|شهور)/g, "$1 months"],
  [/(\d[\d,.]*)\s*(?:سنة|سنوات|عام(?:ًا|ا)?|أعوام)/g, "$1 years"],
];
const UNIT_EN_AR: [RegExp, string][] = [
  [/EGP\s*(\d[\d,.]*)\s*(?:bn|billion)\b/gi, "$1 مليار جنيه"],
  [/EGP\s*(\d[\d,.]*)\s*(?:m|mn|million)\b/gi, "$1 مليون جنيه"],
  [/(\d[\d,.]*)\s*(?:m|mn|million)\s*(?:EGP|LE)\b/gi, "$1 مليون جنيه"],
  [/(?:EGP|LE)\s*(\d[\d,.]*)/gi, "$1 جنيه"],
  [/(\d[\d,.]*)\s*(?:m²|m2|sqm|sq\.?\s?m)(?:\s*BUA)?/gi, "$1 م²"],
  [/(\d[\d,.]*)\s*(?:m³|m3)\b/gi, "$1 م³"],
  [/(\d[\d,.]*)\s*TR\b/g, "$1 طن تبريد"],
  [/(\d[\d,.]*)\s*tons?\b/gi, "$1 طن"],
  [/(\d[\d,.]*)\s*km\b/gi, "$1 كم"],
  [/(\d[\d,.]*)[- ]?(?:floors?|stor(?:e)?ys?|stories|levels)\b/gi, "$1 طوابق"],
  [/(\d[\d,.]*)\s*buildings?\b/gi, "$1 مبانٍ"],
  [/(\d[\d,.]*)\s*towers?\b/gi, "$1 أبراج"],
  [/(\d[\d,.]*)\s*villas?\b/gi, "$1 فيلات"],
  [/(\d[\d,.]*)\s*units?\b/gi, "$1 وحدات"],
  [/(\d[\d,.]*)\s*engineers?\b/gi, "$1 مهندسين"],
  [/(\d[\d,.]*)\s*(?:workers?|labou?rers?)\b/gi, "$1 عمال"],
  [/(\d[\d,.]*)\s*technicians?\b/gi, "$1 فنيين"],
  [/(\d[\d,.]*)\s*sub-?contractors?\b/gi, "$1 مقاولي باطن"],
  [/(\d[\d,.]*)\s*(?:shop )?drawings?\b/gi, "$1 لوحات"],
  [/(\d[\d,.]*)\s*IPCs?\b/g, "$1 مستخلصات"],
  [/(\d[\d,.]*)\s*days?\b/gi, "$1 أيام"],
  [/(\d[\d,.]*)\s*weeks?\b/gi, "$1 أسابيع"],
  [/(\d[\d,.]*)\s*months?\b/gi, "$1 أشهر"],
  [/(\d[\d,.]*)\s*years?\b/gi, "$1 سنوات"],
];

// every figure + unit in a line, written in the target language (the rest of the line is left as it is)
export function unitsT(v: string, to: Lang): string {
  let s = String(v || "");
  if (to === "en") UNIT_AR_EN.forEach(([re, rep]) => { s = s.replace(re, rep); });
  else UNIT_EN_AR.forEach(([re, rep]) => { s = s.replace(re, rep); });
  return s.replace(/\s{2,}/g, " ");
}

// a measured figure («32,000 م²», «EGP 40 million», «12 buildings») in the target language, or null when unsure
export function figT(v: string, to: Lang): string | null {
  let s = String(v || "").trim();
  if (!s) return null;
  s = unitsT(s, to).trim();
  const wrong = to === "en" ? hasAr(s) : /[A-Za-z]{3,}/.test(s.replace(/\b(?:EGP|BUA|TR|kVA|MVA|kV|MW|kW|G\+\d+|B\d)\b/g, ""));
  return wrong ? null : s;
}

// ---------------------------------------------------------------- job titles
// [Arabic pattern, English pattern, English title, Arabic title] — the most specific first
const TITLES: [RegExp, RegExp, string, string][] = [
  [/مدير (?:ال)?مشروع/, /project manager/i, "Project Manager", "مدير مشروع"],
  [/مدير (?:ال)?موقع/, /site manager/i, "Site Manager", "مدير موقع"],
  [/مدير (?:ال)?مكتب (?:ال)?فني/, /technical office manager/i, "Technical Office Manager", "مدير المكتب الفني"],
  [/رئيس قسم/, /section head|head of section/i, "Section Head", "رئيس قسم"],
  [/رئيس فريق|قائد فريق/, /team (?:leader|lead)/i, "Team Leader", "رئيس فريق"],
  [/منسق (?:ال)?BIM|منسق بيم/i, /bim coordinator/i, "BIM Coordinator", "منسق BIM"],
  [/مدير (?:ال)?BIM/i, /bim manager/i, "BIM Manager", "مدير BIM"],
  [/(?:مصمم|منمذج) (?:ال)?BIM/i, /bim model(?:l)?er/i, "BIM Modeler", "منمذج BIM"],
  [/مهندس مكتب فني أول|مهندس أول مكتب فني/, /senior technical office engineer/i, "Senior Technical Office Engineer", "مهندس مكتب فني أول"],
  [/مهندس مكتب فني/, /technical office engineer/i, "Technical Office Engineer", "مهندس مكتب فني"],
  [/مهندس موقع أول|مهندس تنفيذ أول/, /senior site engineer/i, "Senior Site Engineer", "مهندس موقع أول"],
  [/مهندس (?:موقع|تنفيذ)/, /site engineer|execution engineer/i, "Site Engineer", "مهندس موقع"],
  [/مهندس تصميم إنشائي|مصمم إنشائي/, /structural design engineer|structural engineer/i, "Structural Design Engineer", "مهندس تصميم إنشائي"],
  [/مهندس تصميم/, /design engineer/i, "Design Engineer", "مهندس تصميم"],
  [/مهندس (?:تخطيط|تخطيط ومتابعة)/, /planning engineer|planner/i, "Planning Engineer", "مهندس تخطيط"],
  [/مهندس (?:حصر|كميات)/, /quantity surveyor|qs engineer/i, "Quantity Surveyor", "مهندس حصر"],
  [/مهندس (?:جودة|ضبط الجودة)/, /qa\s*\/?\s*qc engineer|quality engineer/i, "QA/QC Engineer", "مهندس جودة"],
  [/مهندس (?:إشراف|اشراف)/, /supervision engineer|resident engineer/i, "Supervision Engineer", "مهندس إشراف"],
  [/مهندس (?:عقود|تعاقدات)/, /contracts engineer/i, "Contracts Engineer", "مهندس عقود"],
  [/مهندس (?:سلامة|أمن صناعي)/, /hse engineer|safety engineer/i, "HSE Engineer", "مهندس سلامة"],
  [/مهندس كهروميكانيك|مهندس MEP/i, /mep engineer/i, "MEP Engineer", "مهندس كهروميكانيك"],
  [/مهندس (?:كهرباء|كهربا)/, /electrical engineer/i, "Electrical Engineer", "مهندس كهرباء"],
  [/مهندس ميكانيكا|مهندس ميكانيكي/, /mechanical engineer/i, "Mechanical Engineer", "مهندس ميكانيكا"],
  [/مهندس معماري|معماري/, /architect/i, "Architect", "مهندس معماري"],
  [/مهندس مساحة|مساح/, /surveyor/i, "Surveyor", "مهندس مساحة"],
  [/مهندس مدني/, /civil engineer/i, "Civil Engineer", "مهندس مدني"],
  [/متدرب|تدريب/, /intern|trainee/i, "Intern", "متدرب"],
];

export function titleT(t: string, to: Lang): string | null {
  const s = String(t || "").trim();
  if (!s) return null;
  if (langOf(s) === to) return s;
  for (const [are, ere, en, ar] of TITLES) {
    if (to === "en" ? are.test(s) : ere.test(s)) return to === "en" ? en : ar;
  }
  return null;
}

// ---------------------------------------------------------------- employers, places, universities
const core = (n: string) => String(n || "").split(/\s*[(—–]\s*/)[0].trim().toLowerCase();

export function companyT(name: string, to: Lang): string | null {
  const s = String(name || "").trim();
  if (!s) return null;
  if (langOf(s) === to) return s;
  const low = s.toLowerCase();
  const c = COMPANIES.find((x: any) => (to === "en" ? low.includes(core(x.name)) : low.includes(core(x.en))));
  return c ? (to === "en" ? (c as any).en : (c as any).name) : null;
}

const PLACES: [string, string][] = [
  ["القاهرة الجديدة", "New Cairo"], ["العاصمة الإدارية", "New Administrative Capital"], ["السادس من أكتوبر", "6th of October"],
  ["أكتوبر", "6th of October"], ["الشيخ زايد", "Sheikh Zayed"], ["العاشر من رمضان", "10th of Ramadan"], ["العلمين الجديدة", "New Alamein"],
  ["القاهرة", "Cairo"], ["الجيزة", "Giza"], ["الإسكندرية", "Alexandria"], ["أسيوط", "Assiut"], ["المنصورة", "Mansoura"], ["طنطا", "Tanta"],
  ["الزقازيق", "Zagazig"], ["بورسعيد", "Port Said"], ["الإسماعيلية", "Ismailia"], ["السويس", "Suez"], ["المنيا", "Minya"], ["سوهاج", "Sohag"],
  ["أسوان", "Aswan"], ["الأقصر", "Luxor"], ["الغردقة", "Hurghada"], ["شرم الشيخ", "Sharm El Sheikh"], ["دمياط", "Damietta"], ["بنها", "Benha"],
  ["الفيوم", "Fayoum"], ["بني سويف", "Beni Suef"], ["مصر", "Egypt"], ["الرياض", "Riyadh"], ["جدة", "Jeddah"], ["الدمام", "Dammam"],
  ["دبي", "Dubai"], ["أبوظبي", "Abu Dhabi"], ["الدوحة", "Doha"], ["الكويت", "Kuwait"], ["مسقط", "Muscat"], ["السعودية", "Saudi Arabia"],
];

export function placeT(p: string, to: Lang): string | null {
  let s = String(p || "").trim();
  if (!s) return null;
  if (langOf(s) === to) return s;
  PLACES.forEach(([ar, en]) => {
    s = to === "en" ? s.split(ar).join(en) : s.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), ar);
  });
  s = s.replace(/،/g, ",");
  if (to === "ar") s = s.replace(/,/g, "،");
  return (to === "en" ? hasAr(s) : /[A-Za-z]/.test(s)) ? null : s;
}

const UNIS: [RegExp, string, string][] = [
  [/جامعة القاهرة|cairo university/i, "Cairo University", "جامعة القاهرة"],
  [/عين شمس|ain ?shams/i, "Ain Shams University", "جامعة عين شمس"],
  [/الإسكندرية|الاسكندرية|alexandria university/i, "Alexandria University", "جامعة الإسكندرية"],
  [/أسيوط|اسيوط|جامعه أسيوط|assiut|asyut/i, "Assiut University", "جامعة أسيوط"],
  [/حلوان|helwan/i, "Helwan University", "جامعة حلوان"],
  [/المنصورة|mansoura/i, "Mansoura University", "جامعة المنصورة"],
  [/الزقازيق|zagazig/i, "Zagazig University", "جامعة الزقازيق"],
  [/طنطا|tanta/i, "Tanta University", "جامعة طنطا"],
  [/بنها|benha|banha/i, "Benha University", "جامعة بنها"],
  [/المنوفية|menoufia|menofia/i, "Menoufia University", "جامعة المنوفية"],
  [/قناة السويس|suez canal/i, "Suez Canal University", "جامعة قناة السويس"],
  [/الأزهر|azhar/i, "Al-Azhar University", "جامعة الأزهر"],
  [/المنيا|minia|minya/i, "Minia University", "جامعة المنيا"],
  [/سوهاج|sohag/i, "Sohag University", "جامعة سوهاج"],
  [/جنوب الوادي|south valley/i, "South Valley University", "جامعة جنوب الوادي"],
  [/الفيوم|fayoum/i, "Fayoum University", "جامعة الفيوم"],
  [/كفر الشيخ|kafr ?el[- ]?sheikh/i, "Kafrelsheikh University", "جامعة كفر الشيخ"],
  [/بورسعيد|port ?said/i, "Port Said University", "جامعة بورسعيد"],
  [/الجامعة الأمريكية|american university in cairo|\bauc\b/i, "The American University in Cairo", "الجامعة الأمريكية بالقاهرة"],
  [/الجامعة الألمانية|german university|\bguc\b/i, "German University in Cairo", "الجامعة الألمانية بالقاهرة"],
  [/الجامعة البريطانية|british university|\bbue\b/i, "The British University in Egypt", "الجامعة البريطانية في مصر"],
  [/الأكاديمية العربية|arab academy|\baast\b/i, "Arab Academy for Science, Technology & Maritime Transport", "الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري"],
  [/الفنية العسكرية|military technical college|\bmtc\b/i, "Military Technical College", "الكلية الفنية العسكرية"],
  [/جامعة النيل|nile university/i, "Nile University", "جامعة النيل"],
  [/جامعة المستقبل|future university/i, "Future University in Egypt", "جامعة المستقبل"],
  [/أكاديمية طيبة|thebes academy/i, "Thebes Academy", "أكاديمية طيبة"],
  [/الأكاديمية الحديثة|modern academy/i, "Modern Academy for Engineering and Technology", "الأكاديمية الحديثة للهندسة والتكنولوجيا"],
];
export const uniT = (s: string, to: Lang): string | null => {
  const u = UNIS.find(([re]) => re.test(String(s || "")));
  return u ? (to === "en" ? u[1] : u[2]) : null;
};

const DEGREE: Record<string, [string, string]> = {
  civil: ["B.Sc. Civil Engineering", "بكالوريوس الهندسة — قسم الهندسة المدنية"],
  architecture: ["B.Sc. Architectural Engineering", "بكالوريوس الهندسة — قسم الهندسة المعمارية"],
  mechanical: ["B.Sc. Mechanical Engineering", "بكالوريوس الهندسة — قسم الهندسة الميكانيكية"],
  electrical: ["B.Sc. Electrical Engineering", "بكالوريوس الهندسة — قسم الهندسة الكهربية"],
  survey: ["B.Sc. Surveying Engineering", "بكالوريوس الهندسة — قسم هندسة المساحة"],
};

// the grade in the target language, from the CV's own words
export function gradeT(cv: any, to: Lang): string {
  const g = gradeOf(cv);
  if (g.tier === "none" || !g.label) return "";
  const t = g.label;
  const honors = /(شرف|honou?r|cum laude|first class)/i.test(t);
  const base = /(امتياز|excellent|distinction)/i.test(t) ? ["Excellent", "امتياز"]
    : /(جيد\s*جد|very\s*good)/i.test(t) ? ["Very Good", "جيد جدًا"]
      : /(مقبول|pass|satisfactory)/i.test(t) ? ["Pass", "مقبول"]
        : /(جيد|good)/i.test(t) ? ["Good", "جيد"] : null;
  const gpa = /(\d(?:[.,]\d{1,2}))\s*\/\s*4|gpa\s*[:=]?\s*(\d(?:[.,]\d{1,2}))/i.exec(t + " " + (cv.education || []).map((e: any) => (e.lines || []).join(" ")).join(" "));
  const g4 = gpa ? `GPA ${(gpa[1] || gpa[2]).replace(",", ".")}` : "";
  if (!base) return g4 || (/%/.test(t) ? t : "");
  return to === "en"
    ? `${base[0]}${honors ? " with Honors" : ""}${g4 ? ` (${g4})` : ""}`
    : `بتقدير ${base[1]}${honors ? " مع مرتبة الشرف" : ""}${g4 ? ` (${g4})` : ""}`;
}

export function degreeLine(cv: any, e: any, disc: string, to: Lang): string {
  const deg = (DEGREE[disc] || DEGREE.civil)[to === "en" ? 0 : 1];
  const text = [e.university, ...(e.lines || [])].join(" ");
  const uni = uniT(text, to) || (e.university && langOf(e.university) === to ? e.university : ask(to, "university name", "اسم الجامعة"));
  const years = (text.match(/\b(19|20)\d{2}\b/g) || []);
  const yr = years.length > 1 ? `${years[0]} – ${years[years.length - 1]}` : years[0] || (e.year ? String(e.year) : "");
  const gr = gradeT({ education: [e] }, to);
  return [deg, uni].join(" — ") + (yr ? ` · ${yr}` : "") + (gr ? ` · ${gr}` : "");
}

// ---------------------------------------------------------------- dates
const fmtYM = (d: any) => (d && d.y ? (d.m ? `${String(d.m).padStart(2, "0")}/${d.y}` : String(d.y)) : "");
export function datesT(e: any, to: Lang): string {
  const a = fmtYM(e.start);
  const b = e.current || (e.end && e.end.present) ? (to === "en" ? "Present" : "حتى الآن") : fmtYM(e.end);
  if (!a && !b) return e.year ? String(e.year) : "";
  return [a, b].filter(Boolean).join(" – ");
}

// ---------------------------------------------------------------- the personal block
const PERSONAL: [RegExp, string, string, [RegExp, string, string][]][] = [
  [/(date of birth|d\.?o\.?b\.?|birth ?date|تاريخ الميلاد)/i, "Date of birth", "تاريخ الميلاد", []],
  [/(marital status|الحالة الاجتماعية)/i, "Marital status", "الحالة الاجتماعية",
    [[/(single|أعزب|اعزب|عزباء)/i, "Single", "أعزب"], [/(married|متزوج|متزوجة)/i, "Married", "متزوج"], [/(divorced|مطلق)/i, "Divorced", "مطلق"]]],
  [/(nationality|الجنسية)/i, "Nationality", "الجنسية", [[/(egyptian|مصري|مصرية)/i, "Egyptian", "مصري"]]],
  [/(gender|sex|النوع|الجنس)/i, "Gender", "النوع", [[/(female|أنثى)/i, "Female", "أنثى"], [/(male|ذكر)/i, "Male", "ذكر"]]],
];

export function personalT(line: string, to: Lang): string | null {
  const s = String(line || "");
  if (langOf(s) === to) return s;
  for (const [re, en, ar, vals] of PERSONAL) {
    if (!re.test(s)) continue;
    const v = s.split(/[:：]/).slice(1).join(":").trim();
    if (!vals.length) return v && /\d/.test(v) ? `${to === "en" ? en : ar}: ${v}` : null;
    const hit = vals.find(([vr]) => vr.test(v || s));
    return hit ? `${to === "en" ? en : ar}: ${to === "en" ? hit[1] : hit[2]}` : null;
  }
  return null;
}

export function militaryT(state: string | null, line: string, to: Lang): string {
  const yr = (String(line || "").match(/\b(19|20)\d{2}\b/) || [])[0];
  const lab = to === "en" ? "Military status" : "الموقف من التجنيد";
  const v = state === "done" ? (to === "en" ? `Completed${yr ? ` (${yr})` : ""}` : `أدّى الخدمة${yr ? ` (${yr})` : ""}`)
    : state === "exempt" ? (to === "en" ? "Exempt" : "معافى")
      : state === "postponed" ? (to === "en" ? `Postponed until ${yr || "[ADD: year]"}` : `مؤجل حتى ${yr || "[أضف: السنة]"}`)
        : ask(to, "completed (year) / permanently exempt / postponed until year", "أدّى الخدمة (السنة) / معافى نهائيًا / مؤجل حتى السنة");
  return `${lab}: ${v}`;
}

// ---------------------------------------------------------------- languages and certifications
const LANGS: [RegExp, string, string][] = [
  [/(arabic|العربية|عربي)/i, "Arabic", "العربية"], [/(english|الإنجليزية|الانجليزية|انجليزي)/i, "English", "الإنجليزية"],
  [/(french|الفرنسية|فرنسي)/i, "French", "الفرنسية"], [/(german|الألمانية|ألماني)/i, "German", "الألمانية"],
  [/(italian|الإيطالية)/i, "Italian", "الإيطالية"], [/(spanish|الإسبانية)/i, "Spanish", "الإسبانية"],
];
const LEVELS: [RegExp, string, string][] = [
  [/(native|mother tongue|اللغة الأم|اللغة الام)/i, "Native", "اللغة الأم"], [/(fluent|طلاقة|بطلاقة)/i, "Fluent", "بطلاقة"],
  [/(very good|جيد جد)/i, "Very good", "جيد جدًا"], [/(good|جيد)/i, "Good", "جيد"], [/(basic|مبتدئ|أساسي)/i, "Basic", "مبتدئ"],
];
export function languagesT(cv: any, to: Lang): string {
  return (cv.languages || []).map((l: any) => {
    const n = LANGS.find(([re]) => re.test(l.name));
    const lv = LEVELS.find(([re]) => re.test(l.level || ""));
    const cefr = (String(l.level || "").match(/\b[ABC][12]\b|IELTS\s*\d(?:\.\d)?|TOEFL\s*\d+/i) || [])[0];
    const name = n ? (to === "en" ? n[1] : n[2]) : l.name;
    const level = [lv ? (to === "en" ? lv[1] : lv[2]) : "", cefr].filter(Boolean).join(", ");
    return level ? `${name} (${level})` : name;
  }).join(" · ");
}

export function certT(line: string, r: any, to: Lang): string {
  const s = String(line || "").trim();
  if (langOf(s) === to || !hasAr(s) && to === "ar") return s;
  const yr = (s.match(/\b(19|20)\d{2}\b/) || [])[0];
  if (/نقابة المهندسين|engineers'? syndicate/i.test(s)) {
    return (to === "en" ? "Member, Egyptian Engineers Syndicate" : "عضو نقابة المهندسين المصرية") + (yr ? ` · ${yr}` : "");
  }
  const c = (r.creds || []).find((x: any) => s.includes(x.name.split(" ")[0]));
  const latin = (s.match(/[A-Za-z][A-Za-z0-9 .+&/-]{2,}/g) || []).map((x) => x.trim()).sort((a, b) => b.length - a.length)[0];
  const name = c ? c.name : latin;
  if (!name) return ask(to, `this certificate in English — «${s}»`, `هذه الشهادة بالعربية — «${s}»`);
  const prep = /(تحضير|تحضيري|in progress|preparing)/i.test(s);
  return `${name}${prep ? (to === "en" ? " (in preparation)" : " (قيد الإعداد)") : ""}${yr ? ` · ${yr}` : ""}`;
}

// ---------------------------------------------------------------- a bullet rebuilt in the other language
const TEAM_NUM = /(\d{1,4})\s*\+?\s*(مهندس(?:ين|ون)?|engineers?|عامل|عمال|workers?|labou?rers?|فني|فنيين|technicians?|foremen|ملاحظين)/i;

export function bulletT(text: string, disc: string, to: Lang, ctx: { tool?: string | null; codes?: string[] }): string {
  const t = String(text || "");
  const tasks = tasksOf(t);
  const task: any = tasks[0] || TASK_GENERIC;
  // a design task speaks the engineer's own discipline (an electrical engineer never «designed the structural system»)
  const objOf = (k: any) => {
    if (k.id !== "design") return to === "ar" ? k.ar.obj : k.en.obj;
    const DD = (DESIGN_BY_DISC as any)[disc];
    return DD ? (to === "ar" ? DD.ar.obj : DD.en.obj) : to === "ar" ? "التصميم" : "the design";
  };
  const L = to === "ar" ? task.ar : task.en;
  // a second task is joined only when it is not «design» («coordinated between site and design» is coordination)
  const two = tasks.length >= 2 && tasks[1].id !== "design";
  let obj = two ? (to === "ar" ? `${objOf(tasks[0])} و${objOf(tasks[1])}` : `${objOf(tasks[0])} and ${objOf(tasks[1])}`) : objOf(task);
  const s = scopeOf(t);
  const parts: string[] = [];
  // a count stays next to what it counts, as the original said it («180 comments», «12 buildings»)
  const cnt = s.hit.count && figT(s.hit.count, to);
  if (cnt) obj = `${obj} (${cnt})`;
  if (s.hit.type) parts.push(dimPhrase("type", s.hit.type, to === "ar"));
  const paren = ["area", "floors", "capacity"].map((d) => s.hit[d] && figT(s.hit[d], to)).filter(Boolean) as string[];
  if (paren.length) parts.push(`(${paren.join(to === "ar" ? "، " : ", ")})`);
  const val = s.hit.value && figT(s.hit.value, to);
  if (val) parts.push(to === "ar" ? `بقيمة ${val}` : `worth ${val}`);
  const team = TEAM_NUM.exec(t);
  if (team) {
    const who = figT(`${team[1]} ${team[2]}`, to);
    if (who) parts.push(to === "ar" ? `بفريق من ${who}` : `with a team of ${who}`);
  }
  if (ctx.tool && task.tool && !new RegExp(ctx.tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(parts.join(" "))) {
    const inLine = new RegExp(ctx.tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t);
    if (inLine) parts.push(to === "ar" ? `باستخدام ${ctx.tool}` : `using ${ctx.tool}`);
  }
  const verb = L.verb;
  const res = ask(to, "the result, as in your original line", "النتيجة كما في سطرك الأصلي");
  let out = `${verb} ${obj}${parts.length ? " " + parts.join(" ") : ""}${to === "ar" ? "، " : ", "}${res}.`;
  out = out.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  if (to === "en") out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}
