import { TRACK_ADJ, posShort, posYears, trackLabel, tracksFor } from "../../domain/taxonomy";
import { AR_MASDAR_PAST, CV_ACTION_AR, CV_ACTION_EN, CV_LANG_LEVEL, CV_LANG_NAMES, CV_PROJECT_TYPES, CV_TOOLS, EN_GERUND_PAST, parseCV, wordsOf } from "./extract";
import { L2 } from "../../i18n/i18n";

// =====================================================================
//  Engineering CV audit — one pass, one report (v23)
//  Replaces the section rubric, the separate ATS checklist and the AI "deep review": a single deterministic audit that
//  runs on the device and judges a CV the way screeners at contractors, consultants and multinationals do.
//  Five pillars (100): software & BIM depth 22 · project scope & impact 28 · career-track alignment 15 ·
//  codes, standards & credentials 15 · ATS & structure 20. Every check keeps its evidence and its fix; the report is
//  written in both languages side by side (L2) and bullet rewrites are written in the CV's own language.
//  Rewrites never invent a figure: what the CV doesn't state becomes a [bracket] for the engineer to fill.
// =====================================================================
export const PILLARS = [
  ["software", 22, L2("البرامج والـ BIM", "Software & BIM"), L2("الأدوات التي يشترطها مسارك وعمق استخدامها: رسم فقط أم نمذجة وتحليل وتنسيق", "The tools your track requires and how deeply you use them: drafting only, or modelling, analysis and coordination")],
  ["scope", 28, L2("حجم المشاريع والأثر", "Project scope & impact"), L2("المساحة والقيمة ونوع العقد والنظام الإنشائي والفريق — نتائج بالأرقام لا قائمة مهام", "BUA, value, contract type, structural system, team size — measurable results, not a task list")],
  ["track", 15, L2("المسار الوظيفي", "Career-track alignment"), L2("هل تُقرأ السيرة كمهندس موقع أم مكتب فني أم تصميم أم تخطيط — كما تستهدف؟", "Does the CV read as Site, Technical Office, Design or Planning — the track you are targeting?")],
  ["codes", 15, L2("الأكواد والشهادات", "Codes, standards & credentials"), L2("الأكواد التصميمية وعقود FIDIC والشهادات المهنية وقيد النقابة", "Design codes, FIDIC contracts, professional certifications and Syndicate registration")],
  ["ats", 20, L2("ATS والبنية", "ATS & structure"), L2("قراءة آلية سليمة، عناوين قياسية، كثافة الكلمات المفتاحية، وسلامة اللغة", "Clean machine parsing, standard headings, keyword density and clean writing")],
];

export const DISC_EN = { civil: "Civil", architecture: "Architecture", mechanical: "Mechanical (MEP)", electrical: "Electrical", survey: "Surveying" };

export const DISC_AR = { civil: "مدني", architecture: "معماري", mechanical: "ميكانيكا (MEP)", electrical: "كهرباء", survey: "مساحة" };

export const TRACK_EN = { site: "Site / Execution", tech: "Technical Office", design: "Design", supervision: "Consultant Supervision", planning: "Planning & Control", contracts: "Contracts & QS", qa: "Quality & Safety (QA/QC · HSE)", bim: "BIM & Modelling", gis: "GIS & Geomatics", pm: "Project Management" };

export const TRACK_DESIGN_EN = { civil: "Structural Design", architecture: "Architectural Design", mechanical: "MEP Design (Mechanical)", electrical: "Electrical Design" };

export const trackL2 = (t?: any, d?: any) => L2(trackLabel(t, d), t === "design" ? TRACK_DESIGN_EN[d] || "Design" : TRACK_EN[t] || t);

export const discL2 = (d?: any) => L2(DISC_AR[d] || d, DISC_EN[d] || d);

export const TITLE_EN = { civil: "Civil Engineer", architecture: "Architect", mechanical: "Mechanical (MEP) Engineer", electrical: "Electrical Engineer", survey: "Survey Engineer" };

