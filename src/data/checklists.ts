// =====================================================================
//  QA/QC inspection checklists — the templates (Feature 7)
//  Common site practice in Egypt, written as checks an inspector ticks: مطابق · غير مطابق · لا ينطبق. Numeric limits are
//  deliberately not stated here: every check points to the approved drawings, the specification and the code edition the
//  project follows. Each template is [id, title, scope, sections: [section title, items[]][]].
// =====================================================================
export type Template = { id: string; title: string; scope: string; sections: [string, string[]][] };

export const TEMPLATES: Template[] = [
  { id: "rebar", title: "استلام حديد التسليح", scope: "قبل الصب — بلاطات، كمرات، أعمدة، قواعد", sections: [
    ["المطابقة للوحات", ["الأقطار والأعداد مطابقة للوحات التنفيذية المعتمدة (آخر إصدار)", "التباعدات بين الأسياخ مطابقة للوحات", "أطوال الرباط (الوصلات) وأماكنها حسب اللوحات والكود", "الكانات: القطر والتباعد والتكثيف عند الركائز ومناطق الوصلات", "أشاير الأعمدة والحوائط في أماكنها وبالأطوال المطلوبة"]],
    ["التنفيذ", ["الغطاء الخرساني محقق بكراسي/بسكويت بالعدد الكافي", "الحديد نظيف وخالٍ من الصدأ المتقشر والزيوت والطين", "التربيط محكم ولا يتحرك الحديد عند المشي عليه", "حديد التسليح العلوي محمول على كراسي ثابتة", "لا تعارض مع فتحات وتمديدات الكهرباء والصحي (منسّق)"]],
    ["المستندات", ["شهادات المصنع ونتائج اختبار عينات الحديد متوفرة ومقبولة", "طلب الاستلام موقّع من مهندس التنفيذ"]],
  ] },
  { id: "formwork", title: "استلام الشدات الخشبية / المعدنية", scope: "قبل تركيب الحديد وقبل الصب", sections: [
    ["الأبعاد والمناسيب", ["الأبعاد الداخلية مطابقة للوحات", "المناسيب والميول مضبوطة بالميزان", "رأسية الأعمدة والحوائط مضبوطة (ميزان خيط/ليزر)", "الفتحات والصناديق والأجزاء المدفونة في أماكنها"]],
    ["الثبات والإحكام", ["القوائم والدعامات بالتباعد المصمم ومرتكزة على أرض ثابتة", "التكتيف والتربيط كافٍ ضد ضغط الخرسانة", "الفواصل محكمة لمنع تسرب لباني الأسمنت", "الشدة نظيفة ومدهونة بمادة الفك المعتمدة"]],
    ["السلامة", ["سقالات العمل والحواجز آمنة", "ممرات المضخة والعمال محددة"]],
  ] },
  { id: "prepour", title: "ما قبل صب الخرسانة", scope: "إذن الصب", sections: [
    ["الجاهزية", ["تم استلام الحديد والشدات وإغلاق ملاحظاتهم", "التمديدات المدفونة (كهرباء/صحي/تكييف) مستلمة من المختصين", "فواصل الصب في أماكنها المعتمدة", "نظافة الشدة من النشارة والمخلفات ورشّها بالماء"]],
    ["الخرسانة", ["رتبة الخرسانة والكمية مؤكدة مع المورد", "اختبار الهبوط في الموقع عند الوصول", "أخذ مكعبات الاختبار بالعدد المطلوب وترقيمها", "زمن النقل وحرارة الجو ضمن المسموح"]],
    ["المعدات والمعالجة", ["هزازات بالعدد الكافي واحتياطي", "خطة المعالجة (رش/تغطية) جاهزة"]],
  ] },
  { id: "blockwork", title: "أعمال المباني (طوب/بلوك)", scope: "الحوائط الداخلية والخارجية", sections: [
    ["المواد", ["نوع الطوب/البلوك ومقاساته مطابقة للمواصفات والعينة المعتمدة", "المونة بالنسب المعتمدة ومستخدمة خلال زمنها", "الطوب مبلل قبل البناء (للطوب الأحمر)"]],
    ["التنفيذ", ["المحاور وسمك الحوائط حسب اللوحات", "رأسية واستقامة الحوائط ضمن السماح", "تخليل العراميس وسمكها منتظم", "الأعتاب الخرسانية فوق الفتحات بالارتكاز المطلوب", "الربط مع الأعمدة (شبك/أشاير) منفّذ", "فتحات الأبواب والشبابيك بالمقاسات والمناسيب الصحيحة"]],
  ] },
  { id: "plaster", title: "أعمال البياض (المحارة)", scope: "داخلي وخارجي", sections: [
    ["التحضير", ["الحوائط نظيفة ومبللة، وتمديدات الكهرباء والصحي مستلمة", "شبك اللحام على الفواصل بين الخرسانة والمباني", "الطرطشة منفذة وتمت معالجتها"]],
    ["التنفيذ", ["البؤج والأوتار مضبوطة رأسيًا وأفقيًا", "السمك منتظم وضمن المواصفات", "الزوايا والحلوق مستقيمة وحادة", "السطح النهائي مستوٍ (اختبار القدة) وخالٍ من الشروخ"]],
  ] },
  { id: "waterproof", title: "أعمال العزل المائي", scope: "أسطح، حمامات، خزانات، أساسات", sections: [
    ["السطح", ["السطح نظيف وجاف وخالٍ من البروزات والحواف الحادة", "الميول نحو الصفايات محققة", "الوزرات (الدوران) على الحوائط منفذة بالارتفاع المطلوب"]],
    ["التنفيذ", ["المادة ونوعها ودفعتها مطابقة للمعتمد", "عدد الطبقات والتراكبات حسب المواصفات وتعليمات المصنع", "معالجة حول المواسير والصفايات", "اختبار الغمر بالماء للمدة المطلوبة دون تسرب"]],
    ["الحماية", ["طبقة الحماية منفذة فورًا بعد الاستلام"]],
  ] },
  { id: "tiling", title: "أعمال البلاط والسيراميك", scope: "أرضيات وحوائط", sections: [
    ["المواد", ["النوع واللون والمقاس والدرجة مطابقة للعينة المعتمدة", "اللاصق/المونة حسب المواصفات"]],
    ["التنفيذ", ["المناسيب والميول (خاصة الحمامات والبلكونات) صحيحة", "العراميس منتظمة ومستقيمة بالعرض المحدد", "لا يوجد بلاط أجوف (اختبار الطرق)", "القص والتقاطيع نظيفة حول الفتحات والزوايا", "فواصل التمدد منفذة حيث يلزم", "الترويب والتنظيف النهائي"]],
  ] },
  { id: "shopdwg", title: "مراجعة لوحات التنفيذ (Shop Drawings)", scope: "المكتب الفني — معماري / إنشائي / BIM", sections: [
    ["الإطار", ["خانة العنوان: المشروع، رقم اللوحة، الإصدار، التاريخ، المقياس", "الإحالة إلى لوحات التصميم والمواصفات المرجعية", "جدول المراجعات (Revisions) محدّث"]],
    ["المحتوى", ["المحاور والأبعاد الرئيسية مطابقة للتصميم المعتمد", "المناسيب (FFL/SSL) متسقة بين المساقط والقطاعات", "التفاصيل الإنشائية/المعمارية كافية للتنفيذ", "جداول الأبواب والشبابيك والتشطيبات متطابقة مع المساقط", "التنسيق مع MEP: لا تعارضات (Clash) مفتوحة في النموذج"]],
    ["الإخراج", ["الأوزان والأنماط والطبقات (Layers) قياسية ومقروءة", "الأبعاد مقروءة ولا تتداخل مع الرسومات"]],
  ] },
  { id: "mep", title: "استلام التمديدات قبل الإغلاق (MEP)", scope: "قبل الأسقف المعلقة والبياض", sections: [
    ["الكهرباء", ["المواسير والعلب في أماكنها حسب اللوحات", "المواسير مثبتة ومغطاة الأطراف", "لوحات التوزيع والمسارات منسّقة"]],
    ["الصحي والتغذية", ["اختبار الضغط لمواسير التغذية دون هبوط", "ميول الصرف صحيحة وتم اختبار الصرف", "الجلب والعزل عند اختراق الحوائط والبلاطات"]],
    ["التكييف والحريق", ["مسارات الدكت والمواسير مطابقة للتنسيق", "العزل الحراري منفذ", "رؤوس الرشاشات في أماكنها وتم اختبار الشبكة"]],
  ] },
];

