import {
  BadgeCheck, Briefcase, Building2, Coins, Eye, GraduationCap, HardHat, ImagePlus, Lightbulb, LockKeyhole, Mail, 
  MapPin, MessageCircle, Reply, Scale, Send, ShieldCheck, Star, TrendingUp, Wallet
} from "lucide-react";
import { TABS } from "../data/geo";

// ---- Taxonomy: disciplines (civil includes structural) × sub-disciplines (tracks) × exact positions ----
export const DISC = [["civil", "مدني", "يشمل الإنشائي والجيوتقني والطرق والصحي"], ["architecture", "معماري", "تصميم، تشطيبات، تصميم داخلي"], ["mechanical", "ميكانيكا", "MEP · HVAC · حريق · صرف"], ["electrical", "كهرباء", "قوى · تيار خفيف · BMS"], ["survey", "مساحة", "مساحة وجيوماتكس وGIS"]];

export const TRACKS: any = [
  ["site", "موقع / تنفيذ", 1.0, ["civil", "architecture", "mechanical", "electrical", "survey"]],
  ["tech", "مكتب فني", 1.05, ["civil", "architecture", "mechanical", "electrical", "survey"]],
  ["design", "تصميم", 1.12, ["civil", "architecture", "mechanical", "electrical"]],
  ["supervision", "إشراف استشاري", 1.03, ["civil", "architecture", "mechanical", "electrical"]],
  ["planning", "تخطيط ومراقبة", 1.08, ["civil", "architecture", "mechanical", "electrical"]],
  ["contracts", "عقود وحصر (QS)", 1.10, ["civil", "architecture", "mechanical", "electrical"]],
  ["qa", "جودة وسلامة (QA/QC · HSE)", 0.98, ["civil", "architecture", "mechanical", "electrical", "survey"]],
  ["bim", "BIM ونمذجة", 1.06, ["civil", "architecture", "mechanical", "electrical"]],
  ["gis", "GIS وجيوماتكس", 1.04, ["survey"]],
  ["pm", "إدارة مشروعات", 1.35, ["civil", "architecture", "mechanical", "electrical"]],
];

export const TRACK_ADJ = { site: ["tech", "supervision", "qa"], tech: ["site", "contracts", "bim"], design: ["bim", "tech"], supervision: ["site", "design"], planning: ["contracts", "pm"], contracts: ["tech", "planning"], qa: ["site"], bim: ["design", "tech"], gis: ["site"], pm: ["planning", "site"] };

export const TRACK_LABEL = { design: { civil: "تصميم إنشائي", architecture: "تصميم معماري", mechanical: "تصميم MEP", electrical: "تصميم كهرباء" } };

export const trackLabel = (t?: any, d?: any) => (TRACK_LABEL[t] && TRACK_LABEL[t][d]) || (TRACKS.find((x) => x[0] === t) || TRACKS[0])[1];

export const tracksFor = (d?: any) => TRACKS.filter((t) => t[3].includes(d));

// Exact position / level: [id, label, market band, multiplier on the band, typical years min, max]
export const POSITIONS: any = [
  ["fresh", "مهندس حديث التخرج", "0-2", 0.9, 0, 1], ["junior", "مهندس مبتدئ (Junior)", "0-2", 1.0, 1, 3], ["mid", "مهندس (Mid-level)", "3-5", 1.0, 3, 6], ["senior", "مهندس أول (Senior)", "5-8", 1.0, 5, 9],
  ["lead", "قائد فريق (Team Leader)", "8-12", 1.0, 7, 12], ["section", "رئيس قسم (Section Head)", "8-12", 1.12, 9, 15], ["tom", "مدير مكتب فني", "12+", 1.05, 10, 20], ["cm", "مدير تنفيذ (Construction Manager)", "12+", 1.1, 10, 20],
  ["pm", "مدير مشروع (Project Manager)", "12+", 1.2, 10, 25], ["director", "مدير إدارة (Director)", "12+", 1.45, 15, 30],
];

export const position = (id?: any) => POSITIONS.find((p) => p[0] === id) || POSITIONS[2];

export const posLabel = (id?: any) => position(id)[1];

export const posShort = (id?: any) => position(id)[1].replace(/\s*\(.*\)$/, "");

export const posYears = (id?: any) => { const p = position(id); return [p[4], p[5]]; };