export const POS_EN = { fresh: "Fresh graduate", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Team leader", section: "Section head", tom: "Technical office manager", cm: "Construction manager", pm: "Project manager", director: "Director" };

export const posL2 = (p?: any) => L2(posShort(p), POS_EN[p] || p);

export const TYPE_EN = { "سكني": "residential", "إداري وتجاري": "commercial / office", "أبراج": "high-rise", "فنادق": "hospitality", "مستشفيات": "healthcare", "تعليمي": "educational", "صناعي": "industrial", "بنية تحتية": "infrastructure", "مياه ومحطات": "water / wastewater", "طاقة": "power", "بترول وغاز": "oil & gas", "حكومي وعمراني": "government" };


// ---- codes & standards (finer than the parser's list: a designer is judged on ECP 203 / 201 by number) ----
export const ENG_CODES: any = [
  ["ECP 203", /\bECP\s?-?\s?203\b|كود (?:تصميم )?(?:المنشآت )?الخرسان|الكود المصري (?:لتصميم وتنفيذ )?المنشآت الخرسانية/i, "code"],
  ["ECP 201", /\bECP\s?-?\s?201\b|كود الأحمال|الكود المصري لحساب الأحمال/i, "code"],
  ["ECP 202", /\bECP\s?-?\s?202\b|كود (?:ميكانيكا )?التربة|كود الأساسات/i, "code"],
  ["ECP 205", /\bECP\s?-?\s?205\b|كود المنشآت المعدنية/i, "code"],
  ["Egyptian Code", /egyptian (?:building |construction )?codes?|\bE\.?C\.?P\b|الكود المصري|الكود المصرى|الأكواد المصرية/i, "code"],
  ["ACI 318", /\bACI\s?-?\s?318\b|\bACI\b/i, "code"], ["ASCE 7", /\bASCE\s?-?\s?7\b|\bASCE\b/i, "code"], ["Eurocode", /euro\s?codes?|\bEN\s?199\d\b|\bEC\s?[2-8]\b/i, "code"], ["AISC", /\bAISC\b/i, "code"], ["BS / BS EN", /\bBS\s?(?:EN\s?)?\d{3,5}\b|\bBS\s?8110\b/i, "code"],
  ["ASTM", /\bASTM\b/i, "code"], ["AASHTO", /aashto/i, "code"], ["IBC", /\bIBC\b|international building code/i, "code"], ["SBC (Saudi)", /\bSBC\s?\d{3}\b|saudi building code/i, "code"],
  ["ASHRAE", /ashrae/i, "code"], ["NFPA", /\bNFPA(?:\s?\d{1,3})?\b/i, "code"], ["SMACNA", /smacna/i, "code"], ["Egyptian fire code", /الكود المصري (?:لأسس |لاسس )?(?:التصميم و)?(?:الحماية|حماية) من الحريق|كود الحريق|egyptian fire (?:protection )?code/i, "code"], ["UPC / IPC (plumbing)", /\bUPC\b|international plumbing code|uniform plumbing code/i, "code"], ["CIBSE", /cibse/i, "code"],
  ["IEC", /\bIEC(?:\s?\d{4,5})?\b/i, "code"], ["NEC", /\bNEC\b|nfpa\s?70\b/i, "code"], ["BS 7671", /\bBS\s?7671\b/i, "code"], ["IEEE", /\bIEEE\b/i, "code"], ["Egyptian electrical code", /الكود المصري (?:لأسس )?(?:تصميم )?(?:و?تنفيذ )?(?:التركيبات|للتركيبات) الكهربائية|egyptian electrical code/i, "code"],
  ["FIDIC", /fidic|فيديك/i, "contract"], ["SCL delay protocol", /\bSCL\b|delay (?:and disruption )?protocol/i, "contract"], ["POMI / CESMM / SMM", /\bPOMI\b|\bCESMM\d?\b|\bSMM\d?\b|\bNRM\s?\d?\b/i, "contract"],
  ["ISO 19650", /iso\s?19650/i, "standard"], ["BEP / LOD", /\bBEP\b|bim execution plan|\bLOD\s?\d{3}\b/i, "standard"], ["ISO 9001", /iso\s?9001/i, "standard"], ["ISO 45001 / OHSAS", /iso\s?45001|ohsas/i, "standard"], ["ISO 14001", /iso\s?14001/i, "standard"], ["LEED / EDGE", /\bLEED\b|\bEDGE\b(?! computing)/, "standard"],
];

// ---- professional credentials ----
export const ENG_CREDS: any = [
  ["PMP", /\bPMP\b/], ["PMI-SP", /\bPMI-?SP\b/], ["PMI-RMP", /\bPMI-?RMP\b/], ["CAPM", /\bCAPM\b/], ["PSP (AACE)", /\bPSP\b|\bAACE\b/i], ["CCP", /\bCCP\b/], ["RICS", /\b(?:M|Assoc|F)?RICS\b/],
  ["LEED AP / GA", /leed (?:ap|green associate|ga)\b/i], ["NEBOSH", /nebosh/i], ["OSHA", /\bosha\b/i], ["IOSH", /\biosh\b/i], ["ISO 9001 Lead Auditor", /lead auditor/i], ["ASQ / CQE", /\bCQE\b|\bASQ\b/], ["Six Sigma", /six sigma|\bsigma (?:green|black) belt/i],
  ["Autodesk Certified", /autodesk certified|revit certified|autocad certified|autodesk certified professional/i], ["Primavera certified", /primavera (?:p6 )?(?:professional|certified)|oracle primavera/i], ["BIM certificate", /bim (?:course|diploma|certificate|specialist|manager certificate)|certified bim/i],
  ["FIDIC certificate", /fidic (?:course|training|certified|certificate)/i], ["Structural design diploma", /structural (?:design )?diploma|دبلومة (?:تصميم|إنشائي|الإنشائي)/i], ["MEP diploma", /(?:mep|electrical|mechanical|hvac|power|fire ?fighting|plumbing)(?: design)? diploma|diploma in (?:mep|electrical|mechanical|hvac)|دبلومة (?:mep|ميكانيكا|كهرباء|التكييف)/i], ["ETAP certified", /etap (?:certified|certificate)/i],
  ["Chartered / PE", /\bCEng\b|chartered engineer|\bPE\b license|professional engineer license|\bMICE\b|\bMIStructE\b/],
];

export const SYNDICATE_RE = /(نقابة المهندسين|عضو(?:ية)? (?:ب|في )?النقابة|عضو نقابة|egyptian engineers(?:'|’)? syndicate|engineers syndicate|syndicate (?:member|membership|registration|no|id)|membership[^\n]{0,30}syndicate|saudi council of engineers|\bSCE\b|هيئة المهندسين السعوديين|society of engineers(?:,)? uae)/i;

// ---- engineering terms a screener filters on, by id ----
export const ETERM = (id?: any, ar?: any, en?: any, re?: any) => ({ id, label: L2(ar, en), re });

export const ENG_TERMS = [
  ETERM("shop", "لوحات تنفيذية (Shop drawings)", "Shop drawings", /shop[- ]?drawings?|لوحات تنفيذية|رسومات تنفيذية/i), ETERM("asbuilt", "لوحات As-built", "As-built drawings", /as-?built|كما نُ?فذ/i), ETERM("qto", "حصر الكميات / BOQ", "Quantity take-off / BOQ", /quantity take-?offs?|\bQTO\b|\bBOQs?\b|bills? of quantities|حصر(?: الكميات)?|جداول الكميات|المقايسة/i),
  ETERM("ipc", "المستخلصات (IPCs)", "Interim payment certificates (IPCs)", /interim payments?|\bIPCs?\b|payment certificates?|monthly invoices?|مستخلصات?|المستخلص/i), ETERM("rfi", "RFIs واعتمادات المواد", "RFIs & submittals", /\bRFIs?\b|submittals?|material approvals?|اعتماد(?:ات)? المواد|طلبات الاستيضاح/i),
  ETERM("vo", "أوامر التغيير والمطالبات", "Variation orders & claims", /variation orders?|\bVOs?\b|claims?|variations|أوامر التغيير|أوامر تغيير|مطالبات/i), ETERM("ms", "بيانات طريقة التنفيذ", "Method statements", /method statements?|بيان(?:ات)? (?:طريقة|أسلوب) التنفيذ/i),
  ETERM("itp", "ITP وNCR والاستلامات", "ITP / NCR / inspections", /\bITPs?\b|\bNCRs?\b|inspection (?:and )?test plans?|inspection requests?|\bIRs?\b|استلام(?:ات)? (?:الأعمال|الموقع)|تقارير عدم المطابقة/i), ETERM("hse", "السلامة وتقييم المخاطر (HSE)", "HSE / risk assessment", /\bHSE\b|risk assessments?|toolbox talks?|\bJSA\b|السلامة والصحة المهنية|تقييم المخاطر/i),
  ETERM("daily", "التقارير اليومية وتقارير الإنجاز", "Daily & progress reports", /daily reports?|progress reports?|weekly reports?|تقارير (?:يومية|الإنجاز|أسبوعية)/i), ETERM("lookahead", "جداول Look-ahead", "Look-ahead schedules", /look-?ahead|جدول (?:ثلاثي|أسبوعي)/i),
  ETERM("baseline", "البرنامج الزمني الأساسي والمسار الحرج", "Baseline programme / CPM", /baseline|critical path|\bCPM\b|\bWBS\b|البرنامج الزمني|المسار الحرج/i), ETERM("evm", "مراقبة التكاليف وEVM", "EVM / cost control (SPI, CPI)", /earned value|\bEVM\b|\bSPI\b|\bCPI\b|cost control|مراقبة التكاليف|القيمة المكتسبة/i),
  ETERM("delay", "تحليل التأخير وطلبات مد المدة (EOT)", "Delay analysis / EOT", /delay analysis|time impact|\bTIA\b|\bEOT\b|extension of time|تحليل التأخير|مد المدة/i), ETERM("cashflow", "التدفق النقدي ومنحنى S", "Cash flow / S-curve", /cash ?flow|S-?curve|التدفق النقدي|منحنى/i), ETERM("resource", "تحميل الموارد", "Resource loading", /resource (?:loading|levell?ing|loaded|histogram)|تحميل الموارد/i),
  ETERM("tender", "العطاءات وتقدير التكلفة", "Tendering & cost estimation", /tender(?:ing|s)?|cost estimat(?:e|ion|ing)|pricing|\bbids?\b|عطاءات?|مناقصات?|تسعير|تقدير التكلفة/i), ETERM("finalacc", "الحساب الختامي", "Final account", /final accounts?|الحساب الختامي|المستخلص الختامي/i),
  ETERM("subcon", "إدارة مقاولي الباطن", "Subcontractor management", /subcontractors?|sub-contractors?|مقاولي? (?:ال)?باطن/i), ETERM("contractadmin", "إدارة العقود", "Contract administration", /contract (?:administration|management)|إدارة العقود/i),
  ETERM("design", "التحليل والتصميم الإنشائي", "Structural analysis & design", /structural (?:analysis|design)|تحليل إنشائي|تصميم إنشائي|حسابات إنشائية/i), ETERM("seismic", "التحليل الزلزالي وأحمال الرياح", "Seismic & wind analysis", /seismic|earthquake|response spectrum|wind loads?|زلازل|زلزالي|أحمال الرياح/i),
  ETERM("detailing", "تفريد الحديد وBBS", "Reinforcement detailing / BBS", /reinforcement detailing|rebar detailing|bar bending schedules?|\bBBS\b|تفريد(?: الحديد)?|تسليح/i), ETERM("foundation", "تصميم الأساسات", "Foundation design", /foundation design|raft|piles?|pile caps?|أساسات|لبشة|خوازيق/i),
  ETERM("calc", "المذكرات الحسابية وتقارير التصميم", "Design reports / calculation notes", /calculation (?:notes?|reports?|sheets?)|design reports?|design criteria|مذكرات? حسابية|تقارير التصميم/i), ETERM("pt", "البلاطات سابقة الإجهاد / Flat slab", "Post-tensioned / flat slabs", /post-?tension|\bPT\b slabs?|flat slabs?|سابق(?:ة)? الإجهاد|فلات سلاب|بلاطات لا كمرية/i),
  ETERM("clash", "كشف التعارضات والتنسيق", "Clash detection & coordination", /clash(?:es| detection)?|تعارضات/i), ETERM("lod", "LOD والنموذج الموحّد", "LOD / federated model", /\bLOD\s?\d{3}\b|federated|central model|النموذج (?:الموحد|المركزي)/i), ETERM("families", "عائلات Revit والنمذجة البارامترية", "Revit families / parametric modelling", /families|parametric|عائلات/i), ETERM("4d5d", "نمذجة 4D / 5D", "4D / 5D BIM", /\b[45]D\b/),
  ETERM("concept", "من الفكرة إلى الرسومات التنفيذية", "Concept → design development → CDs", /concept design|schematic design|design development|construction documents|\bCDs\b|مرحلة (?:الفكرة|التصميم المبدئي)|رسومات تنفيذية/i), ETERM("space", "تخطيط الفراغات", "Space planning", /space planning|تخطيط الفراغات/i), ETERM("facade", "الواجهات والغلاف الخارجي", "Façade / building envelope", /fa[cç]ade|curtain wall|cladding|واجهات|حائط ستائري/i), ETERM("finishing", "التشطيبات والـ Fit-out", "Finishing / fit-out works", /finishing works?|fit-?out|تشطيبات/i),
  ETERM("loadcalc", "حسابات الأحمال الحرارية", "HVAC load calculations", /(?:cooling|heating|heat) loads?|load calculations?|أحمال (?:التكييف|حرارية)/i), ETERM("ductpipe", "تصميم مجاري الهواء والمواسير", "Duct & pipe sizing", /duct(?:work)? (?:sizing|design)|pipe sizing|hydraulic calculations?|تصميم مجاري/i), ETERM("firefight", "مكافحة وإنذار الحريق", "Fire fighting & fire alarm", /fire ?fighting|sprinklers?|fire (?:alarm|pumps?)|\bFM-?200\b|مكافحة الحريق|إنذار الحريق|رشاشات/i),
  ETERM("plumbing", "الصحي والصرف", "Plumbing & drainage", /plumbing|drainage|water supply|sanitary|صحي|صرف صحي|تغذية بالمياه/i), ETERM("chw", "المياه المثلجة / VRF / AHU", "Chilled water / VRF / AHU", /chilled water|chillers?|\bVRF\b|\bVRV\b|\bAHUs?\b|\bFCUs?\b|تكييف مركزي|مياه مثلجة/i),
  ETERM("sld", "المخططات أحادية الخط (SLD)", "Single line diagrams (SLD)", /single[- ]line diagrams?|\bSLDs?\b/i), ETERM("cable", "مقاطع الكابلات وهبوط الجهد والقصر", "Cable sizing / voltage drop / short circuit", /cable sizing|voltage drop|short[- ]circuit|مقاطع الكابلات|هبوط الجهد/i), ETERM("lighting", "تصميم الإنارة", "Lighting design", /lighting (?:design|calculations?)|lux|إنارة|إضاءة/i), ETERM("earthing", "التأريض والصواعق", "Earthing & lightning protection", /earthing|grounding|lightning protection|تأريض|صواعق/i),
  ETERM("mvlv", "الجهد المتوسط والمنخفض والمحولات", "MV/LV, transformers & switchgear", /\bMV\b|\bLV\b|switchgears?|transformers?|substations?|محولات|لوحات (?:الجهد|التوزيع)|جهد متوسط/i), ETERM("elv", "التيار الخفيف وBMS", "ELV / BMS / fire alarm", /\bELV\b|\bBMS\b|CCTV|access control|structured cabling|تيار خفيف/i), ETERM("tnc", "الاختبار والتشغيل (T&C)", "Testing & commissioning", /testing (?:and|&) commissioning|\bT&C\b|commissioning|pre-?commissioning|اختبار(?:ات)? وتشغيل|التشغيل التجريبي/i),
  ETERM("settingout", "التوقيع والميزانيات", "Setting out & levelling", /setting[- ]?out|stake-?out|levell?ing|توقيع|ميزانية|ميزانيات/i), ETERM("topo", "الرفع المساحي وAs-built", "Topographic & as-built surveys", /topographic|as-built survey|رفع مساحي|الرفع المساحي/i), ETERM("cutfill", "الحفر والردم وحساب الكميات", "Cut & fill / volumes", /cut (?:and|&) fill|earthworks? volumes?|حفر وردم|كميات الحفر/i),
  ETERM("georef", "أنظمة الإحداثيات والإسناد الجغرافي", "Coordinate systems / georeferencing", /georeferenc|coordinate systems?|\bUTM\b|datum|إحداثيات|المرجع الجغرافي/i), ETERM("geodb", "قواعد البيانات المكانية والتحليل", "Geodatabase / spatial analysis", /geodatabase|spatial analysis|قواعد بيانات مكانية|تحليل مكاني/i),
  ETERM("stake", "إدارة أصحاب المصلحة والعميل", "Stakeholder & client management", /stakeholders?|client (?:management|relations?|meetings?)|أصحاب المصلحة/i), ETERM("risk", "إدارة المخاطر", "Risk management", /risk (?:management|register|log)|إدارة المخاطر|سجل المخاطر/i), ETERM("procure", "المشتريات والتوريدات", "Procurement", /procure(?:ment|d)|purchas(?:e|ing)|vendors?|suppliers?|مشتريات|توريدات/i),
  ETERM("materials", "اعتماد واختبار المواد", "Material approval & testing", /material (?:approval|testing|inspection)|cube tests?|slump|اعتماد المواد|اختبار(?:ات)? المواد|مكعبات/i), ETERM("snag", "قوائم الملاحظات والتسليم", "Snag lists & handover", /snag(?:ging)? lists?|punch[- ]lists?|handover|التسليم الابتدائي|ملاحظات التسليم/i), ETERM("qaplan", "خطة الجودة والتدقيق", "QA/QC plan & audits", /quality (?:plan|audits?|management system)|\bQMS\b|خطة الجودة|تدقيق الجودة/i),
];

export const TERM = Object.fromEntries(ENG_TERMS.map((x) => [x.id, x]));


// ---- what each track is judged on: tools (core must-haves, advanced differentiators), codes, contracts, credentials,
//      the terms screeners filter on, and the scope dimensions a project line must carry ----
export const KB = {
  site: { core: ["AutoCAD", "Excel"], adv: ["Primavera P6", "MS Project", "Revit", "Navisworks"], codes: ["Egyptian Code", "ACI 318", "ASTM"], contracts: ["FIDIC"], creds: ["PMP", "NEBOSH", "OSHA"], terms: ["ms", "daily", "lookahead", "rfi", "itp", "hse", "subcon", "asbuilt", "materials"], dims: ["area", "floors", "value", "system", "team", "result"] },
  tech: { core: ["AutoCAD", "Revit", "Excel"], adv: ["Navisworks", "Bluebeam", "CostX", "Planswift", "Dynamo"], codes: ["Egyptian Code", "ACI 318"], contracts: ["FIDIC", "POMI / CESMM / SMM"], creds: ["Autodesk Certified", "FIDIC certificate", "PMP"], terms: ["shop", "qto", "ipc", "rfi", "asbuilt", "vo", "subcon"], dims: ["area", "value", "contract", "count", "result"] },
  design: { core: ["AutoCAD", "Revit"], adv: ["Navisworks", "Dynamo"], codes: ["Egyptian Code"], contracts: [], creds: ["Autodesk Certified"], terms: ["calc", "concept"], dims: ["area", "floors", "system", "value", "result"] },
  supervision: { core: ["AutoCAD", "Excel"], adv: ["Revit", "Navisworks", "Aconex", "Primavera P6"], codes: ["Egyptian Code", "ACI 318", "ASTM"], contracts: ["FIDIC"], creds: ["PMP", "ISO 9001 Lead Auditor"], terms: ["itp", "materials", "rfi", "asbuilt", "snag", "ms"], dims: ["area", "value", "contract", "system", "client", "result"] },
  planning: { core: ["Primavera P6", "MS Project", "Excel"], adv: ["Power BI", "Synchro", "Acumen Fuse", "Asta Powerproject"], codes: [], contracts: ["FIDIC", "SCL delay protocol"], creds: ["PMI-SP", "PMP", "PSP (AACE)"], terms: ["baseline", "evm", "delay", "cashflow", "resource", "lookahead"], dims: ["value", "count", "contract", "result", "area"] },
  contracts: { core: ["Excel", "AutoCAD", "CostX"], adv: ["Planswift", "Candy / CCS", "Bluebeam", "Power BI"], codes: [], contracts: ["FIDIC", "POMI / CESMM / SMM"], creds: ["RICS", "CCP", "FIDIC certificate"], terms: ["qto", "ipc", "vo", "tender", "finalacc", "contractadmin", "subcon"], dims: ["value", "contract", "count", "result", "area"] },
  qa: { core: ["Excel"], adv: ["Aconex", "Procore", "Power BI"], codes: ["ISO 9001", "ASTM", "ISO 45001 / OHSAS", "Egyptian Code"], contracts: [], creds: ["ISO 9001 Lead Auditor", "NEBOSH", "OSHA", "Six Sigma"], terms: ["itp", "qaplan", "materials", "ms", "hse", "snag"], dims: ["count", "result", "area", "value", "team"] },
  bim: { core: ["Revit", "Navisworks"], adv: ["Dynamo", "BIM 360 / ACC", "Solibri", "Revizto", "Synchro", "Tekla"], codes: [], contracts: ["ISO 19650", "BEP / LOD"], creds: ["Autodesk Certified", "BIM certificate"], terms: ["clash", "lod", "families", "4d5d", "shop"], dims: ["area", "count", "system", "result", "value"] },
  gis: { core: ["ArcGIS", "QGIS"], adv: ["Global Mapper", "Python", "Drone / Photogrammetry", "Civil 3D"], codes: [], contracts: [], creds: [], terms: ["geodb", "georef", "topo"], dims: ["area", "count", "result"] },
  pm: { core: ["Primavera P6", "MS Project", "Excel"], adv: ["Power BI", "Aconex", "Procore"], codes: ["Egyptian Code"], contracts: ["FIDIC"], creds: ["PMP", "PMI-RMP"], terms: ["stake", "evm", "risk", "procure", "contractadmin", "vo", "hse"], dims: ["value", "team", "contract", "area", "result", "client"] },
};

export const KB_DISC = {
  "civil.design": { core: ["ETABS", "SAFE", "AutoCAD"], adv: ["SAP2000", "Revit Structure", "Tekla", "RAM Concept", "ADAPT", "PLAXIS", "IDEA StatiCa", "spColumn", "CSiBridge", "STAAD.Pro"], codes: ["ECP 203", "ECP 201", "ACI 318", "ASCE 7", "Eurocode", "ECP 202"], creds: ["Structural design diploma", "Chartered / PE"], terms: ["design", "seismic", "detailing", "foundation", "calc", "pt"] },
  "architecture.design": { core: ["Revit", "AutoCAD", "SketchUp"], adv: ["Lumion", "Enscape", "3ds Max", "Rhino", "Grasshopper", "Photoshop", "InDesign", "Dynamo"], codes: ["Egyptian Code", "Egyptian fire code", "IBC"], contracts: ["LEED / EDGE"], creds: ["LEED AP / GA", "Autodesk Certified"], terms: ["concept", "space", "facade", "lod", "families"] },
  "mechanical.design": { core: ["HAP", "Revit MEP", "AutoCAD"], adv: ["Elite", "Trane TRACE", "Pipe Flow", "AutoSPRINK / HydraCAD", "Navisworks", "Duct Sizer"], codes: ["ASHRAE", "NFPA", "SMACNA", "Egyptian fire code", "UPC / IPC (plumbing)"], creds: ["MEP diploma", "LEED AP / GA"], terms: ["loadcalc", "ductpipe", "firefight", "plumbing", "chw"], dims: ["capacity", "area", "system", "value", "result"] },
  "electrical.design": { core: ["ETAP", "DIALux", "AutoCAD"], adv: ["Revit MEP", "Relux", "SKM / EasyPower", "PVsyst", "Navisworks"], codes: ["IEC", "NEC", "BS 7671", "Egyptian electrical code", "IEEE"], creds: ["MEP diploma", "ETAP certified"], terms: ["sld", "cable", "lighting", "earthing", "mvlv"], dims: ["capacity", "area", "system", "value", "result"] },
  "mechanical.site": { core: ["AutoCAD", "Excel"], adv: ["Revit MEP", "Navisworks", "Primavera P6"], codes: ["NFPA", "ASHRAE", "SMACNA"], terms: ["tnc", "chw", "firefight", "plumbing", "ms", "rfi", "itp"], dims: ["capacity", "system", "area", "team", "result"] },
  "electrical.site": { core: ["AutoCAD", "Excel"], adv: ["Revit MEP", "ETAP", "Primavera P6"], codes: ["IEC", "NEC", "Egyptian electrical code"], terms: ["tnc", "mvlv", "elv", "earthing", "ms", "rfi", "itp"], dims: ["capacity", "system", "area", "team", "result"] },
  "mechanical.tech": { core: ["AutoCAD", "Revit MEP", "Excel"], adv: ["Navisworks", "Bluebeam", "Dynamo"], codes: ["NFPA", "ASHRAE"], terms: ["shop", "qto", "ipc", "rfi", "asbuilt", "chw", "firefight"] },
  "electrical.tech": { core: ["AutoCAD", "Revit MEP", "Excel"], adv: ["Navisworks", "Bluebeam", "DIALux"], codes: ["IEC", "NEC"], terms: ["shop", "qto", "ipc", "rfi", "asbuilt", "sld", "mvlv"] },
  "mechanical.supervision": { codes: ["NFPA", "ASHRAE", "SMACNA"], terms: ["tnc", "itp", "materials", "rfi", "firefight", "chw"] },
  "electrical.supervision": { codes: ["IEC", "NEC", "Egyptian electrical code"], terms: ["tnc", "itp", "materials", "rfi", "mvlv", "elv"] },
  "architecture.site": { core: ["AutoCAD", "Excel"], adv: ["Revit", "SketchUp", "Primavera P6"], codes: ["Egyptian Code", "Egyptian fire code"], terms: ["finishing", "ms", "rfi", "snag", "itp", "materials"] },
  "architecture.tech": { core: ["AutoCAD", "Revit"], adv: ["Navisworks", "SketchUp", "Bluebeam"], terms: ["shop", "qto", "asbuilt", "finishing", "rfi"] },
  "architecture.supervision": { codes: ["Egyptian Code", "Egyptian fire code"], terms: ["finishing", "itp", "materials", "snag", "rfi"] },
  "survey.site": { core: ["Total Station", "GNSS / GPS", "AutoCAD", "Civil 3D"], adv: ["Leica / Trimble", "Drone / Photogrammetry", "Global Mapper", "MicroStation / OpenRoads"], codes: [], contracts: [], creds: [], terms: ["settingout", "topo", "cutfill", "georef", "asbuilt"], dims: ["area", "count", "result", "value"] },
  "survey.tech": { core: ["Civil 3D", "AutoCAD", "Excel"], adv: ["Total Station", "Global Mapper"], codes: [], contracts: [], creds: [], terms: ["topo", "cutfill", "qto", "asbuilt"], dims: ["area", "count", "result"] },
  "survey.qa": { core: ["Total Station", "Excel"], adv: ["GNSS / GPS", "Civil 3D"], codes: ["ISO 9001"], contracts: [], terms: ["settingout", "itp", "asbuilt"], dims: ["count", "result", "area"] },
};

export const kbFor = (disc?: any, track?: any) => { const base = KB[track] || KB.site; const o = KB_DISC[disc + "." + track] || {}; return { ...base, ...o, dims: o.dims || base.dims }; };


// ---- what a project line should carry: the dimensions screeners look for ----
export const DIMS = {
  area: L2("الحجم (م² مسطحات، كم، م³)", "Size (m² BUA, km, m³)"), floors: L2("الارتفاع / عدد الأدوار", "Height / floors (G+N)"), value: L2("قيمة المشروع أو العقد", "Project / contract value"),
  contract: L2("نوع العقد (FIDIC، مقطوعية…)", "Contract type (FIDIC, lump sum…)"), system: L2("النظام الإنشائي أو نظام الـ MEP", "Structural / MEP system"), team: L2("حجم الفريق أو مقاولي الباطن", "Team / subcontractor size"),
  client: L2("المالك أو الاستشاري", "Client / consultant"), result: L2("نتيجة قابلة للقياس (%، أيام، توفير)", "Measurable result (%, days, savings)"), count: L2("عدد المخرجات (لوحات، مستخلصات، RFIs)", "Deliverable counts (drawings, IPCs, RFIs)"),
  capacity: L2("السعة (TR، kVA، MW)", "Capacity (TR, kVA, MW)"), type: L2("نوع المشروع", "Project type"),
};


// ---- scope extraction: every dimension a screener looks for, with the matched text (reused, never invented, in rewrites) ----
export const NUMX = "\\d{1,3}(?:[,٬]\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?";

export const SCOPE_RE = {
  area: new RegExp(`(?:${NUMX})\\s*(?:k\\s*)?(?:m²|m2\\b|sqm|sq\\.?\\s?m\\b|square met(?:er|re)s?|م²|م2|متر(?:ًا|ا)? مربع(?:ًا|ا)?|feddans?|فدان|أفدنة|acres?|hectares?|\\bha\\b|km²|كم²)|(?:${NUMX})\\s*(?:km\\b|كم\\b|kilomet(?:er|re)s?|كيلومتر(?:ًا|ات)?|linear met(?:er|re)s?|م\\.ط)|(?:${NUMX})\\s*(?:m³|m3\\b|cbm|cu\\.?\\s?m\\b|م³|م3|متر(?:ًا|ا)? مكعب(?:ًا|ا)?|tons? of (?:steel|rebar|reinforcement)|طن (?:حديد|تسليح))`, "i"),
  floors: /\b[GB]\s?\+\s?\d{1,3}\b|\b\d{1,3}[- ]?(?:floors?|stor(?:e)?ys?|stories|levels)\b|\b\d{1,2}\s*basements?\b|\d{1,3}\s*(?:طابق(?:ًا|ا)?|طوابق|دور(?:ًا|ا)?|أدوار|ادوار)|بدروم(?:ين)?/i,
  value: new RegExp(`(?:EGP|LE\\b|L\\.E\\.?|USD|US\\$|\\$|SAR|AED|EUR|€|£)\\s*(?:${NUMX})\\s*(?:bn|billion|m\\b|mn\\b|mm\\b|million|k\\b)?|(?:${NUMX})\\s*(?:bn|billion|m\\b|mn\\b|mm\\b|million|k\\b|ألف|مليون|مليار)?\\s*(?:EGP|LE\\b|L\\.E|جنيه|ج\\.م|USD|dollars?|دولار|SAR|riyals?|ريال|AED|dirhams?|درهم|euros?|يورو)|(?:${NUMX})\\s*(?:مليون|مليار)|(?:worth|valued at|value of|budget of|contract value)\\s*(?:of\\s*)?(?:EGP|USD|\\$)?\\s*(?:${NUMX})`, "i"),
  contract: /fidic|فيديك|(?:red|yellow|silver|green|pink|white|gold) book|lump[- ]?sum|re-?measur(?:ed|ement)|unit[- ]price|cost[- ]plus|\bEPC\b|design[- ](?:and|&)[- ]build|\bD&B\b|turn-?key|target cost|\bNEC\s?[34]\b|\bJCT\b|\bPPP\b|\bBOT\b|مقطوعية|سعر إجمالي|إعادة القياس|أسعار الوحدات|التكلفة زائد|تسليم مفتاح|عقد (?:مقاولة|مقطوعية|تصميم وتنفيذ)/i,
  system: /flat[- ]slabs?|post[- ]?tension(?:ed|ing)?|\bPT\b(?:\s?slabs?)?|hollow[- ]blocks?|ribbed slabs?|waffle|solid slabs?|paneled beams?|pre-?cast|pre-?engineered|\bPEB\b|steel structures?|space frames?|trusses|RC (?:skeleton|frames?)|reinforced concrete (?:frames?|skeleton|structures?)|shear walls?|core walls?|raft(?: foundations?)?|mat foundations?|(?:bored|driven|CFA) piles?|pile caps?|diaphragm walls?|sheet piles?|shoring|composite (?:deck|slabs?)|pre-?stressed|chilled[- ]water|chillers?|\bVRF\b|\bVRV\b|\bAHUs?\b|\bFCUs?\b|sprinklers?|fire pumps?|FM-?200|fire alarm|\bBMS\b|\b(?:LV|MV)\b(?: panels?| switchgears?)?|cable trays?|bus ?(?:ways?|ducts?)|switchgears?|transformers?|substations?|generators?|\bUPS\b|earthing|\bELV\b|CCTV|curtain walls?|بلاطات? لا كمرية|فلات سلاب|سابق(?:ة)? الإجهاد|بوست تنشن|هوردي|بلاطات مصمتة|سابق(?:ة)? الصب|منشآت معدنية|هيكل خرساني|حوائط (?:قص|ساندة)|لبشة|خوازيق|تكييف مركزي|مياه مثلجة|رشاشات|إنذار حريق|محولات|لوحات (?:جهد|توزيع)|مولدات|حائط ستائري/i,
  capacity: /\d[\d,.]*\s*(?:TR\b|tons? of refrigeration|RT\b|kW\b|MW\b|kVA\b|MVA\b|kV\b|l\/s\b|GPM\b|m³\/h|طن تبريد|كيلو ?وات|ميجا ?وات|ك\.ف\.أ)/i,
  team: /(?:team of|leading|led|managed|supervised|supervising|managing|coordinated|coordinating|directed|mentored)\s+(?:a\s+)?(?:team of\s+)?\d{1,4}\s*\+?\s*(?:site |design |technical |mep |civil |junior )?(?:engineers?|foremen|foreman|technicians?|surveyors?|draftsm[ae]n|draughtsm[ae]n|workers?|labou?rs?|labou?rers|staff|people|members|subcontractors?|sub-?contractors?|crews?)|\b\d{1,4}\s*\+?\s*(?:site |design |technical )?(?:engineers|foremen|technicians|surveyors|draftsm[ae]n|workers|labou?rs|labou?rers|subcontractors|sub-?contractors|crews)\b|فريق(?: عمل)? (?:من )?\d+|\d+\s*(?:مهندس(?:ين|ًا|ا)?|فني(?:ين)?|عامل(?:ًا|ا)?|عمال|مقاول(?:ي)? باطن|مشرف(?:ين)?)/i,
  client: /\bNUCA\b|new urban communities|هيئة المجتمعات العمرانية|\bACUD\b|administrative capital for urban development|شركة العاصمة الإدارية|ministry of (?:housing|transport)|وزارة (?:الإسكان|النقل)|armed forces engineering authority|الهيئة الهندسية|talaat moustafa|طلعت مصطفى|\bSODIC\b|سوديك|emaar|إعمار|palm hills|بالم هيلز|mountain view|ماونتن فيو|hyde park|هايد بارك|madinet masr|مدينة مصر|ora developers|orascom development|dar al[- ]?handasah|دار الهندسة|\bECG\b|engineering consultants group|moharram[- ]bakhoum|محرم باخوم|hamza associates|sabbour|صبور|khatib (?:&|and) alami|parsons|aecom|atkins|\bWSP\b|jacobs|\bEHAF\b|arab consulting engineers|\b(?:client|employer|owner|consultant)\s*[:：-]|(?:المالك|الاستشاري|جهة الإسناد)\s*[:：-]|لصالح (?:هيئة|شركة|وزارة)|للمالك/i,
  result: /\d+(?:\.\d+)?\s*%|ahead of (?:schedule|plan|baseline|the programme)|on[- ]time|within budget|zero (?:LTIs?|lost[- ]time|accidents?|incidents?|NCRs?|rejections?|claims?)|\bsav(?:ed|ing)\b|reduc(?:ed|ing|tion)|\bcut (?:by|from|the)|decreas|increas|improv(?:ed|ing)|recover(?:ed|ing)|accelerat|shortened|first[- ](?:time|submission) approval|approved (?:on|at) first|قبل الموعد|في الموعد|وفّ?رت?|توفير|خفّ?ضت?|قلّ?صت?|تقليل|زيادة|رفعت|تحسين|بدون حوادث|صفر (?:حوادث|ملاحظات)|اعتماد من أول/i,
  count: /\b\d{1,4}\s*\+?\s*(?:shop drawings?|drawings?|sheets?|IPCs?|interim payments?|payment certificates?|invoices?|RFIs?|NCRs?|submittals?|activities|BOQ items|items|clashes|inspections?|method statements?|packages?|tenders?|bids?|villas?|units?|buildings?|towers?|blocks?|variation orders?|VOs?)\b|\d+\s*(?:لوحة|لوحات|مستخلص(?:ات|ًا|ا)?|ملاحظة|ملاحظات|بند(?:ًا|ا)?|بنود|نشاط(?:ًا|ا)?|أنشطة|تعارض(?:ات|ًا|ا)?|فيلا|فلل|وحدة|وحدات|عمارة|عمارات|مبنى|مباني|برج|أبراج|عطاء(?:ات)?)/i,
};

// returns { dims: Set, hit: { dim: matched text } } — "type" comes from the parser's project-type lexicon
export function scopeOf(text?: any) {
  const t = String(text || ""); const dims = new Set(); const hit: any = {};
  Object.entries(SCOPE_RE).forEach(([k, re]: any) => { const m = re.exec(t); if (m) { dims.add(k); hit[k] = m[0].trim(); } });
  const types = CV_PROJECT_TYPES.filter(([, re]: any) => re.test(t)).map(([k]: any) => k); if (types.length) { dims.add("type"); hit.type = types[0]; }
  return { dims, hit, types };
}

export const anyScope = (s?: any) => ["area", "floors", "value", "contract", "system", "capacity", "team", "client", "result", "count"].some((k) => s.dims.has(k));


// ---- software depth: listed → applied in experience → advanced (modelling, analysis, coordination evidence) ----
export const TOOL_ADV = {
  "AutoCAD": /dynamic blocks?|autolisp|\blisp\b|x-?refs?|sheet sets?|3d (?:model|modell?ing)|civil 3d|parametric|standards? (?:and|&) templates|coordinated (?:mep|services) drawings/i,
  "Revit": /famil(?:y|ies)|parametric|\bLOD\s?\d{3}\b|work-?shar|central model|federat|schedules?|quantit|\b[45]D\b|clash|coordinat|templates?|dynamo|shared parameters|construction documents|detailing|rebar|نمذجة|عائلات/i,
  "Revit Structure": /rebar|reinforcement model|famil|LOD|analytical model|coordinat|schedules?/i, "Revit MEP": /famil|LOD|clash|coordinat|system (?:modell?ing|design)|sizing|circuits?|panel schedules?|load calc|schedules?/i,
  "Navisworks": /clash|timeliner|\b4D\b|simulation|quantification|federat|coordination|تعارض/i, "Dynamo": /./, "Tekla": /connections?|shop drawings?|detailing|rebar|LOD|fabrication|\bIFC\b|./i, "Solibri": /./, "Revizto": /./, "BIM 360 / ACC": /./, "Synchro": /./,
  "ETABS": /seismic|response spectrum|modal|dynamic|wind|p-?delta|pushover|time history|shear walls?|drift|irregularit|ECP\s?201|ASCE\s?7|lateral|زلازل|رياح/i, "SAFE": /punching|deflection|crack|post-?tension|\bPT\b|raft|flat slab|long-?term|strips?|لبشة|ترخيم/i,
  "SAP2000": /non-?linear|staged|dynamic|bridges?|tanks?|steel|shell|time history|moving loads?/i, "CSiBridge": /./, "RAM Concept": /./, "ADAPT": /./, "PLAXIS": /./, "IDEA StatiCa": /./, "STAAD.Pro": /seismic|dynamic|steel|design/i, "spColumn": /./,
  "Primavera P6": /baseline|critical path|\bCPM\b|resources?|earned value|\bEVM\b|\bSPI\b|\bCPI\b|delay|\bTIA\b|time impact|\bEOT\b|what-?if|look-?ahead|progress updates?|S-?curve|cash ?flow|\bWBS\b|\d{3,}\s*activities|أنشطة|المسار الحرج/i, "MS Project": /baseline|critical path|resources?|tracking|look-?ahead|S-?curve/i,
  "Excel": /\bVBA\b|macros?|power query|pivot|dashboards?|power pivot|x?lookup|automat/i, "Power BI": /dashboards?|\bDAX\b|power query|reports?/i,
  "DIALux": /lux|illuminance|emergency lighting|photometric|lighting calc|uniformity/i, "ETAP": /load flow|short[- ]circuit|arc flash|relay coordination|protection|harmonics?|motor starting|transient/i, "SKM / EasyPower": /./,
  "HAP": /load|energy (?:model|analysis)|block load|zoning/i, "Elite": /./, "AutoSPRINK / HydraCAD": /./, "Pipe Flow": /./,
  "Civil 3D": /corridors?|alignments?|profiles?|surfaces?|grading|pipe networks?|earthworks?|cut (?:and|&) fill/i, "ArcGIS": /geodatabase|spatial analysis|model builder|arcpy|python|georeferenc|network analysis|web maps?|raster/i,
  "Total Station": /setting[- ]out|traverse|stake-?out|as-built|levell?ing|topograph|توقيع|رفع/i, "GNSS / GPS": /\bRTK\b|static|control points?|نقاط ثابتة/i,
  "CostX": /take-?off|\bBOQ\b|estimat|rates?/i, "Planswift": /take-?off|\bBOQ\b|estimat/i, "Bluebeam": /markups?|take-?off|studio|review/i, "Lumion": /animations?|renders?|walk-?through/i, "SketchUp": /./, "Rhino": /./, "Grasshopper": /./, "Enscape": /./,
};

export const TOOL_BASIC = /\b(?:basic|beginner|basics|fundamentals?|familiar(?:ity)? with|introductory|elementary)\b|\(basic\)|مبتدئ|أساسيات|اساسيات|مستوى مبدئي/i;

export const toolRe = (name?: any) => { const t = CV_TOOLS.find((x) => x.name === name); return t ? t.re : null; };

export const LEVEL_W = { advanced: 1, applied: 0.85, listed: 0.5, basic: 0.35, missing: 0 };

export const LEVEL_L = { advanced: L2("متقدم — نمذجة / تحليل / تنسيق", "Advanced — modelling / analysis / coordination"), applied: L2("مستخدم في خبرة فعلية", "Applied in real work"), listed: L2("مذكور في القائمة فقط", "Listed only — no proof"), basic: L2("مستوى مبدئي", "Basic level"), missing: L2("غير موجود", "Missing") };

export function toolEvidence(cv?: any, name?: any) {
  const re = toolRe(name); if (!re) return { name, level: "missing" };
  const secs = cv.sections || {}; const L = (id?: any) => (secs[id] ? secs[id].lines : []);
  const expLines = cv.experience.flatMap((e) => [...e.headerLines, ...e.bullets.map((b) => b.text)]);
  const pools: any = { exp: expLines, proj: [...L("projects"), ...cv.education.filter((e) => e.gradProject).map((e) => e.gradProject)], skills: L("skills"), summary: cv.summaryText ? [cv.summaryText] : [] };
  const where: Record<string, any[]> = Object.fromEntries(Object.entries(pools).map(([k, ls]: any) => [k, ls.filter((l) => re.test(l))]));
  const any = Object.values(where).some((x) => x.length) || re.test(cv.text); if (!any) return { name, level: "missing" };
  const adv = TOOL_ADV[name]; const withTool: any = [...where.exp, ...where.proj, ...where.summary, ...where.skills];
  const advLine = adv ? withTool.find((l) => adv.test(l.replace(re, " ")) || (adv.source === "." && (where.exp.includes(l) || where.proj.includes(l)))) : null;
  const advAnywhere = adv && adv.source !== "." && (where.exp.length || where.proj.length) && adv.test([...pools.exp, ...pools.proj].join("\n"));
  // «basic» counts only right next to this tool («Revit MEP (basic)», «basic knowledge of AutoCAD»), not anywhere on a shared skills line
  const basic = withTool.some((l) => { const m = re.exec(l); if (!m) return false; return TOOL_BASIC.test(l.slice(m.index + m[0].length, m.index + m[0].length + 18)) || /(?:basic|beginner|familiar(?:ity)? with|أساسيات|مبتدئ)[^,·|•]{0,18}$/i.test(l.slice(Math.max(0, m.index - 24), m.index)); });
  const level = basic && !advLine ? "basic" : advLine || advAnywhere ? "advanced" : where.exp.length || where.proj.length ? "applied" : "listed";
  const ev = (advLine || where.exp[0] || where.proj[0] || where.skills[0] || where.summary[0] || "").replace(/\s+/g, " ").slice(0, 140);
  return { name, level, evidence: ev, inExp: where.exp.length > 0, inSkills: where.skills.length > 0 };
}


// ---- track signature: how strongly the CV reads as each track (titles weigh most, the latest role most of all) ----
export const TRACK_SIG: any = {
  site: /site (?:engineer|intern|trainee|manager|supervisor)|execution engineer|construction engineer|superintendent|foreman|installation|erection|pouring|casting|مهندس (?:موقع|تنفيذ)|مدير (?:موقع|تنفيذ)|\bexecution\b|التنفيذ|تركيب|صب الخرسانة/i,
  tech: /technical office|shop[- ]?drawings?|\bQTO\b|\bBOQs?\b|\bIPCs?\b|مكتب فني|مكتب فنى|لوحات تنفيذية|مستخلص|حصر/i,
  design: /design engineer|structural (?:design|engineer)|designer|\bETABS\b|\bSAFE\b|SAP\s?2000|calculation|\bETAP\b|dialux|load flow|short[- ]circuit|single[- ]line|\bSLDs?\b|cable sizing|lighting design|\bHAP\b|load calc|duct sizing|pipe sizing|concept design|design development|sketchup|lumion|مهندس تصميم|مصمم|تصميم|حسابات/i,
  supervision: /resident engineer|supervision engineer|inspector|consultant (?:engineer|supervision)|site supervision|مهندس إشراف|إشراف استشاري|مهندس مقيم|مفتش/i,
  planning: /planning engineer|planner|scheduler|primavera|\bP6\b|baseline|\bEVM\b|scheduling|مهندس تخطيط|تخطيط|جدول زمني/i,
  contracts: /quantity surveyor|\bQS\b|contracts? engineer|cost engineer|estimat(?:or|ion)|tender|claims?|variation|\bFIDIC\b|عقود|تسعير|مطالبات|مقايسات/i,
  qa: /\bQA\b|\bQC\b|quality|\bHSE\b|safety|\bITP\b|\bNCR\b|جودة|سلامة/i,
  bim: /\bBIM\b|revit|navisworks|clash|modell?er|نمذجة/i,
  gis: /\bGIS\b|arcgis|qgis|geodatabase|جيوماتكس/i,
  pm: /project manager|\bPMP\b|stakeholders?|project management|مدير (?:ال)?مشروع|إدارة المشروعات/i,
};

export function trackShares(cv?: any, disc?: any) {
  const allowed = tracksFor(disc).map((t) => t[0]); const s: Record<string, number> = Object.fromEntries(allowed.map((t) => [t, 0]));
  const add = (text?: any, w?: any) => allowed.forEach((t) => { const m = String(text || "").match(new RegExp(TRACK_SIG[t].source, "gi")); if (m) s[t] += m.length * w; });
  const real = cv.experience.filter((e) => !e.intern); const roles = real.length ? real : cv.experience;
  roles.forEach((e, i) => { add(e.title, i === 0 ? 6 : 3); e.bullets.forEach((b) => add(b.text, i === 0 ? 1.2 : 0.8)); });
  add(cv.headline, 5); add(cv.summaryText, 1.5); add((cv.sections.skills ? cv.sections.skills.lines : []).join(" "), 0.6); add((cv.sections.projects ? cv.sections.projects.lines : []).join(" "), 0.8); add(cv.education.map((e) => e.gradProject).filter(Boolean).join(" "), 1.2); add((cv.sections.certs ? cv.sections.certs.lines : []).join(" "), 0.5);
  const tot = Object.values(s).reduce((a, b) => a + b, 0) || 1; const shares: Record<string, number> = Object.fromEntries(Object.entries(s).map(([k, v]: any) => [k, v / tot]));
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1]); return { shares, ranked, top: ranked[0] && ranked[0][1] > 0 ? ranked[0][0] : null, total: tot };
}


// ---- bullet rewriting: the work type sets the verb, the default object, the scope that matters and the result to prove ----
// Nothing is invented: a figure the CV states for the same role is reused; anything else becomes a [bracket] to fill.
// A bullet that already opens with an action verb keeps its own words — only the missing scope and result are added.
export const TK = (id?: any, re?: any, dims?: any, en?: any, ar?: any, extra: any = {}) => ({ id, re, dims, en, ar, ...extra });

export const TASKS = [
  TK("ipc", /\bIPCs?\b|interim payments?|payment certificates?|invoic|مستخلص/i, ["value", "contract"], { verb: "Prepared", obj: "monthly interim payment certificates (IPCs)", result: "with zero rejections by the consultant" }, { verb: "أعددت", obj: "المستخلصات الشهرية", result: "دون أي رفض من الاستشاري" }, { count: true }),
  TK("qto", /quantit|take-?off|\bBOQs?\b|حصر|كميات|مقايس/i, ["value", "type"], { verb: "Quantified", obj: "BOQ quantities", result: "keeping variance against tender quantities within [X]%" }, { verb: "حصرت", obj: "كميات المقايسة", result: "بفرق لا يتجاوز [النسبة]% عن كميات العطاء" }),
  TK("shop", /shop[- ]?drawings?|(?:ال)?لوحات (?:ال)?تنفيذية|(?:ال)?رسومات (?:ال)?تنفيذية/i, ["type", "area"], { verb: "Prepared and coordinated", obj: "shop drawings", result: "securing first-submission consultant approval for [X]% of packages" }, { verb: "أعددت ونسّقت", obj: "اللوحات التنفيذية", result: "واعتمدها الاستشاري من أول تقديم بنسبة [النسبة]%" }, { count: true }),
  TK("schedule", /(?:time|project|master|baseline|look-?ahead|construction|work|3-?weeks?|recovery|progress)\s+schedules?|scheduling|programme|baseline|primavera|\bP6\b|ms project|critical path|(?:ال)?جدول(?: ال)? زمني|البرنامج الزمني|تخطيط/i, ["value", "type"], { verb: "Developed and updated", obj: "the Primavera P6 baseline programme", result: "tracking SPI/CPI monthly and recovering [N] days of delay" }, { verb: "أعددت وحدّثت", obj: "البرنامج الزمني الأساسي على Primavera P6", result: "مع متابعة SPI/CPI شهريًا واسترداد [العدد] يومًا من التأخير" }),
  TK("cost", /cost control|budget|\bEVM\b|cash ?flow|earned value|تكاليف|ميزانية|تدفق نقدي/i, ["value"], { verb: "Controlled", obj: "project costs", result: "holding CPI at [X] and saving EGP [X]M" }, { verb: "راقبت", obj: "تكاليف المشروع", result: "وحافظت على CPI عند [القيمة] بتوفير [القيمة] مليون جنيه" }),
  TK("design", /design|analy[sz]|calculat|\bETABS\b|\bSAFE\b|SAP\s?2000|\bHAP\b|\bETAP\b|dialux|single[- ]line|\bSLDs?\b|cable (?:schedules?|sizing)|load (?:calc|flow)|short[- ]circuit|lighting (?:design|calc)|\blux\b|duct sizing|pipe sizing|تصميم|تحليل|حسابات/i, ["type", "floors", "area"], { verb: "Designed", obj: "the structural system", result: "optimising material quantities by [X]%" }, { verb: "صممت", obj: "النظام الإنشائي", result: "مع خفض كميات المواد بنسبة [النسبة]%" }, { tool: true, code: true }),
  TK("bim", /\bBIM\b|revit|navisworks|clash|modell?ing|\bmodels?\b|نمذجة|نموذج/i, ["type", "area"], { verb: "Developed", obj: "LOD [350] Revit models", result: "resolving [N] clashes before construction through Navisworks coordination" }, { verb: "طوّرت", obj: "نماذج Revit بمستوى LOD [350]", result: "وحللت [العدد] تعارضًا قبل التنفيذ عبر تنسيق Navisworks" }),
  TK("qa", /inspect|\bITPs?\b|\bNCRs?\b|quality|\bQA\b|\bQC\b|cube tests?|slump|testing|\btests?\b|test reports?|فحص|جودة|اختبار|استلام/i, ["type"], { verb: "Implemented", obj: "ITPs and material inspections", result: "raising and closing [N] NCRs and reaching [X]% first-time acceptance" }, { verb: "طبّقت", obj: "خطط الفحص والاختبار (ITP) واستلام المواد", result: "وأغلقت [العدد] تقرير عدم مطابقة بنسبة قبول من أول مرة [النسبة]%" }),
  TK("hse", /safety|\bHSE\b|toolbox|risk assess|سلامة|مخاطر/i, ["team"], { verb: "Enforced", obj: "the HSE plan and daily toolbox talks", result: "reaching [N] man-hours without a lost-time injury" }, { verb: "طبّقت", obj: "خطة السلامة واجتماعات السلامة اليومية", result: "وحققت [العدد] ساعة عمل دون إصابة مضيّعة للوقت" }),
  TK("mep", /install|commission|\bT&C\b|chillers?|\bAHUs?\b|\bFCUs?\b|\bVRF\b|sprinklers?|fire (?:fighting|alarm)|switchgear|transformers?|\bLV\b|\bMV\b|\bkV\b|cables?|cable trays?|تركيب|تشغيل|لوحات (?:الكهرباء|التوزيع|كهربائية)|كابلات|تكييف|حريق/i, ["system", "capacity", "area"], { verb: "Supervised", obj: "installation, testing and commissioning of the MEP systems", result: "handing over with zero punch-list items carried over" }, { verb: "أشرفت على", obj: "تركيب واختبار وتشغيل أنظمة الـ MEP", result: "وسلّمتها دون ملاحظات مرحّلة" }),
  TK("survey", /setting[- ]?out|survey|levell|topograph|total station|gnss|توقيع|رفع مساحي|ميزانية|مساح/i, ["area"], { verb: "Performed", obj: "setting-out and as-built surveys", result: "within ±[5] mm tolerance and zero rework" }, { verb: "نفّذت", obj: "أعمال التوقيع والرفع المساحي", result: "بدقة ±[5] مم ودون إعادة عمل" }, { tool: true }),
  TK("tender", /tender|pricing|estimat|\bbids?\b|عطاء|تسعير|مناقص/i, ["value"], { verb: "Priced", obj: "tenders", result: "winning [N] of them ([X]% hit rate)" }, { verb: "سعّرت", obj: "العطاءات", result: "وفزنا بـ [العدد] منها (نسبة نجاح [النسبة]%)" }, { count: true }),
  TK("procure", /procure|purchas|vendors?|suppliers?|توريد|مشتريات/i, ["value"], { verb: "Managed procurement of", obj: "materials and subcontract packages", result: "saving [X]% against budget" }, { verb: "أدرت توريد", obj: "المواد وحزم مقاولي الباطن", result: "بتوفير [النسبة]% عن الميزانية" }),
  TK("vo", /variations?|\bVOs?\b|claims?|أوامر التغيير|مطالبات/i, ["value", "contract"], { verb: "Prepared and negotiated", obj: "variation orders and claims", result: "recovering [X]% of the claimed value" }, { verb: "أعددت وفاوضت على", obj: "أوامر التغيير والمطالبات", result: "واستردت [النسبة]% من القيمة المطالب بها" }, { count: true }),
  TK("coord", /coordinat|liais|\bRFIs?\b|submittals?|meetings?|تنسيق|نسّقت|نسقت|اجتماعات/i, ["type"], { verb: "Coordinated", obj: "RFIs and submittals with the consultant, client and subcontractors", result: "cutting average response time to [N] days" }, { verb: "نسّقت", obj: "طلبات الاستيضاح والاعتمادات مع الاستشاري والمالك ومقاولي الباطن", result: "وخفّضت متوسط زمن الرد إلى [العدد] أيام" }),
  TK("report", /reports?|تقارير|تقرير/i, ["type"], { verb: "Issued", obj: "daily and weekly progress reports", result: "used by the PM to recover [N] days of slippage" }, { verb: "أصدرت", obj: "تقارير الإنجاز اليومية والأسبوعية", result: "اعتمد عليها مدير المشروع في استرداد [العدد] يومًا" }),
  TK("lead", /\bled\b|leading|managed (?:a )?team|mentor|team of|قدت|قيادة|أدرت فريق/i, ["type", "value"], { verb: "Led", obj: "a team of [N] engineers", result: "delivering [milestone] [N] weeks ahead of plan" }, { verb: "قدت", obj: "فريقًا من [العدد] مهندسين", result: "وسلّمت [المرحلة] قبل موعدها بـ [العدد] أسابيع" }),
  TK("supervise", /supervis|execution|construct|follow(?:ed|ing)? ?up|monitor|oversaw|pour|casting|concrete|finishing|\bworks\b|أشرف|إشراف|متابعة|تابعت|تنفيذ|صب|خرسانة|تشطيبات|أعمال/i, ["area", "type", "floors"], { verb: "Supervised", obj: "execution of concrete and finishing works", result: "achieving [X]% on-time milestones with zero lost-time injuries" }, { verb: "أشرفت على", obj: "تنفيذ أعمال الخرسانة والتشطيبات", result: "وحققت [النسبة]% من المراحل في موعدها دون إصابات" }, { team: true }),
];

// design work is judged differently per discipline: the default object, the scope that matters and the result to prove
export const DESIGN_BY_DISC = {
  civil: { dims: ["type", "floors", "area"], en: { obj: "the structural system", result: "optimising concrete and steel quantities by [X]%" }, ar: { obj: "النظام الإنشائي", result: "مع خفض كميات الخرسانة والحديد بنسبة [النسبة]%" } },
  architecture: { dims: ["type", "area", "floors"], en: { obj: "the architectural design package", result: "reaching client approval at concept stage in [N] iterations" }, ar: { obj: "حزمة التصميم المعماري", result: "وحصلت على اعتماد المالك في مرحلة الفكرة خلال [العدد] مراجعات" } },
  mechanical: { dims: ["type", "capacity", "area"], en: { obj: "the HVAC and fire-fighting systems", result: "right-sizing plant capacity to save [X]% on equipment" }, ar: { obj: "أنظمة التكييف ومكافحة الحريق", result: "مع ضبط قدرة المعدات بتوفير [النسبة]%" } },
  electrical: { dims: ["type", "capacity", "area"], en: { obj: "the power and lighting systems", result: "keeping voltage drop under [X]% and cutting cable cost by [X]%" }, ar: { obj: "أنظمة القوى والإنارة", result: "مع هبوط جهد أقل من [النسبة]% وخفض تكلفة الكابلات بنسبة [النسبة]%" } },
};

export const TASK_GENERIC = TK("generic", /./, ["type", "area"], { verb: "Delivered", obj: "", result: "[add the measurable result: %, days or EGP]" }, { verb: "أنجزت", obj: "", result: "[أضف النتيجة بالرقم: نسبة أو أيام أو قيمة]" });

// the work types a bullet mentions, in the order it mentions them (what it leads with decides the verb)
export const tasksOf = (t?: any) => TASKS.map((k) => { const m = k.re.exec(t); return m ? [k, m.index] : null; }).filter(Boolean).sort((a, b) => a[1] - b[1]).map(([k]: any) => k);

// one dimension as a phrase, from the CV's own figure or as a bracket to fill
export function dimPhrase(d?: any, v?: any, ar?: any) {
  if (ar) return { type: `لمشروع ${v || "[سكني / إداري]"}`, floors: v || "[عدد الأدوار] دور", area: v ? `${v}` : "[المساحة] م² مسطحات", value: `بقيمة ${v || "[القيمة] مليون جنيه"}`, contract: `بعقد ${v || "فيديك [الكتاب الأحمر]"}`, system: v || "[النظام الإنشائي]", capacity: v || "[السعة] طن تبريد / ك.ف.أ", client: `لصالح ${v || "[المالك / الاستشاري]"}`, team: `بقيادة ${v || "فريق من [العدد]"}` }[d];
  return { type: `for a ${v ? TYPE_EN[v] || v : "[residential / commercial]"} project`, floors: v || "G+[N]", area: v ? `${v}${/m²|m2|sqm/i.test(v) ? " BUA" : ""}` : "[X] m² BUA", value: `worth ${v || "EGP [X]M"}`, contract: `under a ${v || "FIDIC [Red Book]"} contract`, system: v || "[structural / MEP system]", capacity: v || "[X] TR / kVA", client: `for ${v || "[client / consultant]"}`, team: `leading ${v || "a team of [N]"}` }[d];
}

export const PAREN_DIMS = ["floors", "area", "system", "capacity"];

export const EN_WEAK_LEAD = /^(?:i\s+(?:was|am)\s+)?(?:responsible\s+(?:for|of|about)|in\s+charge\s+of|tasked\s+with|duties\s+(?:included|include)|involved\s+in|participat(?:ed|ing)\s+in|work(?:ed|ing)\s+(?:on|in|with|as)|dealing\s+with|(?:helped|assisted|supported)(?:\s+(?:the\s+)?(?:senior|site|project|planning|technical|resident)?\s*(?:engineers?|manager|team|supervisor|pm))?\s*(?:in|with|on|to)?)\s*/i;

export const AR_WEAK_LEAD = /^(?:كنت\s+)?(?:مسؤول(?:ة)?\s+عن|مسئول(?:ة)?\s+عن|المسؤول عن|قمت\s+ب(?:ـ)?|المشاركة في|شاركت في|المساعدة في|ساعدت(?:\s+[ء-ي]+){0,2}\s+في|العمل على|العمل في)\s*/;

export const EN_WEAK_VERBS = /^(?:followed|helped|assisted|worked|participated|handled|dealt|did|made|was|attended|involved)$/i;

export const EN_PAST_SET = new Set(Object.values(EN_GERUND_PAST).map((v) => v.split(" ")[0].toLowerCase()));

export const fixWords = (s?: any) => s.replace(/[A-Za-z]+/g, (w) => { const f = EN_MISSPELL[w.toLowerCase()]; return f && f.toLowerCase() === w.toLowerCase() ? w : f || w; });

// «… and preparing …» → «… and prepared …» · «… وإعداد …» → «… وأعددت …»
// (Arabic: only a masdar that opens a new clause — followed by its own object, not «بين الموقع والتصميم» where it is a noun)
export const conjToPast = (s?: any, ar?: any) => (ar ? s.replace(/(^|\s)و(ال)?([ء-يّ]+)(?=\s+[ء-يA-Za-z])/g, (m0, sp, al, w, off, all) => { if (/بين\s+(?:\S+\s+){0,3}$/.test(all.slice(0, off))) return m0; const p = AR_MASDAR_PAST[(al || "") + w] || AR_MASDAR_PAST[w]; return p ? `${sp}و${p}` : m0; }) : s.replace(/\b(and|&)\s+([a-z]+ing)\b/gi, (m0, c, g) => (EN_GERUND_PAST[g.toLowerCase()] ? `${c} ${EN_GERUND_PAST[g.toLowerCase()].toLowerCase()}` : m0)));

// the bullet without its weak opener; its own leading verb (past tense) when it had one
export function splitBullet(text?: any, ar?: any) {
  let t = String(text || "").trim().replace(/[.。;؛]+$/, ""); let verb = null;
  if (!ar) {
    t = t.replace(EN_WEAK_LEAD, "");
    const fw = (t.split(/\s+/)[0] || "").replace(/[,;:]$/, ""); const lw = fw.toLowerCase();
    const past = EN_GERUND_PAST[lw] || (CV_ACTION_EN.test(fw) || EN_PAST_SET.has(lw) ? fw.charAt(0).toUpperCase() + fw.slice(1).toLowerCase() : null);
    if (past) { t = t.slice(fw.length).trim(); verb = EN_WEAK_VERBS.test(past) ? null : past; const m2 = /^(?:and|&)\s+([a-z]+)\b\s*/i.exec(t); if (m2 && (CV_ACTION_EN.test(m2[1]) || EN_GERUND_PAST[m2[1].toLowerCase()])) { t = t.slice(m2[0].length); verb = verb ? `${verb} and ${(EN_GERUND_PAST[m2[1].toLowerCase()] || m2[1]).toLowerCase()}` : verb; } }
    t = fixWords(conjToPast(t.replace(/^(?:the|a|an)\s+/i, ""), false));
  } else {
    t = t.replace(AR_WEAK_LEAD, "");
    const m = /^([ء-يّ]+)\s*/.exec(t); const w = m ? m[1] : ""; const past = AR_MASDAR_PAST[w] || AR_MASDAR_PAST["ال" + w] || (CV_ACTION_AR.test(w) && !/^(?:إ|ا)/.test(w) ? w : null);
    if (past) { t = t.slice(m[0].length); verb = past; }
    t = conjToPast(t.replace(/^(?:على|علي)\s+/, ""), true);
  }
  return { obj: t.trim(), verb };
}

// an object is reusable when it is a clean noun phrase (no stray gerund, not too long)
export const cleanObject = (o?: any, ar?: any) => { const w = o.split(/\s+/).filter(Boolean); if (w.length < 2 || w.length > 24) return false; if (ar) return !/^(?:في|مع|من)\s/.test(o); return !w.some((x) => /ing$/i.test(x) && EN_GERUND_PAST[x.toLowerCase()]) && !/^(?:in|with|on|for|of)$/i.test(w[0]); };

// lines that are not work (a skills or languages list that slipped under a role) are never rewritten
export const notWork = (t?: any) => (t.match(/[·|•]/g) || []).length >= 2 || (CV_LANG_NAMES.some(([, re]: any) => re.test(t)) && CV_LANG_LEVEL.test(t) && t.split(/\s+/).length <= 12) || t.split(/\s+/).length < 4;

export function rewriteEng(b?: any, role?: any, cvCtx?: any) {
  const t = String(b.text || "").trim(); if (notWork(t)) return null;
  const ar = (t.match(/[ء-ي]/g) || []).length > (t.match(/[A-Za-z]/g) || []).length * 0.6;
  const own = scopeOf(t); const hits = role.hit || {}; const sp = splitBullet(t, ar); const tasks = tasksOf(t.replace(ar ? AR_WEAK_LEAD : EN_WEAK_LEAD, "") || t); const task = tasks[0] || TASK_GENERIC; const DD = task.id === "design" ? DESIGN_BY_DISC[cvCtx.disc] : null; const L = DD ? { ...(ar ? task.ar : task.en), ...(ar ? DD.ar : DD.en) } : ar ? task.ar : task.en; const tDims = DD ? DD.dims : task.dims;
  const hasVerb = !b.weak && ((b.action || b.strong) || (!ar && sp.verb && !EN_WEAK_VERBS.test(sp.verb)) || (ar && !!sp.verb && CV_ACTION_AR.test(t)));
  const sized = ["area", "floors", "value", "count", "team", "capacity"].some((k) => own.dims.has(k));
  const tags: any = []; const clauses: any = []; let ph = 0; const MAXPH = hasVerb ? (sized ? 0 : 2) : sized ? 1 : 3;
  // a figure from elsewhere in the role is reused only when it describes the project (type, BUA, height, value, contract, system,
  // client, capacity) — never a quantity that belongs to another bullet (a pour's m³, a team, a count)
  const REUSE: any = { type: 1, floors: 1, value: 1, contract: 1, system: 1, client: 1, capacity: 1, area: /m²|m2|sqm|sq\.?\s?m|م²|م2|مربع|km|كم|feddan|فدان/i };
  const addDim = (d?: any) => { if (own.dims.has(d)) return null; const hv = hits[d]; const okR = REUSE[d] && (REUSE[d] === 1 || REUSE[d].test(hv || "")); const v = hv && okR && !t.includes(hv) ? hv : null; if (!v && ph >= MAXPH) return null; if (!v) ph++; return { d, v }; };
  let body;
  if (hasVerb) body = t.replace(/[.。;؛]+$/, ""); // a real verb already leads: keep the engineer's own words
  else {
    let obj = sp.obj; const verb = sp.verb || L.verb;
    if (!cleanObject(obj, ar) || (!sp.verb && tasks.length >= 2 && !/\d/.test(obj))) obj = tasks.length >= 2 ? (ar ? `${tasks[0].ar.obj} و${tasks[1].ar.obj}` : `${tasks[0].en.obj} and ${tasks[1].en.obj}`) : L.obj || obj;
    if (!obj) obj = ar ? "[ما أنجزته]" : "[what you delivered]";
    if (task.count && !/\d/.test(obj)) { obj = ar ? `[العدد] من ${obj}` : `[N] ${obj.replace(/^(?:the|a|an)\s+/i, "")}`; ph++; }
    body = `${sp.verb ? verb : L.verb} ${obj}`; tags.push("verb");
  }
  const ds = tDims.map(addDim).filter(Boolean); const typeD = ds.find((x) => x.d === "type"); const paren = ds.filter((x) => PAREN_DIMS.includes(x.d)); const rest = ds.filter((x) => !PAREN_DIMS.includes(x.d) && x.d !== "type");
  if (typeD) clauses.push(dimPhrase("type", typeD.v, ar)); if (paren.length) clauses.push(`(${paren.map((x) => dimPhrase(x.d, x.v, ar)).join(ar ? "، " : ", ")})`); rest.forEach((x) => clauses.push(dimPhrase(x.d, x.v, ar)));
  if (task.team && !own.dims.has("team")) { const x = addDim("team"); if (x) clauses.push((ar ? "، " : ", ") + dimPhrase("team", x.v, ar)); }
  if (ds.length) tags.push("scope");
  const toolIn = CV_TOOLS.some((x) => x.re.test(t)); const codeIn = ENG_CODES.some(([, re]: any) => re.test(t)); const tool = cvCtx.tools[task.id === "survey" ? "survey" : "main"];
  if (task.tool && !toolIn && tool) { clauses.push(ar ? `باستخدام ${tool}` : `using ${tool}`); tags.push("tool"); }
  if (task.code && !codeIn && cvCtx.codes.length) { clauses.push(ar ? `وفق ${cvCtx.codes.slice(0, 2).join(" و")}` : `per ${cvCtx.codes.slice(0, 2).join(" and ")}`); tags.push("code"); }
  const needResult = !own.dims.has("result"); if (needResult) tags.push("result");
  let out = body + (clauses.length ? " " + clauses.join(" ").replace(/\s+,/g, ",").replace(/\s+،/g, "،") : "");
  out += needResult ? (ar ? `، ${L.result}` : `, ${L.result}`) : ""; out = out.replace(/\s{2,}/g, " ").replace(/،\s*،/g, "،").trim() + ".";
  if (!ar) out = out.charAt(0).toUpperCase() + out.slice(1);
  if (out.replace(/[.\s]/g, "") === t.replace(/[.\s]/g, "")) return null;
  return { before: t, after: out, task: task.id, tags, ar, kept: hasVerb, placeholders: (out.match(/\[[^\]]+\]/g) || []).length };
}