export const RESULT = { pass: "مطابق", fail: "غير مطابق", na: "لا ينطبق" } as const;
export const VERDICT = { accepted: "مقبول", conditional: "مقبول بملاحظات", rejected: "مرفوض — يعاد الاستلام" } as const;

// a filled inspection: { id, template, tpl?, project, zone, ref, irNo, contractor, consultant, inspector, date,
//   marks: { "s.i" | "c.<id>": "pass" | "fail" | "na" }, notes: {}, general, custom: [], verdict }
// An inspection started from the member's own checklist carries a snapshot of it (`tpl`): editing or deleting that checklist later
// never changes or breaks an inspection already filled — or its report.
export const newInspection = (t: Template, inspector = "") => ({
  id: "qc-" + Date.now().toString(36), template: t.id, ...(isUserTemplate(t) ? { tpl: cleanTemplate(t) } : {}), project: "", zone: "", ref: "", irNo: "", contractor: "", consultant: "", inspector,
  date: new Date().toISOString().slice(0, 10), marks: {} as Record<string, string>, notes: {} as Record<string, string>, general: "", custom: [] as Custom[], verdict: "", at: Date.now(),
});
// custom items the engineer added to this inspection: [{ id, text }] — their marks and notes live under "c.<id>"
export type Custom = { id: string; text: string };