export const posForYears = (y?: any) => y < 1 ? "fresh" : y < 3 ? "junior" : y < 6 ? "mid" : y < 9 ? "senior" : y < 12 ? "lead" : "section";

// Legacy level list kept for the brand board and older payloads
export const LEVELS = POSITIONS.map(([id, l, e]: any) => [id, l, e]);

export const GOALS = [["raise", "زيادة في مكاني", TrendingUp], ["switch", "تغيير شركة", Briefcase], ["first", "أول وظيفة", GraduationCap], ["relocate", "مشروع بعيد (العاصمة/العلمين/الساحل)", MapPin], ["learn", "أفهم السوق الأول", Lightbulb]];

export const EXP = [["0-2", "0–2 سنة"], ["3-5", "3–5 سنوات"], ["5-8", "5–8 سنوات"], ["8-12", "8–12 سنة"], ["12+", "+12 سنة"]];

export const expForYears = (y?: any) => y < 3 ? "0-2" : y < 6 ? "3-5" : y < 9 ? "5-8" : y < 13 ? "8-12" : "12+";

export const yearsLabel = ([a, b]: any) => b >= 25 ? `+${a} سنة` : a === b ? `${a} سنوات` : `${a}–${b} سنوات`;

export const LEVEL_EXP = Object.fromEntries(POSITIONS.map(([id, , e]: any) => [id, e]));

export const TRACK_MULT = Object.fromEntries(TRACKS.map(([id, , m]: any) => [id, m]));

// Modeled percentiles [P10, P25, P50, P75, P90] — Greater Cairo, private sector, site/execution baseline, 2026-Q1
export const MARKET = {
  civil:        { "0-2": [7000, 8500, 10500, 13000, 16000], "3-5": [11000, 14000, 18000, 23000, 28000], "5-8": [17000, 21000, 27000, 34000, 42000], "8-12": [25000, 30000, 38000, 48000, 60000], "12+": [35000, 45000, 58000, 75000, 95000] },
  architecture: { "0-2": [6500, 8000, 10000, 12500, 15500], "3-5": [11000, 14000, 18500, 24000, 30000], "5-8": [17000, 21500, 28000, 36000, 45000], "8-12": [25000, 31000, 40000, 52000, 65000], "12+": [36000, 46000, 60000, 78000, 100000] },
  mechanical:   { "0-2": [7000, 8500, 11000, 13500, 16500], "3-5": [12000, 15000, 19500, 25000, 31000], "5-8": [18000, 22500, 28500, 36000, 45000], "8-12": [26000, 32000, 41000, 52000, 65000], "12+": [38000, 48000, 62000, 80000, 100000] },
  electrical:   { "0-2": [7000, 8500, 10800, 13200, 16000], "3-5": [11500, 14500, 19000, 24500, 30000], "5-8": [17500, 22000, 28000, 35500, 44000], "8-12": [25500, 31500, 40000, 51000, 64000], "12+": [37000, 47000, 60000, 78000, 98000] },
  survey:       { "0-2": [6000, 7500, 9500, 11500, 14000], "3-5": [10000, 12500, 16000, 20000, 25000], "5-8": [15000, 19000, 24000, 30000, 37000], "8-12": [22000, 27000, 34000, 42000, 52000], "12+": [30000, 38000, 48000, 60000, 75000] },
};

export const ALLOWANCES = [["بدل موقع / طبيعة عمل", 1500, 4000, "مواقع داخل المدينة"], ["بدل اغتراب", 3000, 8000, "مواقع بعيدة (العلمين، الساحل، توشكى) — غالبًا مع سكن"], ["بدل انتقال", 800, 2500, "أو سيارة/باص شركة"], ["تأمين طبي خاص", 600, 2000, "قيمة تقديرية للفرد"], ["مكافأة سنوية", 0, 2, "من 0 إلى راتبَين حسب الشركة والمشروع"]];

export const ROLE = { civil: "مهندس مدني", architecture: "مهندس معماري", mechanical: "مهندس ميكانيكا", electrical: "مهندس كهرباء", survey: "مهندس مساحة" };