// ---- portfolio & project presentation: per-track advice + a project sheet template in the CV's language ----
export const PORTFOLIO_TIPS = {
  site: [L2("صور تقدم الأعمال مرتبة زمنيًا لكل مرحلة (هيكل، واجهات، تشطيبات) مع تاريخ ونسبة إنجاز — بعد إذن الشركة.", "Dated progress photos per stage (frame, envelope, finishes) with % complete — with the employer's permission."), L2("بيان طريقة تنفيذ واحد كتبته (مع حذف اسم المشروع إن كان سريًا) يثبت مستواك الفني.", "One method statement you wrote (project name redacted if confidential) proves your technical level."), L2("منحنى S أو Look-ahead من مشروعك يظهر أنك تدير الزمن لا تتابعه فقط.", "An S-curve or look-ahead from your project shows you manage time, not just follow it.")],
  tech: [L2("لوحتان تنفيذيتان من إعدادك (Shop drawings) — واحدة إنشائية وواحدة معمارية أو MEP — مع حذف بيانات العميل.", "Two shop drawings you produced — one structural, one architectural or MEP — client data removed."), L2("مستخلص نموذجي أو جدول حصر مختصر (بأرقام مموّهة) يثبت أنك تعرف بنود الـ BOQ وطريقة القياس.", "A sample IPC or condensed take-off (figures masked) proves you know the BOQ and the measurement method."), L2("سجل RFIs/Submittals يوضح العدد وزمن الإغلاق.", "An RFI / submittal log showing volume and closing time.")],
  design: [L2("مقتطف من مذكرة حسابية (صفحتان): معايير التصميم، الأحمال، والكود — ويكفي عنصر واحد مصمم بالكامل.", "A two-page extract of a calculation note: design criteria, loads and code — one fully designed element is enough."), L2("لقطات من النموذج التحليلي (ETABS/SAFE أو Revit) مع النتائج الرئيسية: الإزاحات، الترخيم، نسب الاستغلال.", "Screenshots of the analytical model (ETABS/SAFE or Revit) with key results: drifts, deflections, utilisation ratios."), L2("لوحة تسليح أو تفصيلة واحدة نظيفة أفضل من عشر لوحات عامة.", "One clean reinforcement drawing or detail beats ten generic sheets.")],
  supervision: [L2("نموذج ITP أو قائمة استلام أعدتها، ومثال على NCR أغلقته بالإجراء التصحيحي.", "An ITP or inspection checklist you prepared, and one NCR you closed with its corrective action."), L2("ملخص مشروع يوضح دورك في اعتماد المواد والاستلامات وعدد الطلبات التي راجعتها.", "A project summary showing your role in material approvals and inspections, with the number of requests you reviewed.")],
  planning: [L2("مقتطف من البرنامج الزمني (WBS والمسار الحرج) بصيغة PDF مع حذف الأسماء.", "A redacted programme extract (WBS and critical path) as PDF."), L2("لوحة متابعة (S-curve، SPI/CPI) من Power BI أو Excel توضح كيف تكتشف التأخير مبكرًا.", "A Power BI or Excel dashboard (S-curve, SPI/CPI) showing how you catch slippage early."), L2("ملخص تحليل تأخير (TIA) واحد ونتيجته إن وُجد.", "One time-impact-analysis summary and its outcome, if you have one.")],
  contracts: [L2("مقارنة عطاءات أو تحليل سعر بند (بأرقام مموّهة).", "A tender comparison or a rate build-up (figures masked)."), L2("ملخص أمر تغيير: السبب، البند التعاقدي في FIDIC، والقيمة المستردة.", "A variation-order summary: cause, FIDIC clause relied on, value recovered."), L2("نموذج مستخلص يوضح طريقة القياس (POMI / CESMM) والمراجعة.", "A sample IPC showing the measurement method (POMI / CESMM) and review.")],
  qa: [L2("خطة جودة أو ITP أعددتها، وإحصائية NCRs المفتوحة والمغلقة.", "A quality plan or ITP you prepared, with open vs. closed NCR statistics."), L2("تقرير تدقيق داخلي واحد (بعد حذف الأسماء) يثبت منهجيتك.", "One internal audit report (names removed) that shows your method.")],
  bim: [L2("فيديو قصير (60–90 ثانية) للنموذج الموحّد أو صور بمستويات LOD مختلفة.", "A 60–90 second walkthrough of the federated model, or views at different LODs."), L2("تقرير تعارضات Navisworks: العدد قبل وبعد، وكيف رتّبت الأولويات.", "A Navisworks clash report: counts before and after, and how you prioritised."), L2("عائلة Revit بارامترية أو سكريبت Dynamo صممته — مع لقطة للنتيجة.", "A parametric Revit family or Dynamo script you built — with a screenshot of the result.")],
  gis: [L2("خريطتان أو ثلاث بمقياس ومفتاح واضحين، وقاعدة بيانات مكانية مختصرة.", "Two or three maps with clear scale and legend, and a small geodatabase schema."), L2("سكريبت Python أو ModelBuilder أتمتَ به مهمة متكررة.", "A Python or ModelBuilder script that automated a repeated task.")],
  pm: [L2("ملف مشروع من صفحة واحدة لكل مشروع رئيسي: القيمة، المدة، الفريق، العقد، والنتيجة مقابل الخطة.", "A one-page case sheet per key project: value, duration, team, contract and outcome vs. plan."), L2("لوحة متابعة شهرية مختصرة (تكلفة، زمن، مخاطر) كما قدّمتها للإدارة.", "A condensed monthly dashboard (cost, time, risk) as you reported it to management.")],
};

