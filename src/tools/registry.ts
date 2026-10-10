// =====================================================================
//  Tool registry — every tool in the Tools tab, as pure data (no imports: taxonomy, the gate and the tab all read it)
//  · One explicit role allow-list per tool. Money tools are never open to site supervisors; HR sees only the CV review.
//  · Icons are lucide names, mapped to components in features/tools/icons.ts (explicit named imports only).
//  · Old ids keep working through `aliases` (rebar → bbs, masonry → tradeKit). Old Arabic names stay in `keywords`.
//  See docs/TOOLS-BLUEPRINT.md §2 and §5e.
// =====================================================================
import type { ToolDef, ToolPack, ToolRole } from "./types";

const FIELD: ToolRole[] = ["engineer", "owner", "supervisor"];
const MONEY: ToolRole[] = ["engineer", "owner"];

export const PACKS: { id: ToolPack; name: string; desc: string }[] = [
  { id: "workforce", name: "أدوات الصنايعية السريعة", desc: "خامات كل صنعة في ثوانٍ" },
  { id: "structural", name: "الخرسانة والإنشاءات", desc: "الحصر وخطط الصب" },
  { id: "rebar", name: "الحديد", desc: "التفريد والقص والأوزان" },
  { id: "survey", name: "المساحة والتربة", desc: "الميزانية والمناسيب" },
  { id: "quantities", name: "الحصر والتشطيبات", desc: "المباني والبياض والتشطيبات" },
  { id: "hse", name: "الموقع والسلامة", desc: "اليومية والتوعية والتصاريح والفحص" },
  { id: "mechanical", name: "الميكانيكا: تكييف وصحي وحريق", desc: "فحوص التركيب والمناسيب والرشاشات" },
  { id: "electrical", name: "الكهرباء", desc: "الكابلات وهبوط الجهد" },
  { id: "office", name: "المكتب الفني", desc: "السجلات والمحاضر" },
  { id: "architecture", name: "العمارة", desc: "المساحات والاشتراطات" },
  { id: "money", name: "الراتب والعروض", desc: "بالصافي دائمًا" },
];