export const TITLES = {
  civil: ["مهندس موقع", "مهندس مكتب فني", "مهندس تصميم إنشائي", "مهندس تخطيط", "مهندس حصر ومستخلصات", "مهندس جودة", "مهندس BIM"],
  architecture: ["مهندس معماري", "مهندس تصميم معماري", "مهندس تشطيبات", "مهندس تصميم داخلي", "مهندس BIM معماري"],
  mechanical: ["مهندس ميكانيكا موقع", "مهندس HVAC", "مهندس مكتب فني ميكانيكا", "مهندس حريق وصرف", "مهندس تصميم MEP"],
  electrical: ["مهندس كهرباء موقع", "مهندس تصميم كهرباء", "مهندس تيار خفيف", "مهندس BMS", "مهندس محطات"],
  survey: ["مهندس مساحة موقع", "مهندس مساحة تصميم", "مهندس GIS", "مهندس مساحة طرق"],
};

export const SKILLS = ["AutoCAD", "Revit", "Revit MEP", "ETABS", "SAP2000", "SAFE", "Tekla", "Navisworks", "Civil 3D", "Primavera P6", "MS Project", "STAAD", "PLAXIS", "Robot Structural", "Dynamo", "Lumion", "SketchUp", "3ds Max", "Enscape", "HAP", "Dialux", "ETAP", "BIM 360", "Excel", "FIDIC", "PMP", "NEBOSH", "ISO 9001", "Total Station", "GNSS", "ArcGIS", "QGIS", "Bluebeam", "Synchro", "Power BI", "ASHRAE", "NFPA", "IEC", "الكود المصري", "ACI"];

export const EMPLOYERS = [["contracting", "مقاولات عامة", 0.98], ["special", "مقاولات متخصصة (MEP/تشطيبات)", 0.96], ["consulting", "استشاري تصميم/إشراف", 1.10], ["developer", "تطوير عقاري", 1.02], ["industrial", "صناعة وطاقة", 1.05], ["oil", "بترول وغاز", 1.25], ["public", "حكومي / هيئات", 0.72], ["intl", "شركة دولية — مشاريع في مصر", 1.30], ["backoffice", "مكتب خلفي لشركة أجنبية — مرتبط بالعملة", 1.9]];

export const CAT_MULT = { contracting: 0.98, developer: 1.02, consulting: 1.10, intl: 1.30, backoffice: 1.9, public: 0.72, industrial: 1.05, oil: 1.25, transport: 1.28 };

// Reference FX (EGP per unit) — approximate, refresh monthly. Back-office pay is indexed to these, which is why it sits ~1.6–2.4× local.
export const FX = { USD: 50.0, SAR: 13.3, AED: 13.6, EUR: 55.0, GBP: 64.0 };

export const FX_NAMES = { USD: "دولار", SAR: "ريال", AED: "درهم", EUR: "يورو", GBP: "جنيه إسترليني" };

export const BACKOFFICE_MULT = 1.9;

export const label = (list?: any, id?: any) => (list.find((x) => x[0] === id) || list[0])[1];

export const WORK_MODES = [["site", "موقع"], ["office", "مكتب"], ["hybrid", "هجين"], ["remote", "عن بُعد"]];

export const JOB_TYPES = [["full", "دوام كامل"], ["contract", "عقد مشروع"], ["parttime", "دوام جزئي"]];


// ---- Roles: the title shown to everyone next to the anonymous hash ----
// ---- Gender: chosen first in onboarding. It sets the title (مهندس / مهندسة), the feminine forms of every level, and the avatar set ----
export const GENDERS = [["male", "مهندس", "الشخصيات الرجالية — خوذة، لحية، شعر قصير"], ["female", "مهندسة", "الشخصيات النسائية — حجاب أو شعر طويل، واضحة التمييز"]];

export const genderOf = (g?: any) => (g === "female" ? "female" : "male");

export const ROLES = [
  { id: "engineer", title: "مهندس", titleF: "مهندسة", icon: BadgeCheck, needs: "syndicate", desc: "عضو نقابة المهندسين — التوثيق اختياري ويراجعه فريق الإدارة يدويًا" },
  { id: "hr", title: "موارد بشرية", titleF: "موارد بشرية", icon: Building2, needs: "none", desc: "تمثّل شركة: نشر الوظائف ببيانات تواصل للتقديم — بلا توثيق، وتظهر بشارة «موارد بشرية»" },
  { id: "owner", title: "صاحب عمل", titleF: "صاحبة عمل", icon: Briefcase, needs: "none", desc: "مالك أو شريك في شركة هندسية أو مقاولات — بلا توثيق، وتظهر بشارة «صاحب عمل»" },
  { id: "supervisor", title: "مشرف موقع", titleF: "مشرفة موقع", icon: HardHat, needs: "none", desc: "مسمّى واحد ثابت · للمشاركة في المجتمع فقط — لا يرى الرواتب ولا أي أرقام مالية" },
];