export const PORTFOLIO_GENERAL = [
  L2("احتفظ بالسيرة نفسها نظيفة للـ ATS (نص فقط)، وضع الصور والرسومات في ملف مشاريع منفصل (Project List / Portfolio).", "Keep the CV itself ATS-clean (text only); put images and drawings in a separate project list / portfolio file."),
  L2("ملف المشاريع PDF واحد، 8–15 صفحة، أقل من 10 ميجابايت، وباسم واضح: Firstname-Lastname-Portfolio.pdf.", "One portfolio PDF, 8–15 pages, under 10 MB, named clearly: Firstname-Lastname-Portfolio.pdf."),
  L2("احذف ما هو سري: أسماء العملاء غير المعلنة، الأسعار، والشعارات — واكتب «مشروع سكني 32,000 م² — القاهرة الجديدة» بدلًا منها.", "Remove anything confidential — unannounced client names, prices, logos — and write «32,000 m² residential project — New Cairo» instead."),
  L2("ضع رابط الملف في رأس السيرة وفي قسم Featured على LinkedIn، بصلاحية «أي شخص معه الرابط».", "Link it in the CV header and in LinkedIn Featured, shared as «anyone with the link»."),
  L2("رتّب المشاريع من الأكبر والأقرب للوظيفة، وليس زمنيًا.", "Order projects by size and relevance to the job, not by date."),
];