// site photos per item: { [item key]: Photo[] } — `path` on the live platform (the member's private «inspections» bucket),
// `src` (a compressed data URL) on this device in the demo. Kept small on purpose: they sync inside the inspection.
export type QcPhoto = { id: string; path?: string; src?: string; w: number; h: number };
export const PHOTO_LIMITS = { perItem: 3, perInspection: 12 };
export const photoCount = (x: any): number => Object.values((x && x.photos) || {}).reduce((a: number, l: any) => a + (Array.isArray(l) ? l.length : 0), 0) as number;
export const photoPaths = (x: any): string[] => Object.values((x && x.photos) || {}).flatMap((l: any) => (Array.isArray(l) ? l : []).map((p: QcPhoto) => p.path).filter(Boolean) as string[]);
export const customKey = (c: Custom) => "c." + c.id;
export const newCustom = (text = ""): Custom => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: text.trim().slice(0, 300) });
// a custom row still being typed (no text yet) does not count and is not printed
export const itemsOf = (t: Template, custom: Custom[] = []) => [...t.sections.flatMap(([, items], s) => items.map((_, i) => `${s}.${i}`)), ...custom.filter((c) => c.text.trim()).map(customKey)];
// the verdict the marks suggest: any failure → rejected; every item answered and none failed → accepted
export function tally(t: Template, marks: Record<string, string>, custom: Custom[] = []) {
  const keys = itemsOf(t, custom); const c = { pass: 0, fail: 0, na: 0, open: 0 };
  for (const k of keys) { const m = marks[k]; if (m === "pass" || m === "fail" || m === "na") c[m]++; else c.open++; }
  return { ...c, total: keys.length, suggested: c.fail ? "rejected" : c.open ? "" : "accepted" };
}