export const roleOf = (id?: any) => ROLES.find((r) => r.id === id) || ROLES[0];

export const roleTitle = (id?: any, gender?: any) => { const r = roleOf(id); return genderOf(gender) === "female" ? r.titleF : r.title; };

export const ROLE_F = { civil: "مهندسة مدنية", architecture: "مهندسة معمارية", mechanical: "مهندسة ميكانيكا", electrical: "مهندسة كهرباء", survey: "مهندسة مساحة" };

export const discTitle = (disc?: any, gender?: any) => (genderOf(gender) === "female" ? ROLE_F[disc] : ROLE[disc]) || ROLE.civil;

export const POS_F = { fresh: "مهندسة حديثة التخرج", junior: "مهندسة مبتدئة (Junior)", mid: "مهندسة (Mid-level)", senior: "مهندسة أولى (Senior)", lead: "قائدة فريق (Team Leader)", section: "رئيسة قسم (Section Head)", tom: "مديرة مكتب فني", cm: "مديرة تنفيذ (Construction Manager)", pm: "مديرة مشروع (Project Manager)", director: "مديرة إدارة (Director)" };

export const posLabelG = (id?: any, gender?: any) => (genderOf(gender) === "female" ? POS_F[id] || posLabel(id) : posLabel(id));

export const verifiedLabel = (gender?: any) => (genderOf(gender) === "female" ? "مهندسة موثّقة" : "مهندس موثّق");

export const isCompanyRole = (role?: any) => role === "hr" || role === "owner";

export const GOALS_CO = [["hire", "أوظّف مهندسين", Briefcase], ["benchmark", "أقارن رواتبنا بالسوق", Scale], ["learn", "أفهم السوق", Lightbulb]];

export const REP_LEVELS: any = [["مبتدئ", 0], ["مساهم", 50], ["خبير", 200], ["مرجع", 500]];

export const repLevel = (pts?: any) => { let i = 0; REP_LEVELS.forEach(([, min]: any, k) => { if (pts >= min) i = k; }); const next = REP_LEVELS[i + 1]; return { i, name: REP_LEVELS[i][0], next: next ? next[0] : null, progress: next ? (pts - REP_LEVELS[i][1]) / (next[1] - REP_LEVELS[i][1]) : 1 }; };


// =====================================================================
//  Relationship map — who can do what, and who may message whom
//  1 = yes · 0 = no · 2 = conditional (see note). Enforced by can() / dmRule() everywhere in the UI.
//  Applications happen off-platform: every job ad shows the employer's e-mail / phone and the engineer applies from their own mailbox.
// =====================================================================
export const CAPS = [
  ["read", "تصفّح المجتمع والغرف", Eye],
  ["post", "النشر والرد في الغرف", MessageCircle],
  ["market", "الرواتب المجمّعة وبيانات السوق (متوسطات ونطاقات)", TrendingUp],
  ["salaryDetail", "الأرقام الفردية: كشف راتب، ردود بالأرقام، تقارير فردية", Coins],
  ["jobs", "الوظائف والشركات والأدوات", Briefcase],
  ["reveal", "كشف راتب ومشاركة بيانات الرواتب", Wallet],
  ["bands", "فتح التقارير الفردية (أعطِ لتأخذ)", LockKeyhole],
  ["contact", "رؤية بريد وهاتف الشركة في الإعلان والتقديم مباشرة", Mail],
  ["postjob", "نشر وظائف بتصنيف إلزامي وبيانات تواصل للتقديم", Send],
  ["review", "تقييم الشركات بدون اسم", Star],
  ["logo", "إدارة صفحة الشركة وشعارها", ImagePlus],
  ["dm_peer", "مراسلة الزملاء", Reply],
  ["dm_co", "مراسلة شركة", Building2],
  ["dm_eng", "مراسلة مهندس", BadgeCheck],
  ["verify", "شارة «موثّق» — اختيارية، بمراجعة يدوية", ShieldCheck],
];