export const projectSheet = (ar?: any) => ar ? ["بطاقة مشروع — [اسم المشروع]", "الموقع: [المدينة] · المدة: [من – إلى]", "المالك: [ ] · الاستشاري: [ ] · المقاول الرئيسي: [ ]", "العقد: [فيديك الكتاب الأحمر / مقطوعية] · القيمة: [القيمة] مليون جنيه", "الحجم: [المساحة] م² مسطحات · [عدد الأدوار] · [النظام الإنشائي / نظام الـ MEP]", "دوري: [المسمّى] — [النطاق الذي كنت مسؤولًا عنه]", "الأدوات والأكواد: [Revit، Navisworks · الكود المصري 203، ACI 318]", "النتيجة: [نتيجة بالرقم: نسبة، أيام، قيمة]"].join("\n")
  : ["PROJECT SHEET — [Project name]", "Location: [city] · Duration: [MMM YYYY – MMM YYYY]", "Client: [ ] · Consultant: [ ] · Main contractor: [ ]", "Contract: [FIDIC Red Book / lump sum] · Value: EGP [X]M", "Size: [X] m² BUA · [G+N] · [structural / MEP system]", "My role: [title] — [scope I owned]", "Tools & codes: [Revit, Navisworks · ECP 203, ACI 318]", "Result: [measurable outcome: %, days, EGP]"].join("\n");

export const SHEET_FIELDS = ["type", "area", "floors", "value", "contract", "system", "capacity", "client", "team", "result"];

export const TYPE_AR_PL = { "سكني": "سكنية", "إداري وتجاري": "إدارية وتجارية", "أبراج": "أبراج", "فنادق": "فندقية", "مستشفيات": "صحية", "تعليمي": "تعليمية", "صناعي": "صناعية", "بنية تحتية": "بنية تحتية", "مياه ومحطات": "مياه وصرف", "طاقة": "طاقة", "بترول وغاز": "بترول وغاز", "حكومي وعمراني": "حكومية" };

// a credential named only as a preparation course («PMP (تحضيري)», «PMP prep course», «in progress») is not the credential yet
export const CRED_PREP = /prep(?:aration|aratory)?\b|تحضير|تحضيري|in progress|candidate|course\b|studying|جار(?:ٍ|ي) |قيد (?:الإعداد|الدراسة)|دورة/i;


// ---- the engineering summary, drafted from facts in the CV (brackets where a fact is missing) ----
export const bigOf = (xs?: any) => { let best = null, bv = -1; xs.filter(Boolean).forEach((s) => { const n = parseFloat(String(String(s).replace(/[,٬\s]/g, "").match(/\d+(?:\.\d+)?/) || [0])); if (n > bv) { bv = n; best = s; } }); return best; };

export function draftEngSummary(cv?: any, a?: any) {
  const ar = cv.lang === "ar"; const y = Math.floor(cv.years || 0); const types = [...new Set(cv.projectTypes as string[])].slice(0, 2);
  const area = bigOf(a.roles.map((r) => r.hit.area)); const value = bigOf(a.roles.map((r) => r.hit.value));
  const advT = a.software.filter((x) => x.level === "advanced").slice(0, 3).map((x) => x.name); const useT = a.software.filter((x) => x.level === "applied").slice(0, Math.max(0, 3 - advT.length)).map((x) => x.name);
  const terms = a.terms.filter((x) => x.present).slice(0, 3).map((x) => (ar ? x.label.ar : x.label.en.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())));
  const codes = a.codes.filter((x) => x.state !== "missing" && x.name !== "Egyptian Code").slice(0, 2).map((x) => x.name);
  const creds = a.creds.filter((x) => x.relevant && x.present).map((x) => x.name).slice(0, 2);
  const title = ar ? `${cv.disciplineLabel} — ${trackLabel(a.target, a.disc)}` : `${TITLE_EN[a.disc] || "Civil Engineer"} — ${a.target === "design" ? TRACK_DESIGN_EN[a.disc] || "Design" : TRACK_EN[a.target]}`;
  if (ar) return `${title}${y ? ` بخبرة ${y}+ سنوات` : a.fresh ? " حديث التخرج" : " بخبرة [العدد]+ سنوات"}${types.length ? ` في مشاريع ${types.map((x) => TYPE_AR_PL[x] || x).join(" و")}` : ""}${area || value ? ` حتى ${[area, value].filter(Boolean).join(" و")}` : " [أكبر مشروع: المساحة م² / القيمة]"}. ${terms.length ? `نطاق العمل: ${terms.join("، ")}` : "[مسؤولياتك الأساسية في المسار]"}${advT.length ? `، بإتقان ${advT.join(" و")}` : ""}${useT.length ? `${advT.length ? " واستخدام" : "، باستخدام"} ${useT.join(" و")}` : ""}${codes.length ? ` وفق ${codes.join(" و")}` : ""}. ${creds.length ? creds.join(" · ") + " · " : ""}${a.syndicate ? "عضو نقابة المهندسين." : "[عضوية نقابة المهندسين ورقم القيد]."}`;
  return `${title} with ${y ? `${y}+ years` : a.fresh ? "a fresh degree" : "[N]+ years"} on ${types.length ? types.map((x) => TYPE_EN[x] || x).join(" and ") : "[residential / commercial]"} projects${area || value ? ` up to ${[area, value].filter(Boolean).join(" and ")}` : " [largest project: m² BUA / EGP value]"}. ${terms.length ? `Core scope: ${terms.length > 1 ? terms.slice(0, -1).join(", ") + " and " + terms[terms.length - 1] : terms[0]}` : "[your core responsibilities in this track]"}${advT.length ? `; advanced in ${advT.join(", ")}` : ""}${useT.length ? `${advT.length ? " and hands-on with" : "; hands-on with"} ${useT.join(", ")}` : ""}${codes.length ? `, working to ${codes.join(" and ")}` : ""}. ${creds.length ? creds.join(" · ") + " · " : ""}${a.syndicate ? "Member of the Egyptian Engineers Syndicate." : "[Engineers Syndicate membership and number]."}`;
}


// ---- the audit ----
export const r5 = (n?: any) => Math.round(n * 2) / 2;