// ---- checklists the member builds from scratch (or from a copy of a ready template) ----
// { id: "u-…", title, category, scope, sections: [[title, items[]]], custom: true, at, deleted? } — the member's own words, never translated.
// A deleted checklist stays as a tombstone ({ id, deleted: true, at }) so another phone's older copy cannot bring it back on sync.
export type UserTemplate = Template & { category: string; custom: true; at: number; deleted?: boolean };
export const CATEGORIES = ["إنشائي", "معماري وتشطيبات", "كهرباء", "ميكانيكا وصحي (MEP)", "سلامة الموقع", "مكتب فني", "أخرى"];
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const isUserTemplate = (t: any): t is UserTemplate => !!t && t.custom === true;
const STD_CATEGORY: Record<string, string> = { rebar: "إنشائي", formwork: "إنشائي", prepour: "إنشائي", blockwork: "معماري وتشطيبات", plaster: "معماري وتشطيبات" };
export const categoryOf = (t: any) => (isUserTemplate(t) ? t.category : STD_CATEGORY[t && t.id] || (t && /سلامة/.test(t.title || "") ? "سلامة الموقع" : "معماري وتشطيبات"));
// a blank checklist, or a copy of a ready template to adapt
export const newTemplate = (from?: Template): UserTemplate => ({
  id: "u-" + rid(), title: from ? `${from.title} — نسختي` : "", category: from ? categoryOf(from) : "", scope: from ? from.scope : "",
  sections: from ? from.sections.map(([h, items]) => [h, [...items]] as [string, string[]]) : [["البنود", [""]]], custom: true, at: Date.now(),
});
// what is saved and printed: trimmed, length-capped, empty items and empty sections dropped
export const cleanTemplate = (t: UserTemplate): UserTemplate => ({
  ...t, title: String(t.title || "").trim().slice(0, 120), category: String(t.category || "").trim().slice(0, 60), scope: String(t.scope || "").trim().slice(0, 200),
  sections: (t.sections || []).map(([h, items]) => [String(h || "").trim().slice(0, 120) || "البنود", (items || []).map((x) => String(x || "").trim().slice(0, 300)).filter(Boolean).slice(0, 80)] as [string, string[]]).filter(([, items]) => items.length).slice(0, 20),
});
export const templateError = (t: UserTemplate): string | null => { const c = cleanTemplate(t); return !c.title ? "اكتب عنوان القائمة" : !c.sections.length ? "أضف بندًا واحدًا على الأقل" : null; };
export const itemCount = (t: Template) => t.sections.reduce((a, [, items]) => a + items.length, 0);
// the template an inspection uses: its own snapshot, a ready template, or the member's checklist (in that order)
export const resolveTemplate = (x: any, mine: UserTemplate[] = []): Template => (x && x.tpl) || TEMPLATES.find((t) => t.id === (x && x.template)) || mine.find((t) => t.id === (x && x.template) && !t.deleted) || TEMPLATES[0];
const TKEY = (owner = "") => "engspace.qctemplates.v1" + (owner ? "." + owner : "");
export const loadTemplates = (owner = ""): UserTemplate[] => { try { const v = JSON.parse(localStorage.getItem(TKEY(owner)) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
export const storeTemplates = (list: UserTemplate[], owner = "") => { try { localStorage.setItem(TKEY(owner), JSON.stringify(list)); } catch (e) { /* the in-memory copy still works */ } };
export function mergeTemplates(local: UserTemplate[], remote: UserTemplate[]) {
  const by = new Map<string, UserTemplate>(); for (const x of [...(remote || []), ...(local || [])]) { if (!x || !x.id) continue; const o = by.get(x.id); if (!o || (x.at || 0) > (o.at || 0)) by.set(x.id, x); }
  return [...by.values()].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60);
}

// ---- this device's copy, kept per account (a shared site phone never shows one engineer's inspections to another) ----
const KEY = (owner = "") => "engspace.inspections.v1" + (owner ? "." + owner : "");
export const loadInspections = (owner = "") => { try { const v = JSON.parse(localStorage.getItem(KEY(owner)) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
export const storeInspections = (list: any[], owner = "") => { try { localStorage.setItem(KEY(owner), JSON.stringify(list)); } catch (e) { /* storage full or blocked: the in-memory copy still works */ } };
// device and server copies meet: the newer edit of each inspection wins, nothing is dropped
export function mergeInspections(local: any[], remote: any[]) {
  const by = new Map<string, any>(); for (const x of [...(remote || []), ...(local || [])]) { const o = by.get(x.id); if (!o || (x.at || 0) > (o.at || 0)) by.set(x.id, x); }
  return [...by.values()].sort((a, b) => b.at - a.at).slice(0, 100);
}