export const PERMS = {
  engineer:   { read: 1, post: 1, market: 1, salaryDetail: 1, jobs: 1, reveal: 1, bands: 2, contact: 1, postjob: 0, review: 1, logo: 0, dm_peer: 2, dm_co: 2, dm_eng: 2, verify: 2 },
  // site supervisors: the community only — no salaries or any money figure, no jobs, companies, tools or company reviews
  supervisor: { read: 1, post: 1, market: 0, salaryDetail: 0, jobs: 0, reveal: 0, bands: 0, contact: 0, postjob: 0, review: 0, logo: 0, dm_peer: 2, dm_co: 0, dm_eng: 2, verify: 2 },
  // company accounts: market aggregates within limits, never an individual engineer's figure
  hr:         { read: 1, post: 1, market: 2, salaryDetail: 0, jobs: 1, reveal: 0, bands: 2, contact: 1, postjob: 1, review: 0, logo: 2, dm_peer: 2, dm_co: 2, dm_eng: 2, verify: 0 },
  owner:      { read: 1, post: 1, market: 2, salaryDetail: 0, jobs: 1, reveal: 0, bands: 2, contact: 1, postjob: 1, review: 0, logo: 2, dm_peer: 2, dm_co: 2, dm_eng: 2, verify: 0 },
};

export const PERM_NOTES = {
  market: { company: "متوسطات ونطاقات فقط، وفي الخلايا التي فيها 30 تقريرًا على الأقل — لا رقم لفرد أبدًا" },
  bands: { worker: "بعد مشاركة راتبك مرة واحدة", company: "لشركتك فقط — مجمّعة حسب المسمّى، دون أرقام أفراد" },
  logo: { company: "للشركة المرتبطة بحسابك" },
  dm_peer: { worker: "إذا فتح الزميل باب الرسائل", company: "بين حسابات الشركات، بإذن المستقبل" },
  dm_co: { worker: "من صفحة إعلان وظيفة فقط", company: "بين حسابات الشركات، بإذن المستقبل" },
  dm_eng: { worker: "إذا فتح باب الرسائل", company: "من فعّل «متاح للشركات» فقط" },
  verify: { worker: "اختياري — يراجعه فريق الإدارة يدويًا، والمستندات تُحذف نهائيًا فور المراجعة", company: "لا يلزم — حسابات جهات العمل تظهر بشارة دورها" },
};

export const permNote = (role?: any, cap?: any) => { const n = PERM_NOTES[cap]; if (!n) return ""; return (isCompanyRole(role) ? n.company : n.worker) || ""; };

export const can = (p?: any, cap?: any) => { if (typeof RETIRED_ROLES !== "undefined" && RETIRED_ROLES.includes(p.role)) return false; const v = (PERMS[p.role] || PERMS.engineer)[cap]; if (v === 0) return false; if (v === 1) return true;
  if (cap === "bands") return isCompanyRole(p.role) ? !!p.companyId : !!p.contributed; if (cap === "logo") return isCompanyRole(p.role) && !!p.companyId; if (cap === "verify") return !isCompanyRole(p.role); return true; };

// ---- what each role may see of money and where it may go ----
// "full" = engineers · "aggregate" = company accounts (medians and ranges; never an individual's figure) · "none" = site supervisors
export const moneyAccess = (p?: any) => (!p ? "full" : p.role === "supervisor" ? "none" : isCompanyRole(p.role) ? "aggregate" : "full");

export const COMPANY_MIN_SAMPLE = 30;
 // company accounts see a market cell only when at least this many reports stand behind it
// Money written by members (posts, replies, reviews, polls — and for supervisors chats and notifications too) is masked for viewers
// without access. Years (1950–2040), phone numbers, percentages, counts and durations are left alone.
export const MONEY_RE = /(?<![\d٠-٩])(?:\d{1,3}(?:[,٬]\d{3})+|\d{4,7})(?![\d٠-٩])(?:\s*(?:ج\.?\s?م|جنيه|EGP|ريال|دولار|درهم|يورو|\$))?|(?<![\d٠-٩])\d+(?:[.,]\d+)?\s*(?:ألف|الف|آلاف|k|K)(?![A-Za-zء-ي])/g;

export const maskMoney = (text?: any) => String(text == null ? "" : text).replace(MONEY_RE, (m) => { const t = m.trim(); return /^\d{4}$/.test(t) && +t >= 1950 && +t <= 2040 ? m : "•••"; });