export function auditCV(rawText?: any, ctx: any = {}) {
  const layout = ctx.layout || { pages: 1, images: 0, columns: false, tables: 0, type: "txt", glyphs: 0 };
  const wordsN = wordsOf(String(rawText || "")).length;
  if (ctx.scanned || (!wordsN && layout.images > 0)) return { empty: true, scanned: true, overall: 0, layout, critical: [{ sev: "critical", id: "scanned", title: L2("الملف صورة لا نص", "The file is an image, not text"), why: L2("لا يستطيع أي نظام ATS قراءة سيرة ممسوحة ضوئيًا أو مصدّرة كصورة — ستُرفض آليًا قبل أن يراها أحد.", "No ATS can read a scanned or image-exported CV — it is rejected automatically before a person sees it."), fix: [L2("افتح الملف الأصلي في Word أو Google Docs.", "Open the original file in Word or Google Docs."), L2("احفظ باسم ← PDF (وليس «طباعة» من صورة).", "Save As → PDF (not «print» from an image)."), L2("تأكد أنك تستطيع تحديد النص بالفأرة داخل الـ PDF.", "Check you can select the text with the mouse inside the PDF.")] }], high: [], words: 0 };
  if (wordsN < 40) return { empty: true, scanned: false, overall: 0, layout, critical: [{ sev: "critical", id: "short", title: L2("النص قصير جدًا", "Too little text"), why: L2("أقل من 40 كلمة — لا يكفي لتقييم سيرة هندسية.", "Under 40 words — not enough to audit an engineering CV."), fix: [L2("ارفع الملف كاملًا (PDF أو Word) أو الصق نص السيرة كله.", "Upload the full file (PDF or Word) or paste the whole CV text.")] }], high: [], words: wordsN };
  const cv = ctx.cv || parseCV(rawText, { lines: ctx.lines, profile: ctx.profile }); const text = cv.text; const lang = cv.lang;
  const disc = ctx.disc && tracksFor(ctx.disc).length ? ctx.disc : cv.discipline;
  const allowed = tracksFor(disc).map((t) => t[0]); const sig = trackShares(cv, disc);
  const detected = sig.top && allowed.includes(sig.top) && sig.total >= 1.5 ? sig.top : allowed.includes(cv.track) ? cv.track : sig.top && allowed.includes(sig.top) ? sig.top : allowed[0];
  const target = ctx.track && allowed.includes(ctx.track) ? ctx.track : detected; const kb = kbFor(disc, target);
  const years = cv.years || 0; const realRoles = cv.experience.filter((e) => !e.intern); const fresh = !realRoles.length ? years < 1 : realRoles.every((e) => e.start) && years < 1;
  const secLines = (id?: any) => (cv.sections[id] ? cv.sections[id].lines : []); const expText = cv.experience.flatMap((e) => [...e.headerLines, ...e.bullets.map((b) => b.text)]).join("\n"); const projText = [...secLines("projects"), ...cv.education.map((e) => e.gradProject).filter(Boolean)].join("\n");
  const issues: any = []; const issue = (sev?: any, id?: any, title?: any, why?: any, fix?: any, ex?: any) => issues.push({ sev, id, title, why, fix: fix || [], ex });
  const P = Object.fromEntries(PILLARS.map(([id, max, label, desc]: any) => [id, { id, max, label, desc, checks: [] }]));
  const check = (pid?: any, id?: any, label?: any, pts?: any, max?: any, detail?: any, fix?: any) => { const v = r5(Math.max(0, Math.min(max, pts))); P[pid].checks.push({ id, label, pts: v, max, status: v >= max * 0.85 ? "pass" : v >= max * 0.4 ? "partial" : "fail", detail, fix }); };
  const TL = trackL2(target, disc); const tlA = TL.ar, tlE = TL.en;

  // ===== 1 · software & BIM (22) =====
  const software: any = [...kb.core.map((n) => ({ ...toolEvidence(cv, n), tier: "core" })), ...kb.adv.map((n) => ({ ...toolEvidence(cv, n), tier: "adv" }))];
  const core = software.filter((x) => x.tier === "core"); const coreMissing = core.filter((x) => x.level === "missing");
  const coreW = core.length ? core.reduce((a, x) => a + (fresh && x.level === "listed" ? 0.6 : LEVEL_W[x.level]), 0) / core.length : 1;
  check("software", "core", L2(`أدوات ${tlA} الأساسية`, `Core ${tlE} tools`), 10 * coreW, 10, L2(`الموجود ${core.length - coreMissing.length} من ${core.length}: ${core.map((x) => `${x.name} (${LEVEL_L[x.level].ar})`).join("، ")}`, `${core.length - coreMissing.length} of ${core.length}: ${core.map((x) => `${x.name} (${LEVEL_L[x.level].en.toLowerCase()})`).join(", ")}`), coreMissing.length ? L2(`أضف ${coreMissing.map((x) => x.name).join(" و")} إن كنت تستخدمها فعلًا — واذكر كلًا منها داخل بند خبرة، لا في القائمة فقط.`, `Add ${coreMissing.map((x) => x.name).join(" and ")} if you really use them — and name each inside an experience bullet, not only in the list.`) : null);
  const advN = software.filter((x) => x.level === "advanced").length; const needAdv = fresh || years < 3 ? 1 : years < 8 ? 2 : 3;
  check("software", "depth", L2("عمق الاستخدام: نمذجة وتحليل وتنسيق", "Depth: modelling, analysis, coordination"), 6 * Math.min(1, advN / needAdv), 6, L2(`أدوات بدليل استخدام متقدم: ${advN} (المطلوب لمستواك: ${needAdv})`, `${advN} tool(s) with evidence of advanced use (expected at your level: ${needAdv})`), advN < needAdv ? L2("اكتب ما فعلته بالأداة لا اسمها فقط: «نمذجة LOD 350 وعائلات بارامترية على Revit»، «تحليل زلزالي Response Spectrum على ETABS»، «Baseline وEVM على P6».", "Write what you did with the tool, not just its name: «LOD 350 modelling and parametric families in Revit», «response-spectrum seismic analysis in ETABS», «baseline and EVM in P6».") : null);
  const draftingOnly = !fresh && ["tech", "design", "bim"].includes(target) && !software.some((x) => !["AutoCAD", "Excel", "Microsoft Office"].includes(x.name) && ["advanced", "applied"].includes(x.level));
  if (draftingOnly) issue("high", "drafting", L2("مستوى رسم فقط — لا نمذجة ولا تحليل", "Drafting level only — no modelling or analysis"), L2(`لمسار ${tlA} تتوقع الشركات الكبرى نمذجة أو تحليلًا فعليًا؛ AutoCAD وExcel وحدهما يضعانك في فئة الرسّام.`, `For ${tlE}, top firms expect real modelling or analysis; AutoCAD and Excel alone read as a draughtsman.`), [L2(`أضف أداة ${kb.core.filter((n) => !["AutoCAD", "Excel"].includes(n))[0] || "Revit"} مع ما أنجزته بها في بند خبرة.`, `Add ${kb.core.filter((n) => !["AutoCAD", "Excel"].includes(n))[0] || "Revit"} with what you delivered in it, inside an experience bullet.`)]);
  const present = software.filter((x) => x.level !== "missing"); const inWork = present.filter((x) => x.inExp || x.level === "advanced" || x.level === "applied").length;
  check("software", "proof", L2("الأدوات مثبتة داخل الخبرات", "Tools proven inside experience"), present.length ? 4 * inWork / present.length : 0, 4, L2(`أدوات مذكورة داخل بنود الخبرة أو المشاريع: ${inWork} من ${present.length}`, `${inWork} of ${present.length} tools appear inside experience or project bullets`), inWork < present.length ? L2("الأداة المذكورة في قائمة المهارات فقط لا تقنع المقابل — اربط كل أداة بمشروع وناتج.", "A tool that appears only in the skills list convinces nobody — tie each tool to a project and an output.") : null);
  const grouped = cv.sections.skills && /[·|•:]/.test(secLines("skills").join(" ")); const nTools = cv.tools.length;
  check("software", "present", L2("عرض المهارات", "Skills presentation"), (cv.ratingBars ? 0 : 1) + (grouped ? 0.5 : 0) + (nTools >= 5 && nTools <= 22 ? 0.5 : 0), 2, cv.ratingBars ? L2("شرائط تقييم أو نسب مئوية للمهارات — لا يقرؤها الـ ATS وتبدو ذاتية.", "Rating bars or percentages on skills — ATS can't read them and they look self-graded.") : L2(`عدد الأدوات: ${nTools}${grouped ? "، مجمّعة في فئات" : "، في قائمة واحدة"}`, `${nTools} tools${grouped ? ", grouped by category" : ", in one flat list"}`), !grouped || cv.ratingBars ? L2("قسّم: برامج التصميم · BIM · التخطيط · المكتبية — بلا نجوم أو نسب.", "Group them: design · BIM · planning · office — no stars or percentages.") : null);
  if (core.length && coreMissing.length / core.length >= 0.5) issue("critical", "core", L2(`أدوات ${tlA} الأساسية غائبة`, `Core ${tlE} tools are missing`), L2(`الفرز الآلي لوظائف ${tlA} يبحث عن ${kb.core.join(" و")} بالاسم — السيرة لا تذكر ${coreMissing.map((x) => x.name).join(" و")}، فتسقط قبل القراءة.`, `Screening for ${tlE} roles searches for ${kb.core.join(", ")} by name — the CV never mentions ${coreMissing.map((x) => x.name).join(", ")}, so it drops out before anyone reads it.`), [L2(`اذكر ${coreMissing.map((x) => x.name).join(" و")} في قسم المهارات وفي بند خبرة واحد على الأقل لكل منها.`, `Name ${coreMissing.map((x) => x.name).join(", ")} in Skills and in at least one experience bullet each.`), L2("إن لم تكن تجيدها بعد: دورة قصيرة معتمدة ثم مشروع تطبيقي تذكره كمشروع.", "If you don't use them yet: a short certified course, then an applied project you can list.")]);

  // ===== 2 · project scope & impact (28) =====
  const pool = fresh || !realRoles.length ? cv.experience : realRoles;
  const roles = pool.map((e) => { const s = scopeOf([...e.headerLines, ...e.bullets.map((b) => b.text)].join("\n")); return { e, dims: s.dims, hit: s.hit, types: s.types }; });
  if (fresh) cv.education.filter((x) => x.gradProject).forEach((x) => { const s = scopeOf(x.gradProject); roles.push({ e: { title: lang === "ar" ? "مشروع التخرج" : "Graduation project", company: "", headerLines: [x.gradProject], bullets: [], grad: true }, dims: s.dims, hit: s.hit, types: s.types }); });
  const needD = kb.dims; const tgtN = Math.min(fresh ? 3 : 4, needD.length);
  const cover = (r?: any) => Math.min(1, needD.filter((d) => r.dims.has(d)).length / tgtN);
  const wts = roles.map((_, i) => (i === 0 ? 2 : i === 1 ? 1.5 : 1)); const wsum = wts.reduce((a, b) => a + b, 0) || 1;
  const covAvg = roles.length ? roles.reduce((a, r, i) => a + cover(r) * wts[i], 0) / wsum : 0;
  check("scope", "roles", L2("حجم كل مشروع في كل وظيفة", "Project scope in every role"), 12 * covAvg, 12, L2(roles.length ? roles.slice(0, 4).map((r) => `${(r.e.title || "—").slice(0, 34)}: ${needD.filter((d) => r.dims.has(d)).map((d) => DIMS[d].ar.split(" (")[0]).join("، ") || "لا أبعاد"}`).join(" · ") : "لا وظائف قابلة للقراءة", roles.length ? roles.slice(0, 4).map((r) => `${(r.e.title || "—").slice(0, 34)}: ${needD.filter((d) => r.dims.has(d)).map((d) => DIMS[d].en.split(" (")[0].toLowerCase()).join(", ") || "no scope"}`).join(" · ") : "No readable roles"), L2(`لكل وظيفة: ${needD.slice(0, 5).map((d) => DIMS[d].ar.split(" (")[0]).join("، ")} — في أول بند.`, `For every role: ${needD.slice(0, 5).map((d) => DIMS[d].en.split(" (")[0].toLowerCase()).join(", ")} — in the first bullet.`));
  const bullets = pool.flatMap((e) => e.bullets); const bScope = bullets.map((b) => ({ b, s: scopeOf(b.text) }));
  const quant = bScope.filter((x) => anyScope(x.s) || x.b.quantified).length; const qR = bullets.length ? quant / bullets.length : 0;
  check("scope", "quant", L2("بنود بأرقام", "Bullets with numbers"), 8 * Math.min(1, qR / 0.5), 8, L2(`بنود فيها رقم: ${quant} من ${bullets.length} (المطلوب: النصف على الأقل)`, `${quant} of ${bullets.length} bullets carry a figure (target: at least half)`), qR < 0.5 ? L2("أضف لكل بند ممكن: م²، قيمة بالجنيه، عدد اللوحات أو المستخلصات، حجم الفريق، أو نسبة أو أيام.", "Give every bullet you can a figure: m², EGP value, drawings or IPCs count, team size, a % or days.") : null);
  const act = bullets.filter((b) => (b.action || b.strong) && !b.weak).length; const res = bScope.filter((x) => x.s.dims.has("result")).length; const weakN = bullets.filter((b) => b.weak).length;
  check("scope", "impact", L2("لغة إنجاز لا وصف مهام", "Impact language, not duties"), 2.5 * Math.min(1, (bullets.length ? act / bullets.length : 0) / 0.8) + 2.5 * Math.min(1, (bullets.length ? res / bullets.length : 0) / 0.3), 5, L2(`بنود تبدأ بفعل إنجاز: ${act} · بنود بنتيجة قابلة للقياس: ${res} · بنود تبدأ بـ «مسؤول عن / Responsible for»: ${weakN}`, `${act} bullets open with an action verb · ${res} state a measurable result · ${weakN} open with «responsible for»`), L2("ابدأ بفعل (أشرفت، أعددت، صممت، خفّضت) واختم بنتيجة (%، أيام، توفير، اعتماد من أول مرة).", "Open with a verb (Supervised, Prepared, Designed, Reduced) and close with a result (%, days, savings, first-time approval)."));
  const named = roles.filter((r) => r.types.length || /(project|مشروع)/i.test([...r.e.headerLines, ...r.e.bullets.map((b) => b.text)].join(" "))).length;
  check("scope", "projects", L2("المشاريع مسمّاة ومصنّفة", "Projects named and typed"), cv.sections.projects ? 3 : 3 * Math.min(1, named / Math.max(1, Math.ceil(roles.length / 2))), 3, L2(cv.sections.projects ? "قسم «المشاريع» موجود" : `وظائف تذكر المشروع ونوعه: ${named} من ${roles.length}`, cv.sections.projects ? "A Projects section is present" : `${named} of ${roles.length} roles name the project and its type`), !cv.sections.projects ? L2("اسم المشروع ونوعه في سطر الوظيفة: «برج إداري 32,000 م² — العاصمة الإدارية».", "Name and type the project in the role line: «32,000 m² office tower — New Capital».") : null);
  if (bullets.length >= 2 && quant === 0) issue("critical", "nometrics", L2("قائمة مهام بلا حجم ولا أرقام", "A task list with no scope or numbers"), L2("لا بند واحد يذكر مساحة أو قيمة أو عددًا أو نسبة — المسؤول لا يستطيع التفريق بينك وبين 200 سيرة لنفس المسمّى.", "Not one bullet states an area, value, count or percentage — a screener can't tell you apart from 200 CVs with the same title."), [L2("لكل وظيفة: المشروع، المساحة بالمتر المربع، القيمة، نوع العقد، حجم الفريق.", "For every role: the project, BUA in m², value, contract type, team size."), L2("لو لا تملك الرقم الدقيق اكتب تقديرًا صادقًا («نحو 25 ألف م²»).", "If you lack the exact figure, write an honest estimate («approx. 25,000 m²»).")]);
  else if (roles[0] && !roles[0].e.grad && !anyScope({ dims: roles[0].dims })) issue("high", "latestscope", L2("آخر وظيفة بلا حجم مشروع", "Your latest role has no project scope"), L2("الوظيفة الأحدث هي أول ما يُقرأ — وهي بلا مساحة أو قيمة أو فريق.", "The latest role is read first — and it states no size, value or team."), [L2("أضف سطر المشروع: النوع، المساحة، القيمة، العقد — قبل البنود.", "Add a project line — type, BUA, value, contract — above the bullets.")]);
  if (bullets.length >= 3 && weakN / bullets.length >= 0.4) issue("high", "weak", L2("بنود تبدأ بـ «مسؤول عن»", "Bullets open with «responsible for»"), L2(`بنود تصف مهام لا إنجازًا: ${weakN} من ${bullets.length} — أول كلمتين في البند هما ما يقرؤه المسؤول.`, `${weakN} of ${bullets.length} bullets describe duties, not achievements — the first two words are what a screener reads.`), [L2("استبدلها بالصياغات المقترحة في قسم «إعادة كتابة البنود».", "Replace them with the rewrites in «Bullet rewrites».")]);

  // ===== 3 · career-track alignment (15) =====
  const share = sig.shares[target] || 0; const adj = (a?: any, b?: any) => (TRACK_ADJ[a] || []).includes(b) || (TRACK_ADJ[b] || []).includes(a);
  let clarity; if (target === detected) clarity = share >= 0.5 ? 6 : share >= 0.35 ? 4.5 : 3; else clarity = share >= 0.25 ? 3.5 : adj(target, detected) ? 2 : 0.5;
  const detL = trackL2(detected, disc);
  check("track", "clarity", L2("وضوح المسار", "Track clarity"), clarity, 6, L2(`دلائل السيرة التي تخص ${tlA}: ${Math.round(share * 100)}%${target !== detected ? ` — والأغلب يخص ${detL.ar} (${Math.round((sig.shares[detected] || 0) * 100)}%)` : ""}`, `${Math.round(share * 100)}% of the CV's signals point to ${tlE}${target !== detected ? ` — most point to ${detL.en} (${Math.round((sig.shares[detected] || 0) * 100)}%)` : ""}`), share < 0.5 ? L2(`اجعل عنوانك وملخصك وأول بندين في كل وظيفة عن ${tlA}، وقلّل ما لا يخدمه.`, `Make your headline, summary and the first two bullets of each role about ${tlE}; trim what doesn't serve it.`) : null);
  if (target !== detected && share < 0.25 && !fresh && sig.total >= 3) issue(adj(target, detected) ? "high" : "critical", "misaligned", L2(`السيرة تُقرأ كـ ${detL.ar} لا ${tlA}`, `The CV reads as ${detL.en}, not ${tlE}`), L2(`المسؤول عن وظيفة ${tlA} يبحث عن مسمّى ومهام ${tlA} في أول نظرة — سيرتك تقول ${detL.ar}، فتُستبعد رغم خبرتك.`, `A screener for a ${tlE} role looks for ${tlE} titles and tasks at first glance — your CV says ${detL.en}, so it is set aside despite your experience.`), [L2(`عنوان تحت الاسم يطابق الوظيفة: «${cv.disciplineLabel} — ${tlA}».`, `A headline under your name that matches the job: «${TITLE_EN[disc] || "Engineer"} — ${tlE}».`), L2(`أعد ترتيب البنود: مهام ${tlA} أولًا (${kb.terms.slice(0, 3).map((x) => TERM[x] ? TERM[x].label.ar : x).join("، ")}).`, `Reorder bullets: ${tlE} work first (${kb.terms.slice(0, 3).map((x) => (TERM[x] ? TERM[x].label.en : x)).join(", ")}).`), L2("إن كان انتقالًا حقيقيًا: اذكر المهام المشتركة التي أنجزتها بالفعل، ودورة أو شهادة في المسار الجديد.", "If it's a genuine switch: surface the overlapping work you already did, plus a course or certificate in the new track.")]);
  const latest = (realRoles[0] || cv.experience[0] || {}).title || ""; const sigRe = new RegExp(TRACK_SIG[target].source, "i");
  const tPts = (sigRe.test(latest) ? 2 : 0) + (cv.headline ? (sigRe.test(cv.headline) ? 1.5 : 0.5) : 0) + (!fresh || sigRe.test(latest) ? 0 : 0.5);
  check("track", "titles", L2("المسمّى والعنوان", "Titles and headline"), tPts, 4, L2(`آخر مسمّى: «${latest || "—"}» · العنوان: «${cv.headline || "لا يوجد"}»`, `Latest title: «${latest || "—"}» · headline: «${cv.headline || "none"}»`), tPts < 3.5 ? L2(`عنوان من 5–8 كلمات تحت الاسم يحمل تخصصك ومسار ${tlA} ومستواك.`, `A 5–8 word headline under your name with your discipline, ${tlE} and level.`) : null);
  const claimed = cv.seniority; const minY = (posYears(claimed) || [0])[0]; const overClaim = !fresh && ["senior", "lead", "section", "tom", "cm", "pm", "director"].includes(claimed) && years + 1 < minY;
  const yMis = cv.claimedYears && years && Math.abs(cv.claimedYears - years) >= 2;
  check("track", "seniority", L2("المستوى مقابل سنوات الخبرة", "Seniority vs. years"), 3 - (overClaim ? 2 : 0) - (yMis ? 1 : 0), 3, L2(`المستوى المقروء: ${posShort(claimed)} · الخبرة من التواريخ ≈ ${years} سنة${cv.claimedYears ? ` · الملخص يقول ${cv.claimedYears}` : ""}`, `Level read: ${POS_EN[claimed] || claimed} · years from dates ≈ ${years}${cv.claimedYears ? ` · summary claims ${cv.claimedYears}` : ""}`), overClaim || yMis ? L2("وحّد الرقم في الملخص مع التواريخ، واستخدم المسمّى الرسمي في العقد.", "Make the summary's years match the dates, and use the title on your contract.") : null);
  if (overClaim) issue("high", "overclaim", L2("مسمّى أعلى من سنوات الخبرة", "Title above your years"), L2(`«${posShort(claimed)}» بخبرة ≈ ${years} سنة يثير الشك في المقابلة الأولى.`, `«${POS_EN[claimed]}» with ≈ ${years} years raises doubt at first screening.`), [L2("استخدم المسمّى الرسمي، واذكر المسؤوليات الأعلى داخل البنود.", "Use the official title; show the bigger responsibilities inside the bullets.")]);
  if (yMis) issue("high", "years", L2("سنوات الخبرة متضاربة", "Years of experience don't add up"), L2(`الملخص يقول ${cv.claimedYears} والتواريخ تعطي ≈ ${years} — أول سؤال في المقابلة.`, `The summary says ${cv.claimedYears}; the dates give ≈ ${years} — the first interview question.`), [L2("رقم واحد في كل السيرة، يطابق التواريخ.", "One number across the CV, matching the dates.")]);
  const sumT = cv.summaryText || ""; const sPts = cv.summaryWords ? (sigRe.test(sumT) ? 1 : 0) + (/\d/.test(sumT) ? 1 : 0) : 0;
  check("track", "summary", L2("ملخص موجّه للمسار", "Summary aimed at the track"), sPts, 2, L2(cv.summaryWords ? `عدد الكلمات: ${cv.summaryWords} — ${sigRe.test(sumT) ? "يذكر المسار" : "لا يذكر المسار"}، ${/\d/.test(sumT) ? "وبأرقام" : "وبلا أرقام"}` : "لا ملخص مهني", cv.summaryWords ? `${cv.summaryWords} words — ${sigRe.test(sumT) ? "names the track" : "doesn't name the track"}, ${/\d/.test(sumT) ? "with figures" : "no figures"}` : "No professional summary"), L2("استخدم الملخص المقترح في قسم «إعادة الكتابة».", "Use the drafted summary in «Rewrites»."));
  if (!cv.summaryWords) issue("high", "nosummary", L2("لا ملخص مهني", "No professional summary"), L2("الملخص هو ما يُقرأ في أول 6 ثوانٍ — بدونه يُعتبر أول بند خبرة هو تعريفك.", "The summary is what gets read in the first 6 seconds — without it, your first bullet becomes your introduction."), [L2("3–4 أسطر: التخصص والمسار والسنوات، أكبر مشروع بالرقم، أقوى أداتين، والشهادة أو القيد.", "3–4 lines: discipline, track and years, largest project in figures, two strongest tools, credential or registration.")]);

  // ===== 4 · codes, standards & credentials (15) =====
  const codeState = (name?: any) => { const e = ENG_CODES.find((x) => x[0] === name); if (!e) return "missing"; if (e[1].test(expText) || e[1].test(projText)) return "applied"; return e[1].test(text) ? "listed" : "missing"; };
  const codes = [...new Set([...kb.codes, ...kb.contracts])].map((n) => ({ name: n, kind: (ENG_CODES.find((x) => x[0] === n) || [])[2] || "code", state: codeState(n), expected: true }));
  ENG_CODES.forEach(([n, re, kind]: any) => { if (!codes.some((c) => c.name === n) && re.test(text) && !(n === "Egyptian Code" && codes.some((c) => /^ECP/.test(c.name) && c.state !== "missing"))) codes.push({ name: n, kind, state: codeState(n), expected: false }); });
  const expCodes = codes.filter((c) => c.expected && c.kind === "code"); const cw = (s?: any) => (s === "applied" ? 1 : s === "listed" ? 0.6 : 0);
  const bestCodes = expCodes.map((c) => cw(c.state)).sort((a, b) => b - a).slice(0, Math.min(3, expCodes.length));
  const codePts = expCodes.length ? 6 * bestCodes.reduce((a, b) => a + b, 0) / Math.min(3, expCodes.length) : 6;
  check("codes", "codes", L2("الأكواد التصميمية والتنفيذية", "Design & construction codes"), codePts, 6, expCodes.length ? L2(expCodes.map((c) => `${c.name}: ${c.state === "applied" ? "مطبّق في الخبرة" : c.state === "listed" ? "مذكور" : "غير موجود"}`).join(" · "), expCodes.map((c) => `${c.name}: ${c.state === "applied" ? "applied in work" : c.state === "listed" ? "listed" : "missing"}`).join(" · ")) : L2("لا أكواد تصميم مطلوبة لهذا المسار", "No design codes required for this track"), expCodes.some((c) => c.state !== "applied") ? L2("اذكر الكود داخل البند الذي طبقته فيه: «صممت البلاطات وفق ECP 203 وACI 318»، لا في قائمة منفصلة فقط.", "Name the code inside the bullet where you applied it: «designed slabs to ECP 203 and ACI 318», not only in a list.") : null);
  if (target === "design" && expCodes.length && expCodes.every((c) => c.state === "missing")) issue("critical", "nocodes", L2("مهندس تصميم بلا أكواد", "A design engineer with no codes"), L2("سيرة تصميم لا تذكر كودًا واحدًا (ECP، ACI، ASHRAE، IEC…) تُقرأ كرسّام لا كمصمم.", "A design CV that names no code (ECP, ACI, ASHRAE, IEC…) reads as a draughtsman, not a designer."), [L2(`أضف ${expCodes.slice(0, 3).map((c) => c.name).join(" و")} في الملخص وفي بنود التصميم.`, `Add ${expCodes.slice(0, 3).map((c) => c.name).join(", ")} to the summary and the design bullets.`)]);
  const expStd = codes.filter((c) => c.expected && c.kind !== "code");
  check("codes", "contracts", L2("العقود والمعايير (FIDIC، ISO…)", "Contracts & standards (FIDIC, ISO…)"), expStd.length ? 3 * expStd.reduce((a, c) => a + (fresh && c.state === "missing" ? 0.4 : cw(c.state)), 0) / expStd.length : 3, 3, expStd.length ? L2(expStd.map((c) => `${c.name}: ${c.state === "missing" ? "غير موجود" : c.state === "applied" ? "مطبّق" : "مذكور"}`).join(" · "), expStd.map((c) => `${c.name}: ${c.state}`).join(" · ")) : L2("غير مطلوب لهذا المسار", "Not required for this track"), expStd.some((c) => c.state === "missing") ? L2(`اذكر نوع العقد الذي عملت تحته (مثل FIDIC الكتاب الأحمر، مقطوعية) في سطر المشروع.`, `State the contract you worked under (e.g. FIDIC Red Book, lump sum) in the project line.`) : null);
  const credLines = cv.lines.map((l) => l.body || l.t || "").filter(Boolean);
  const creds = ENG_CREDS.filter(([, re]: any) => re.test(text)).map(([n, re]: any) => { const ls = credLines.filter((l) => re.test(l)); const prep = ls.length > 0 && ls.every((l) => CRED_PREP.test(l) && !/certified|certificate(?! course)|معتمد|حاصل/i.test(l.replace(/autodesk certified/i, ""))); return { name: n, relevant: kb.creds.includes(n), prep }; });
  const relC = creds.filter((c) => c.relevant && !c.prep);
  const credPts = relC.length ? 3 : creds.some((c) => c.relevant && c.prep) ? 2 : creds.length || (cv.sections.certs && secLines("certs").length) ? (fresh ? 2.5 : 1.5) : 0; const credName = (c?: any, ar?: any) => c.name + (c.prep ? (ar ? " (قيد الإعداد)" : " (in preparation)") : "");
  const nCourses = secLines("certs").length; check("codes", "creds", L2("الشهادات المهنية", "Professional certifications"), credPts, 3, L2(creds.length ? `${creds.map((c) => credName(c, true)).join("، ")}${relC.length ? "" : " — لا شهادة مرتبطة مباشرة بالمسار"}` : nCourses ? `دورات أو شهادات تدريبية: ${nCourses} — لا شهادة مهنية معتمدة بعد` : "لا شهادات مهنية", creds.length ? `${creds.map((c) => credName(c, false)).join(", ")}${relC.length ? "" : " — none directly tied to the track"}` : nCourses ? `${nCourses} course(s) or training certificate(s) — no professional certification yet` : "No professional certifications"), !relC.length ? L2(`الأكثر تأثيرًا لمسار ${tlA}: ${kb.creds.slice(0, 3).join(" · ") || "دورة معتمدة في أداة المسار"}.`, `Most valued for ${tlE}: ${kb.creds.slice(0, 3).join(" · ") || "a certified course in the track's main tool"}.`) : null);
  const pmpExpected = (target === "pm" || (target === "planning" && years >= 6)) && !creds.some((c) => /PMP|PMI-SP/.test(c.name) && !c.prep);
  if (pmpExpected) issue("high", "pmp", L2("PMP / PMI-SP غير مذكورة", "No PMP / PMI-SP"), L2(`لوظائف ${tlA} بمستواك تشترط معظم الشركات الدولية والكبرى PMP أو PMI-SP.`, `For ${tlE} roles at your level, most multinationals and top firms require PMP or PMI-SP.`), [L2("إن كنت تحضّر لها اكتب «PMP (قيد الإعداد — [الشهر/السنة])».", "If you're preparing, write «PMP (in progress — [month/year])».")]);
  const syndicate = SYNDICATE_RE.test(text);
  check("codes", "syndicate", L2("قيد نقابة المهندسين", "Engineers Syndicate registration"), syndicate ? 3 : 0, 3, L2(syndicate ? "القيد مذكور" : "القيد غير مذكور", syndicate ? "Registration stated" : "Registration not stated"), syndicate ? null : L2("سطر واحد: «عضو نقابة المهندسين المصرية — رقم القيد [ ] — منذ [السنة]».", "One line: «Member, Egyptian Engineers Syndicate — reg. no. [ ] — since [year]»."));
  if (!syndicate) issue("high", "syndicate", L2("قيد النقابة غير مذكور", "Syndicate registration missing"), L2("القيد شرط لمزاولة المهنة والتوقيع في مصر، وكثير من الشركات تفلتر عليه.", "Registration is required to practise and sign in Egypt, and many firms filter on it."), [L2("أضفه في رأس السيرة أو في قسم الشهادات برقم القيد وسنته.", "Add it in the header or under Certifications, with the number and year.")]);

  // ===== 5 · ATS & structure (20) =====
  const std = ["experience", "education", "skills"].filter((id) => cv.sections[id] && !cv.sections[id].inferred);
  check("ats", "headings", L2("عناوين أقسام قياسية", "Standard section headings"), 4 * std.length / 3, 4, L2(`${std.length} من 3 (الخبرات، التعليم، المهارات) بعناوين يقرؤها الـ ATS`, `${std.length} of 3 (Experience, Education, Skills) under headings an ATS recognises`), std.length < 3 ? L2("العناوين: Work Experience · Education · Skills · Projects · Certifications — أو: الخبرات العملية · التعليم · المهارات · المشاريع · الشهادات.", "Headings: Work Experience · Education · Skills · Projects · Certifications.") : null);
  if (!fresh && cv.experience.length && !(cv.sections.experience && !cv.sections.experience.inferred)) issue("critical", "noexphead", L2("لا عنوان قسم للخبرات", "No Experience heading"), L2("بدون عنوان «Work Experience / الخبرات العملية» لا يعرف الـ ATS أين تبدأ خبراتك — فيقرأها خطأ أو يتجاهلها.", "Without a «Work Experience» heading, an ATS can't tell where your roles start — it misreads or skips them."), [L2("سطر مستقل بعنوان «Work Experience» أو «الخبرات العملية» فوق الوظائف.", "A separate «Work Experience» line above your roles.")]);
  const layPts = 4 - (layout.columns ? 2 : 0) - (layout.tables > 0 ? 1.5 : 0) - (layout.images > 0 ? 0.5 : 0) - (layout.glyphs > 0 ? 0.5 : 0);
  check("ats", "layout", L2("تخطيط قابل للقراءة الآلية", "Machine-readable layout"), layPts, 4, L2([layout.columns ? "عمودان" : "عمود واحد", layout.tables ? `${layout.tables} جدول` : "بلا جداول", layout.images ? `${layout.images} صورة/أيقونة` : "بلا صور", layout.glyphs ? "رموز خطوط خاصة" : ""].filter(Boolean).join(" · "), [layout.columns ? "two columns" : "single column", layout.tables ? `${layout.tables} table(s)` : "no tables", layout.images ? `${layout.images} image(s)/icon(s)` : "no images", layout.glyphs ? "symbol-font bullets" : ""].filter(Boolean).join(" · ")), layPts < 4 ? L2("قالب عمود واحد: عناوين ثم بنود، بلا جداول أو مربعات نص أو أيقونات.", "One column: headings, then bullets — no tables, text boxes or icons.") : null);
  if (layout.columns || layout.tables > 0) issue("critical", "layout", L2("تصميم بأعمدة أو جداول", "Columns or tables in the layout"), L2("أنظمة ATS تقرأ الأعمدة والجداول سطرًا بسطر عبر الصفحة، فتخلط التواريخ بالمهارات والشركات بالمسميات.", "ATS software reads columns and tables straight across the page, mixing dates with skills and employers with titles."), [L2("انقل المحتوى إلى قالب عمود واحد (Word: إلغاء الجدول ← تحويل إلى نص).", "Move to a single-column template (Word: Table → Convert to text)."), L2("احتفظ بالنسخة المصممة للطباعة فقط، وأرسل النسخة البسيطة.", "Keep the designed version for print; send the plain one.")]);
  const ct = cv.contact; const badMail = ct.email && CV_BAD_EMAIL.test(ct.email.split("@")[0].toLowerCase());
  check("ats", "contact", L2("بيانات التواصل", "Contact block"), (ct.email ? (badMail ? 0.5 : 1) : 0) + (ct.phone ? 1 : 0) + (ct.linkedin ? 0.5 : 0) + (ct.location ? 0.5 : 0), 3, L2([ct.email ? `بريد${badMail ? " غير مهني" : ""}` : "بلا بريد", ct.phone ? "هاتف" : "بلا هاتف", ct.linkedin ? "LinkedIn" : "بلا LinkedIn", ct.location ? `المدينة: ${ct.location}` : "بلا مدينة"].join(" · "), [ct.email ? `e-mail${badMail ? " (unprofessional)" : ""}` : "no e-mail", ct.phone ? "phone" : "no phone", ct.linkedin ? "LinkedIn" : "no LinkedIn", ct.location ? `city: ${ct.location}` : "no city"].join(" · ")), L2("الاسم، الهاتف، البريد، المدينة، رابط LinkedIn — في النص نفسه لا في رأس الصفحة.", "Name, phone, e-mail, city, LinkedIn URL — in the body text, not the page header."));
  if (!ct.email || !ct.phone) issue("critical", "contact", L2("لا يمكن التواصل معك", "Recruiters can't reach you"), L2(`${!ct.email ? "لا بريد إلكتروني" : ""}${!ct.email && !ct.phone ? " و" : ""}${!ct.phone ? "لا رقم هاتف مقروء" : ""} — المرشح الذي لا يمكن الاتصال به يُتخطّى فورًا.`, `${!ct.email ? "No e-mail" : ""}${!ct.email && !ct.phone ? " and " : ""}${!ct.phone ? "no readable phone number" : ""} — a candidate who can't be contacted is skipped.`), [L2("السطر الثاني تحت الاسم: +20 1xx xxx xxxx · name.surname@gmail.com · المدينة · LinkedIn.", "Second line under your name: +20 1xx xxx xxxx · name.surname@gmail.com · city · LinkedIn.")]);
  if (badMail) issue("high", "email", L2("بريد إلكتروني غير مهني", "Unprofessional e-mail address"), L2(`«${ct.email}» يُحكم عليه قبل قراءة السيرة.`, `«${ct.email}» is judged before the CV is read.`), [L2("بريد بصيغة الاسم.اللقب — بلا أرقام ميلاد أو ألقاب.", "Use name.surname — no birth years or nicknames.")]);
  const all = realRoles.length ? realRoles : cv.experience; const datedR = all.length ? all.filter((e) => e.start || e.year).length / all.length : 1;
  check("ats", "dates", L2("التواريخ والترتيب", "Dates and order"), 1.5 * datedR + (cv.dateFormats.length <= 1 ? 0.75 : 0) + (cv.chronological ? 0.75 : 0), 3, L2(`الوظائف المؤرخة: ${Math.round(datedR * 100)}% · ${cv.dateFormats.length <= 1 ? "صيغة واحدة" : "صيغ مختلطة"} · ${cv.chronological ? "الأحدث أولًا" : "ترتيب غير زمني"}`, `${Math.round(datedR * 100)}% of roles dated · ${cv.dateFormats.length <= 1 ? "one format" : "mixed formats"} · ${cv.chronological ? "latest first" : "not reverse-chronological"}`), L2("صيغة واحدة (Mar 2022 – Present)، الأحدث أولًا، وتاريخ بداية ونهاية لكل وظيفة.", "One format (Mar 2022 – Present), latest first, a start and end for every role."));
  if (all.length && datedR < 0.5) issue("critical", "dates", L2("الوظائف بلا تواريخ", "Roles without dates"), L2("الـ ATS يحسب سنوات الخبرة من التواريخ — بدونها تُحتسب خبرتك صفرًا في الفلاتر.", "ATS calculates your years from dates — without them you count as zero experience in filters."), [L2("من/إلى لكل وظيفة بصيغة واحدة، و«حتى الآن» للحالية.", "From–to for every role in one format, «Present» for the current one.")]);
  const kwList = [...kb.core.map((n) => ({ kw: n, re: toolRe(n), must: true, kind: "tool" })), ...kb.adv.map((n) => ({ kw: n, re: toolRe(n), must: false, kind: "tool" })), ...kb.terms.map((id) => ({ kw: TERM[id] ? TERM[id].label : id, id, re: TERM[id] ? TERM[id].re : null, must: true, kind: "term" })), ...kb.codes.slice(0, 3).map((n) => ({ kw: n, re: (ENG_CODES.find((x) => x[0] === n) || [])[1], must: false, kind: "code" }))].filter((x) => x.re);
  const skillsT = secLines("skills").join("\n"); const sumTx = cv.summaryText || "";
  const density = kwList.map((x) => { const g = new RegExp(x.re.source, x.re.flags.includes("g") ? x.re.flags : x.re.flags + "g"); const count = (text.match(g) || []).length; return { ...x, count, inSkills: x.re.test(skillsT), inExp: x.re.test(expText) || x.re.test(projText), inSummary: x.re.test(sumTx) }; });
  const must = density.filter((x) => x.must); const covered = must.filter((x) => x.count > 0).length; const strong = must.filter((x) => x.count >= 2 || (x.inSkills && x.inExp)).length; const stuffed = density.filter((x) => x.count > 10);
  let jd = null; if (ctx.jd && String(ctx.jd).trim().length > 20) { const J = String(ctx.jd); const keys: any = [...new Set([...CV_TOOLS.filter((x) => x.re.test(J)).map((x) => x.name), ...ENG_CODES.filter(([, re]: any) => re.test(J)).map(([n]: any) => n), ...ENG_CREDS.filter(([, re]: any) => re.test(J)).map(([n]: any) => n), ...ENG_TERMS.filter((x) => x.re.test(J)).map((x) => x.id)])]; const has = (k?: any) => { const tl = toolRe(k); if (tl) return tl.test(text); const c = ENG_CODES.find((x) => x[0] === k) || ENG_CREDS.find((x) => x[0] === k); if (c) return c[1].test(text); return TERM[k] ? TERM[k].re.test(text) : false; }; const lab = (k?: any) => (TERM[k] ? TERM[k].label : L2(k, k)); const pres = keys.filter(has); const miss = keys.filter((k) => !has(k)); const jy = /(\d{1,2})\s*(?:-|–|to)?\s*(\d{1,2})?\s*\+?\s*(?:years?|yrs?|سنوات|سنة)/i.exec(J); jd = { keys: keys.map(lab), present: pres.map(lab), missing: miss.map(lab), coverage: keys.length ? Math.round((pres.length / keys.length) * 100) : 0, years: jy ? +jy[1] : null }; }
  const kwCov = must.length ? covered / must.length : 1; const kwPts = 4 * (0.7 * (jd ? (kwCov + jd.coverage / 100) / 2 : kwCov) + 0.3 * (must.length ? strong / must.length : 1)) - (stuffed.length ? 0.5 : 0);
  check("ats", "keywords", L2("كثافة الكلمات المفتاحية", "Keyword density"), kwPts, 4, L2(`الكلمات الأساسية لمسار ${tlA}: ${covered} من ${must.length} موجودة، منها ${strong} مكررة في المهارات والخبرات${jd ? ` · مطابقة الوظيفة ${jd.coverage}%` : ""}${stuffed.length ? ` · تكرار مفرط: ${stuffed.map((x) => (typeof x.kw === "string" ? x.kw : x.kw.ar)).join("، ")}` : ""}`, `${covered} of ${must.length} ${tlE} must-have keywords present, ${strong} repeated across skills and experience${jd ? ` · job-ad match ${jd.coverage}%` : ""}${stuffed.length ? ` · over-repeated: ${stuffed.map((x) => (typeof x.kw === "string" ? x.kw : x.kw.en)).join(", ")}` : ""}`), L2("كل كلمة أساسية مرتين: مرة في المهارات ومرة داخل بند خبرة — بالاسم الدقيق كما في الإعلان.", "Every must-have keyword twice: once in Skills and once inside an experience bullet — spelled exactly as in the job ad."));
  if (must.length && kwCov < 0.4) issue("high", "keywords", L2("كلمات مسارك المفتاحية ناقصة", "Your track's keywords are missing"), L2(`الموجود ${covered} فقط من الكلمات التي يفلتر عليها مسؤولو ${tlA} (${must.length}).`, `Only ${covered} of the ${must.length} words ${tlE} screeners filter on.`), [L2("راجع قسم «الفجوات والكلمات المفتاحية» وأضف ما تجيده فعلًا.", "Go through «Gaps & keywords» and add what you genuinely know.")]);
  const wIssues = writingIssues(cv); const toolTypos = wIssues.filter((i) => i.kind === "casing" || (i.kind === "spelling" && CV_TOOLS.some((x) => x.re.test(i.right))));
  check("ats", "writing", L2("سلامة اللغة والإملاء", "Spelling and grammar"), wIssues.length === 0 ? 2 : wIssues.length <= 2 ? 1.5 : wIssues.length <= 5 ? 1 : 0.5, 2, L2(`ملاحظات لغوية: ${wIssues.length}`, `${wIssues.length} language issue(s)`), wIssues.length ? L2("صحّح القائمة أدناه — الخطأ في اسم برنامج يُسقطه من مطابقة الـ ATS.", "Fix the list below — a misspelled tool name drops out of ATS matching.") : null);
  if (toolTypos.length) issue("high", "tooltypo", L2("أسماء برامج مكتوبة خطأ", "Tool names misspelled"), L2(`${toolTypos.slice(0, 3).map((i) => `«${i.wrong}» ← «${i.right}»`).join("، ")} — الـ ATS يطابق الاسم حرفيًا.`, `${toolTypos.slice(0, 3).map((i) => `«${i.wrong}» → «${i.right}»`).join(", ")} — ATS matches the exact spelling.`), [L2("اكتب الاسم التجاري بالضبط: AutoCAD، Revit، ETABS، Primavera P6.", "Use the exact product name: AutoCAD, Revit, ETABS, Primavera P6.")]);
  const senior = years >= 8; const maxW = senior ? 1300 : years >= 3 ? 950 : 700; const pagesOk = senior ? 3 : 2;
  if (cv.words > maxW * 1.25 || layout.pages > pagesOk + 1) issue("high", "length", L2("السيرة أطول من اللازم", "The CV is too long"), L2(`عدد الكلمات: ${cv.words}${layout.pages > 1 ? ` · الصفحات: ${layout.pages}` : ""} — الحد لمستواك ${pagesOk === 2 ? "صفحتان" : "3 صفحات"}.`, `${cv.words} words${layout.pages > 1 ? ` · ${layout.pages} pages` : ""} — the limit at your level is ${pagesOk} pages.`), [L2("اختصر الوظائف الأقدم من 10 سنوات إلى سطر، واحذف الهوايات والمراجع.", "Cut roles older than 10 years to one line; drop hobbies and references.")]);
  if (cv.words < 150) issue("critical", "thin", L2("السيرة أقصر من أن تُقيّم", "Too thin to be shortlisted"), L2(`عدد الكلمات ${cv.words} فقط — لا يكفي لإظهار مشروع واحد بتفاصيله.`, `Only ${cv.words} words — not enough to show one project properly.`), [L2("3–6 بنود لكل وظيفة رئيسية، وسطر مشروع لكل وظيفة.", "3–6 bullets per main role and a project line for each.")]);
  const personal = cv.personal.filter((k) => k !== "الجنسية"); if (personal.length) issue("high", "personal", L2("بيانات شخصية لا تحتاجها الشركة", "Personal data the employer doesn't need"), L2(`${personal.join("، ")} — تعرّضك للتحيز ولا تفيد في الفرز، والشركات الدولية تتجاهلها أو تطلب حذفها.`, `${personal.map((p) => ({ "تاريخ الميلاد أو السن": "date of birth / age", "الحالة الاجتماعية": "marital status", "الديانة": "religion", "الرقم القومي": "national ID", "النوع": "gender", "العنوان التفصيلي": "full street address" }[p] || p)).join(", ")} — invite bias and add nothing to screening; multinationals ignore or ask you to remove them.`), [L2("احذفها، وأبقِ الموقف من التجنيد للرجال (تسأل عنه الشركات في مصر).", "Remove them; keep military status for men (Egyptian employers ask for it).")]);

  // ===== assemble =====
  const pillars = PILLARS.map(([id, max, label, desc]: any) => { const p = P[id]; const pts = r5(Math.min(max, p.checks.reduce((a, c) => a + c.pts, 0))); return { id, max, label, desc, pts, pct: Math.round((pts / max) * 100), checks: p.checks }; });
  const overall = Math.round(pillars.reduce((a, p) => a + p.pts, 0)); const critical = issues.filter((i) => i.sev === "critical"); const high = issues.filter((i) => i.sev === "high");
  const grade = overall >= 85 && !critical.length ? [L2("جاهزة للمقاولين والاستشاريين الكبار", "Ready for top-tier contractors and consultants"), "good"] : overall >= 70 ? [L2(critical.length ? "قوية — لكن أصلح العوائق أولًا" : "قوية — أغلق الفجوات المحددة", critical.length ? "Strong — but fix the deal-breakers first" : "Strong — close the listed gaps"), "accent"] : overall >= 55 ? [L2("تحتاج عملًا مركّزًا قبل التقديم", "Needs focused work before applying"), "warn"] : [L2("أعد بناءها قبل التقديم", "Rebuild it before applying"), "bad"];
  const terms = kb.terms.map((id) => ({ id, label: TERM[id] ? TERM[id].label : L2(id, id), present: TERM[id] ? TERM[id].re.test(text) : false, inExp: TERM[id] ? TERM[id].re.test(expText) : false }));
  const credsOut: any = [...kb.creds.map((n) => { const c = creds.find((x) => x.name === n); return { name: n, relevant: true, present: !!c && !c.prep, prep: !!(c && c.prep) }; }), ...creds.filter((c) => !kb.creds.includes(c.name)).map((c) => ({ name: c.name, relevant: false, present: !c.prep, prep: c.prep }))];
  // rewrites: every bullet that is not already a strong, sized, result line (latest roles first)
  const cvCtx: any = { disc, tools: { main: software.filter((x) => x.level !== "missing" && !["Excel", "Microsoft Office"].includes(x.name)).map((x) => x.name)[0] || null, survey: ["Total Station", "GNSS / GPS"].find((n) => toolRe(n) && toolRe(n).test(text)) || null }, codes: codes.filter((c) => c.kind === "code" && c.state !== "missing" && c.name !== "Egyptian Code").map((c) => c.name) };
  const rewriteGroups: any = []; let strongCount = 0, budget = 18;
  roles.forEach((r) => { if (budget <= 0 || !r.e.bullets.length) return; const items: any = []; r.e.bullets.forEach((b) => { const s = scopeOf(b.text); const good = (b.action || b.strong) && !b.weak && anyScope(s) && s.dims.has("result"); if (good) { strongCount++; return; } if (budget > 0) { const rw = rewriteEng(b, r, cvCtx); if (rw) { items.push(rw); budget--; } } }); if (items.length) rewriteGroups.push({ role: [r.e.title, r.e.company].filter(Boolean).join(" — "), items }); });
  const aSum: any = { roles, software, terms, codes, creds: credsOut, syndicate, disc, target, fresh };
  const summary: any = { before: cv.summaryText || "", after: draftEngSummary(cv, aSum), ar: cv.lang === "ar" };
  const sheetProjects = roles.slice(0, 4).map((r) => ({ name: [r.e.title, r.e.company].filter(Boolean).join(" — ") || (lang === "ar" ? "مشروع" : "Project"), known: SHEET_FIELDS.filter((d) => r.dims.has(d)), missing: SHEET_FIELDS.filter((d) => !r.dims.has(d)), hit: r.hit }));
  const portfolio: any = { tips: [...(PORTFOLIO_TIPS[target] || PORTFOLIO_TIPS.site)], general: PORTFOLIO_GENERAL, sheet: projectSheet(lang === "ar"), projects: sheetProjects };
  const missing: any = { core: software.filter((x) => x.tier === "core" && x.level === "missing").map((x) => x.name), adv: software.filter((x) => x.tier === "adv" && x.level === "missing").map((x) => x.name), codes: codes.filter((c) => c.expected && c.state === "missing").map((c) => c.name), creds: credsOut.filter((c) => c.relevant && !c.present).map((c) => c.name), terms: terms.filter((x) => !x.present).map((x) => x.label), jd: jd ? jd.missing : [] };
  return { empty: false, version: 23, overall, grade, pillars, critical, high, layout, words: cv.words, cv, disc, target, detected, allowed, shares: sig.shares, fresh, years,
    profile: { disc, discLabel: discL2(disc), target: trackL2(target, disc), detected: trackL2(detected, disc), years, pos: cv.seniority, posLabel: posL2(cv.seniority), lang, pages: layout.pages, words: cv.words },
    software, codes, creds: credsOut, syndicate, terms, density: density.sort((a, b) => (b.must - a.must) || Number(a.count === 0) - Number(b.count === 0) || b.count - a.count), coverage: Math.round(kwCov * 100), jd, missing,
    rewrites: rewriteGroups, strongBullets: strongCount, summary, portfolio, writing: wIssues };
}