export const TOOL_REGISTRY: ToolDef[] = [
  // ---- wave 1: the daily field tools ----
  {
    id: "tradeKit", pack: "workforce", name: "حاسبة الصنايعي", desc: "مباني، بياض، بلاط، دهان، جبس بورد، سباكة وكهرباء — بالشكارة والقطعة",
    icon: "HardHat", keywords: "صنايعي مباني طوب بياض محارة بلاط سيراميك دهان نقاشة جبس بورد سباكة كهرباء trade mason tiles paint plaster drywall",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["tradeKit"], aliases: ["masonry"],
  },
  {
    id: "concrete", pack: "structural", name: "حصر وصب الخرسانة", desc: "حصر العناصر، خطة الصب، عدد العربيات والخامات",
    icon: "Cylinder", keywords: "خرسانة حصر الخرسانة صب عربيات بلاطة كمرة عمود قاعدة concrete pour take-off",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["concrete"], disciplines: ["civil", "structural"],
  },
  {
    id: "bbs", pack: "rebar", name: "جدول تفريد وقص الحديد", desc: "أشكال BS 8666، أطوال القص، الأوزان وخطة قص الـ 12 م",
    icon: "Spline", keywords: "حديد تفريد تسليح قص أوزان الحديد أسياخ وصلات bbs rebar bar bending cutting",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["bbs"], aliases: ["rebar"], disciplines: ["civil", "structural"],
  },
  {
    id: "levelBook", pack: "survey", name: "دفتر الميزانية", desc: "الارتفاع والانخفاض أو منسوب الجهاز، قفل الخطأ وتوزيعه",
    icon: "Ruler", keywords: "ميزانية مناسيب روبير قامة ميزان levelling level book benchmark",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["levelBook"], disciplines: ["civil", "survey"],
  },
  {
    id: "siteDiary", pack: "hse", name: "يومية الموقع", desc: "العمالة والمعدات والأعمال والطقس — سجل اليوم في دقائق",
    icon: "NotebookPen", keywords: "يومية الموقع تقرير يومي عمالة معدات daily diary site report",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["siteDiary"],
  },
  {
    id: "toolboxTalk", pack: "hse", name: "التوعية الصباحية وتمام المهمات", desc: "موضوع اليوم والمخاطر والحضور ومهمات الوقاية",
    icon: "Megaphone", keywords: "توعية صباحية سلامة مهمات وقاية حضور toolbox talk ppe safety",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["toolboxTalk"],
  },
  {
    id: "workPermit", pack: "hse", name: "تصاريح العمل", desc: "أعمال ساخنة، ارتفاعات، أماكن مغلقة — بحالة واضحة وحاسبات أمان",
    icon: "ShieldCheck", keywords: "تصريح عمل أعمال ساخنة ارتفاعات أماكن مغلقة حفر permit to work hot work height confined",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["workPermit"],
  },
  {
    id: "checklists", pack: "hse", name: "قوائم الفحص والاستلام", desc: "فحص واستلام الأعمال بتقرير PDF",
    icon: "ClipboardCheck", keywords: "فحص استلام جودة qa qc checklist inspection",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["inspection"],
  },
  {
    id: "acInstall", pack: "mechanical", name: "فحص تركيب التكييف", desc: "ميل الصرف، طول المواسير والرفع، شحنة الفريون الإضافية",
    icon: "AirVent", keywords: "تكييف سبليت تركيب صرف فريون مواسير نحاس ac split hvac installation refrigerant",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["acInstall"], disciplines: ["mechanical", "hvac"],
  },
  {
    id: "drainRun", pack: "mechanical", name: "مناسيب غرف التفتيش", desc: "المناسيب والأعماق والميول من المصب لأعلى",
    icon: "Waves", keywords: "صرف صحي غرف تفتيش مناسيب ميول مواسير drain manhole invert sewer",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["drainRun"], disciplines: ["mechanical", "plumbing", "civil"],
  },
  {
    id: "sprinklerCheck", pack: "mechanical", name: "توزيع وفحص الرشاشات", desc: "عدد الرشاشات والمسافات بحدود NFPA 13",
    icon: "Droplets", keywords: "رشاشات حريق مكافحة sprinkler fire nfpa spacing",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["sprinklerCheck"], disciplines: ["mechanical", "fire"],
  },
  {
    id: "cableCheck", pack: "electrical", name: "الكابل وهبوط الجهد", desc: "التيار والمعاملات ومقطع الكابل وهبوط الجهد لكل دائرة",
    icon: "Cable", keywords: "كابل هبوط الجهد مقطع قاطع تيار كهرباء cable voltage drop breaker ampacity",
    roles: FIELD, money: false, surface: "screen", wave: 1, status: "live", docKinds: ["cableCheck"], disciplines: ["electrical"],
  },
  {
    id: "units", pack: "workforce", name: "تحويل الوحدات والمساحات", desc: "هندسية، وفدان وقيراط وسهم، والميول",
    icon: "Repeat", keywords: "تحويل الوحدات فدان قيراط سهم ميول units convert",
    roles: FIELD, money: false, surface: "sheet", wave: 1, status: "live",
  },
  // ---- the salary and offer tools: money, unchanged ----
  { id: "offer", pack: "money", name: "تقييم عرض عمل", desc: "مكانه من السوق بالصافي ورقمك المضاد", icon: "BadgeDollarSign", keywords: "عرض عمل offer", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "net", pack: "money", name: "الصافي والإجمالي", desc: "حوّل بين الصافي والإجمالي", icon: "Calculator", keywords: "صافي إجمالي net gross", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "compare", pack: "money", name: "مقارن العروض", desc: "عرضان بالقيمة الحقيقية للساعة", icon: "Scale", keywords: "مقارنة عروض compare", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "script", pack: "money", name: "سكريبت التفاوض", desc: "كلام جاهز بالأرقام", icon: "MessageSquare", keywords: "تفاوض negotiation", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "raise", pack: "money", name: "توقيت الزيادة", desc: "اطلب الآن أم بعد قليل؟", icon: "Timer", keywords: "زيادة raise", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "path", pack: "money", name: "خريطة المسار", desc: "خطوتك القادمة ورقمها", icon: "Route", keywords: "مسار path career", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "contract", pack: "money", name: "فاحص العقد", desc: "قبل ما تمضي", icon: "FileCheck", keywords: "عقد contract", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "move", pack: "money", name: "تكلفة الانتقال", desc: "القاهرة ↔ العاصمة ↔ العلمين", icon: "Map", keywords: "انتقال move relocation", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
  { id: "inflation", pack: "money", name: "الزيادة والتضخم", desc: "سجّل راتبك وقارنه بالتضخم الرسمي والسوق", icon: "Percent", keywords: "تضخم inflation", roles: MONEY, money: true, surface: "sheet", wave: 1, status: "live" },
];

const BY_ID = new Map<string, ToolDef>();
TOOL_REGISTRY.forEach((t) => {
  BY_ID.set(t.id, t);
  (t.aliases || []).forEach((a) => BY_ID.set(a, t));
});

// a tool by its id or an old alias
export const toolById = (id: string | undefined | null): ToolDef | null => (id ? BY_ID.get(id) || null : null);