// Site supervisors: community, site tools and messages; the screens / sheets / rooms / post types that carry money or employer data
// are closed to them. Their Tools tab holds only the site tools and the QA/QC checklists — never a salary, offer or net-pay tool.
export const SUPERVISOR_TABS = ["community", "tools", "inbox"];
export const SITE_TOOLS = ["concrete", "rebar", "masonry", "units"];

export const SUPERVISOR_DENY = "حساب مشرف الموقع: المجتمع وأدوات الموقع وقوائم الفحص فقط — الرواتب والوظائف والشركات غير متاحة له";

export const SUPERVISOR_NOTIFS = ["reply", "reaction", "ama", "privacy", "message", "mod", "report", "verify"];

export const tabsFor = (p?: any) => (p && p.role === "supervisor" ? TABS.filter((t) => SUPERVISOR_TABS.includes(t.id)) : TABS);

// toolsOnly: null = every tool; a list = only these tool sheets open (anything else in the "tool" sheet is refused)
export const NO_BLOCKS = { stack: [], sheets: [], rooms: [], posts: [], toolsOnly: null as string[] | null };
export const toolOpen = (b?: any, id?: any) => !b || !b.toolsOnly || b.toolsOnly.includes(id);

// HR accounts: the Tools tab holds the CV review only — no site tools, checklists, calculators or tax methodology
export const HR_DENY = "حساب الموارد البشرية: من قسم الأدوات تتاح أداة مراجعة السير الذاتية فقط";
export const blockedFor = (p?: any) => (p && p.role === "supervisor" ? { stack: ["company", "job", "postjob", "cvreview"], sheets: ["contribute", "review", "methodology", "logo"], rooms: ["nego"], posts: ["reveal", "vote"], toolsOnly: SITE_TOOLS }
  : p && p.role === "hr" ? { stack: ["checklists", "inspection"], sheets: ["methodology"], rooms: [], posts: [], toolsOnly: [] as string[] } : NO_BLOCKS);
// what a refused action says, and the title of a closed screen, for the member's role
export const denyFor = (p?: any) => (p && p.role === "hr" ? HR_DENY : SUPERVISOR_DENY);
export const closedTitleFor = (p?: any) => (p && p.role === "hr" ? "غير متاح لحساب الموارد البشرية" : "غير متاح لحساب مشرف الموقع");

// Messaging rule. me/them = { anon, role, dm, companyId, openToRecruiters }. ctx = { job, post }
export function dmRule(me?: any, them?: any, ctx: any = {}) {
  if (!them || (them.as === "public" ? !!me.pid && them.pid === me.pid : !!me.anon && them.anon === me.anon)) return { ok: false, why: "هذا أنت" };
  const meCo = isCompanyRole(me.role), themCo = isCompanyRole(them.role);
  if (me.role === "supervisor" && themCo) return { ok: false, why: "حساب مشرف الموقع للمجتمع فقط — لا مراسلة مع جهات العمل" };
  if (meCo && them.role === "supervisor") return { ok: false, why: "مشرفو المواقع لا يستقبلون رسائل جهات العمل — حسابهم للمجتمع فقط" };
  if (!meCo && !themCo) return them.dm !== false ? { ok: true, why: "زميل فتح باب الرسائل — تواصل مجهول داخل التطبيق" } : { ok: false, why: "هذا العضو لا يستقبل رسائل خاصة" };
  if (!meCo && themCo) return ctx.job ? { ok: true, why: "سؤال عن إعلان وظيفة — الشركة ترى معرّفك المجهول فقط" } : { ok: false, why: "الشركات تُراسَل من صفحة إعلان الوظيفة فقط، حتى لا يصلك تواصل تسويقي" };
  if (meCo && !themCo) return them.openToRecruiters ? { ok: true, why: "فعّل «متاح للشركات»" } : { ok: false, why: "يمكنك مراسلة من فعّل «متاح للشركات» فقط" };
  return them.dm !== false ? { ok: true, why: "بين حسابات الشركات — بإذن المستقبل" } : { ok: false, why: "هذا الحساب لا يستقبل رسائل" };
}

// Roles EngSpace no longer serves: a profile saved under one of them is not opened (sign-in explains why)
export const RETIRED_ROLES = ["surveyor"];

export const canVerifyRole = (role?: any) => role === "engineer" || role === "supervisor";