// ---- writing quality: spelling (EN), grammar slips (EN), hamza / ta-marbuta / punctuation (AR), tool-name casing ----
export function writingIssues(cv?: any) {
  const text = cv.text; const out: any = []; const seen = new Set(); const push = (kind?: any, wrong?: any, right?: any, where?: any) => { const key = kind + String(wrong).toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push({ kind, wrong, right, where }); };
  const textNoUrl = text.replace(/\S+@\S+|https?:\/\/\S+|\b[\w.-]+\.(?:com|net|org|io|me|dev|eg)\S*/gi, " ");
  wordsOf(textNoUrl).forEach((w) => { const lw = w.toLowerCase(); if (/^[a-z]/.test(lw)) { const fix = EN_MISSPELL[lw]; if (fix && fix !== w) push(fix.toLowerCase() === lw ? "casing" : "spelling", w, fix, ctxOf(text, w)); } });
  EN_GRAMMAR.forEach(([re, fix]: any) => { re.lastIndex = 0; const m = re.exec(text); re.lastIndex = 0; if (m) push("grammar", m[0], m[0].replace(new RegExp(re.source, "i"), fix), ctxOf(text, m[0])); });
  if (/(^|[\s(])i(?=[\s,.'])/.test(text)) push("casing", "i", "I", ctxOf(text, " i "));
  AR_SLIPS.forEach(([re, fix]: any) => { re.lastIndex = 0; const m = re.exec(text); re.lastIndex = 0; if (m) push("spelling", m[0].trim(), fix, ctxOf(text, m[0].trim())); });
  AR_PUNCT.forEach(([re, why]: any) => { re.lastIndex = 0; const m = re.exec(text); re.lastIndex = 0; if (m && m[0].trim()) push("punct", m[0].replace(/\s/g, "␣"), why, ctxOf(text, m[0])); });
  const tenses = cv.bulletsAll.map((b) => b.tense).filter(Boolean); if (tenses.filter((t) => t === "ing").length >= 2 && tenses.filter((t) => t === "past").length >= 2) push("tense", "Managing … / Managed …", "Managed … (one tense)", "");
  return out;
}


// ---- writing checks (kept from v13): common misspellings (EN), grammar slips (EN), hamza / ta-marbuta / punctuation slips (AR), brand casing ----
export const EN_MISSPELL = { recieve: "receive", recieved: "received", seperate: "separate", managment: "management", enviroment: "environment", enviromental: "environmental", occured: "occurred", acheive: "achieve", acheived: "achieved", buisness: "business", calender: "calendar", definately: "definitely", goverment: "government", independant: "independent", knowlege: "knowledge", liason: "liaison", maintainance: "maintenance", maintenence: "maintenance", neccessary: "necessary", necesary: "necessary", occassion: "occasion", persue: "pursue", profesional: "professional", proffesional: "professional", recomend: "recommend", succesful: "successful", successfull: "successful", supervison: "supervision", technicial: "technical", untill: "until", wich: "which", writen: "written", experiance: "experience", experince: "experience", engeneer: "engineer", enginner: "engineer", enginer: "engineer", engineerng: "engineering", responsable: "responsible", responsibilites: "responsibilities", responsiblities: "responsibilities", comunication: "communication", comittee: "committee", concreat: "concrete", reinforcment: "reinforcement", quantites: "quantities", quantitiy: "quantity", drawinges: "drawings", shopdrawing: "shop drawing", schedual: "schedule", schedulling: "scheduling", coordiantion: "coordination", cooridnation: "coordination", collegue: "colleague", collegues: "colleagues", refrence: "reference", refrences: "references", achivement: "achievement", achivements: "achievements", develope: "develop", developped: "developed", analize: "analyze", analised: "analysed", preformed: "performed", exprience: "experience", graduatied: "graduated", univeristy: "university", universty: "university", certficate: "certificate", certifcate: "certificate", bachlor: "bachelor", bachelors: "bachelor's", diplome: "diploma", langauge: "language", langauges: "languages", fluant: "fluent", arabic: "Arabic", english: "English", cairo: "Cairo", egypt: "Egypt", excell: "Excel", autocad: "AutoCAD", revit: "Revit", etabs: "ETABS", sap2000: "SAP2000", navisworks: "Navisworks", primavera: "Primavera", bim: "BIM", hvac: "HVAC", mep: "MEP", "qa/qc": "QA/QC", qs: "QS", gis: "GIS", pmp: "PMP", fidic: "FIDIC", iso: "ISO", nfpa: "NFPA", ashrae: "ASHRAE", linkedin: "LinkedIn", microsoft: "Microsoft", sketchup: "SketchUp", lumion: "Lumion", photoshop: "Photoshop", matlab: "MATLAB", solidworks: "SolidWorks", etap: "ETAP", dialux: "DIALux", tekla: "Tekla", staad: "STAAD", plaxis: "PLAXIS", ansys: "ANSYS", python: "Python", powerbi: "Power BI", nebosh: "NEBOSH", osha: "OSHA", leed: "LEED", concret: "concrete", collumn: "column", collumns: "columns", strucutre: "structure", strucural: "structural", finshing: "finishing", finishng: "finishing", intership: "internship", interned: "interned", trainning: "training", suppervisor: "supervisor", supervisior: "supervisor", superviser: "supervisor", coordinater: "coordinator", planing: "planning", estimatation: "estimation", quantiy: "quantity", boq: "BOQ", rfi: "RFI", qto: "QTO", asbuilt: "as-built", subcontractor: "subcontractor", subcontractors: "subcontractors", mobilisation: "mobilization" };

export const EN_GRAMMAR = [[/\bresponsible of\b/gi, "responsible for"], [/\bresponsible about\b/gi, "responsible for"], [/\bexperience on\b/gi, "experience in"], [/\bin charge for\b/gi, "in charge of"], [/\bparticipate on\b/gi, "participate in"], [/\bparticipated on\b/gi, "participated in"], [/\bsince (\d+) (years?|months?)\b/gi, "for $1 $2"], [/\ba (engineer|architect|expert|employee|office|assistant|intern|estimator|inspector|electrical|industrial)\b/gi, "an $1"], [/\ban (university|user|unit|useful|one)\b/gi, "a $1"], [/\binformations\b/gi, "information"], [/\badvices\b/gi, "advice"], [/\bsoftwares\b/gi, "software"], [/\bequipments\b/gi, "equipment"], [/\bstaffs\b/gi, "staff"], [/\bpeoples\b/gi, "people"], [/\btrainings\b/gi, "training"], [/\bfeedbacks\b/gi, "feedback"], [/\bworks as\b/gi, "worked as / working as"], [/\bi am (work|working) as\b/gi, "I work as"], [/\bmore better\b/gi, "better"], [/\bcan able to\b/gi, "can"], [/\bdiscuss about\b/gi, "discuss"], [/\bcope up with\b/gi, "cope with"], [/\brevert back\b/gi, "revert"], [/\bthe same like\b/gi, "the same as"], [/\bgraduated from (the )?faculty of\b/gi, "graduated from the Faculty of"], [/\bwork under pressure\b/gi, "(remove — show it with an achievement instead)"], [/\bteam work\b/gi, "teamwork"], [/\bshop drawing\b(?!s)/gi, "shop drawings"], [/\bas built\b/gi, "as-built"], [/\bfollow up\b (the|with)/gi, "followed up $1"], [/\bmaking sure\b/gi, "ensuring"], [/\bvery good in\b/gi, "proficient in"], [/\bknowledge in\b/gi, "knowledge of"], [/\bgood command in\b/gi, "good command of"]];

export const AR_SLIPS = [[/(^|\s)فى(?=\s|$)/g, "في"], [/(^|\s)الى(?=\s|$)/g, "إلى"], [/(^|\s)انا(?=\s|$)/g, "أنا"], [/(^|\s)اعمل(?=\s|$)/g, "أعمل"], [/(^|\s)اشرفت(?=\s|$)/g, "أشرفت"], [/(^|\s)اعددت(?=\s|$)/g, "أعددت"], [/(^|\s)ادارة(?=\s|$)/g, "إدارة"], [/(^|\s)انشاء(?=\s|$)/g, "إنشاء"], [/(^|\s)انشاءات(?=\s|$)/g, "إنشاءات"], [/(^|\s)اعداد(?=\s|$)/g, "إعداد"], [/(^|\s)اشراف(?=\s|$)/g, "إشراف"], [/(^|\s)مهندسه(?=\s|$)/g, "مهندسة"], [/(^|\s)خبره(?=\s|$)/g, "خبرة"], [/(^|\s)سنه(?=\s|$)/g, "سنة"], [/(^|\s)شركه(?=\s|$)/g, "شركة"], [/(^|\s)مسئول(?=\s|$)/g, "مسؤول"], [/(^|\s)مسئوليات(?=\s|$)/g, "مسؤوليات"], [/(^|\s)هذة(?=\s|$)/g, "هذه"], [/(^|\s)الهندسه(?=\s|$)/g, "الهندسة"], [/(^|\s)جامعه(?=\s|$)/g, "جامعة"], [/(^|\s)كليه(?=\s|$)/g, "كلية"], [/(^|\s)المدنيه(?=\s|$)/g, "المدنية"], [/(^|\s)المعماريه(?=\s|$)/g, "المعمارية"], [/(^|\s)اللغه(?=\s|$)/g, "اللغة"], [/(^|\s)الانجليزيه(?=\s|$)/g, "الإنجليزية"], [/(^|\s)الانجليزية(?=\s|$)/g, "الإنجليزية"], [/(^|\s)العربيه(?=\s|$)/g, "العربية"], [/(^|\s)تنفيز(?=\s|$)/g, "تنفيذ"], [/(^|\s)اتقان(?=\s|$)/g, "إتقان"], [/(^|\s)اجادة(?=\s|$)/g, "إجادة"], [/(^|\s)اداره(?=\s|$)/g, "إدارة"], [/(^|\s)متابعه(?=\s|$)/g, "متابعة"], [/(^|\s)مراجعه(?=\s|$)/g, "مراجعة"], [/(^|\s)الاشراف(?=\s|$)/g, "الإشراف"], [/(^|\s)الاعداد(?=\s|$)/g, "الإعداد"], [/(^|\s)الادارة(?=\s|$)/g, "الإدارة"], [/(^|\s)الانشائية(?=\s|$)/g, "الإنشائية"], [/(^|\s)الانشائي(?=\s|$)/g, "الإنشائي"], [/(^|\s)امتياز(?=\s|$)/g, "امتياز"], [/(^|\s)اكتوبر(?=\s|$)/g, "أكتوبر"], [/(^|\s)اسيوط(?=\s|$)/g, "أسيوط"], [/(^|\s)الاسكندرية(?=\s|$)/g, "الإسكندرية"], [/(^|\s)الاسكندريه(?=\s|$)/g, "الإسكندرية"], [/(^|\s)مقاولين(?=\s|$)/g, "مقاولي (في الإضافة)"], [/(^|\s)حاليا(?=\s|$)/g, "حاليًا"], [/(^|\s)تقريبا(?=\s|$)/g, "تقريبًا"], [/(^|\s)ايضا(?=\s|$)/g, "أيضًا"], [/(^|\s)اكثر(?=\s|$)/g, "أكثر"], [/(^|\s)اول(?=\s|$)/g, "أول"], [/(^|\s)اعلى(?=\s|$)/g, "أعلى"], [/(^|\s)افضل(?=\s|$)/g, "أفضل"]];

export const AR_PUNCT = [[/\s+[،,؛;:]/g, "لا مسافة قبل علامة الترقيم"], [/[،؛](?=[^\s\n])|[,;](?=[A-Za-zء-ي])|\.(?=[ء-ي])/g, "مسافة بعد علامة الترقيم"], [/([ء-ي])\1{2,}|([A-Za-z])\2{3,}/g, "حروف مكررة"], [/ {2,}[A-Za-zء-ي]/g, "مسافتان متتاليتان"]];

export const CV_BAD_EMAIL = /(\d{4,}|cool|boy|girl|love|king|prince|princess|hot|sexy|crazy|angel|baby|sweet|3amel|5ales|zoz|toto|mimi|lolo|batman|xx|_x_|gamer|killer)/;

export const ctxOf = (text?: any, m?: any) => { const i = text.toLowerCase().indexOf(String(m).toLowerCase()); if (i < 0) return ""; const a = Math.max(0, i - 30), b = Math.min(text.length, i + String(m).length + 30); return (a > 0 ? "…" : "") + text.slice(a, b).replace(/\s+/g, " ") + (b < text.length ? "…" : ""); };

// ---- sample CVs (the three demo inputs on the intake screen) ----
export const CV_SAMPLE_AR = `أحمد محمود عبد الرحمن
مهندس مدني — مكتب فني
القاهرة الجديدة، القاهرة · 01001234567 · ahmed.m.abdelrahman@gmail.com · linkedin.com/in/ahmed-abdelrahman
الموقف من التجنيد: معاف

الملخص المهني
مهندس مدني بخبرة 4 سنوات فى المكتب الفني بمشاريع سكنية وإدارية بالقاهرة الجديدة والعاصمة الإدارية. أتقن Revit وAutoCAD وExcel، وأعددت حصرًا ومستخلصات لعقود تتجاوز 120 مليون جنيه.

الخبرات العملية
مهندس مكتب فني — شركة ريدكون للإنشاءات — القاهرة · 03/2022 – حتى الآن
- أعددت الحصر والمستخلصات الشهرية لـ 4 مقاولي باطن بقيمة 40 مليون جنيه، وقلّصت زمن المراجعة من 10 أيام إلى 6.
- راجعت اللوحات التنفيذية لبرج إداري 32,000 م² وأغلقت 180 ملاحظة استشاري خلال 3 أشهر.
- مسؤول عن التنسيق بين الموقع والتصميم.
مهندس موقع — المقاولون العرب — أسيوط · 07/2020 – 02/2022
- أشرفت على صبّ 9,000 م³ خرسانة لمشروع إسكان اجتماعي 12 عمارة بفريق 3 مهندسين.
- قمت بمتابعة مقاولي الباطن وإعداد تقارير الإنجاز اليومية.

التعليم
بكالوريوس الهندسة — قسم الهندسة المدنيه — جامعه أسيوط · 2020 · بتقدير جيد جدًا

المهارات
Revit · AutoCAD · Excel · Primavera P6 · الكود المصري · تحمل ضغط العمل · روح الفريق

الشهادات والدورات
Revit Structure — Autodesk Certified User · 2023
دورة إدارة المشروعات PMP (تحضيري) · 2024
عضو نقابة المهندسين · 2020

اللغات
العربية: اللغة الأم · English: Very good (B2)`;

export const CV_SAMPLE_EN = `Mohamed Ali
Site Engineer
Cairo, Egypt | mohamed_cool_boy2010@gmail.com | 0100 555 6666

Objective
Seeking a challenging position in a reputable company where i can use my skills. Hard worker, team player and can work under pressure.

Experience
Site engineer, Al Ahly Contracting
Responsible of supervising concrete works and finishing works.
Worked on shop drawing and preparing the quantites.
Helped the senior engineer in the daily reports.
Trainee, Orascom Construction (2019)

Education
Bachelor of civil engineering, Cairo university
Very good

Skills
autocad, excel, etabs, communication skills, fast learner, work under pressure

Personal Data
Date of birth: 12/5/1997
Marital status: Single
Military status: Exempted
Religion: Muslim`;

export const CV_SAMPLE_FRESH = `Nour El-Din Khaled
Electrical Power Engineer — Fresh Graduate
nour.khaled@outlook.com · +20 106 555 7788 · 6th of October, Giza · linkedin.com/in/nour-khaled
Military status: Postponed

PROFESSIONAL SUMMARY
Electrical power engineering graduate (Cairo University, 2025, Very Good with honors) with two internships in MV/LV distribution and a graduation project on a 5 MW solar plant grid connection. Proficient in ETAP, DIALux and AutoCAD Electrical.

EDUCATION
B.Sc. Electrical Power and Machines Engineering — Faculty of Engineering, Cairo University · 2020 – 2025 · Very Good with honors (GPA 3.5)
Graduation project: Grid integration of a 5 MW PV plant — load flow and short-circuit study on ETAP · Excellent

INTERNSHIPS
Electrical Intern — Elsewedy Electric, 10th of Ramadan · Jul 2024 – Sep 2024
- Prepared single line diagrams and cable schedules for 3 MV switchgear rooms using AutoCAD Electrical.
- Assisted in testing 22 kV cables and reviewing test reports.
Site Intern — Orascom Construction, New Capital · Jul 2023 – Aug 2023
- Followed installation of LV panels and cable trays for a 12-storey office building.

SKILLS
Software: ETAP · DIALux · AutoCAD Electrical · Revit MEP (basic) · MATLAB · Excel
Standards: IEC 60364 · NEC · Egyptian Electrical Code
Soft: communication, teamwork

CERTIFICATIONS
Electrical Design Diploma (Power) — 2024 · ETAP fundamentals — 2024

LANGUAGES
Arabic (native) · English (fluent, IELTS 7.0)`;
