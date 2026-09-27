// Migrated from the prototype part(s): app_1a_geo
import {
  Briefcase, Calculator, Home, MessageCircle, Users, Wallet
} from "lucide-react";

// =====================================================================
//  VIEW 2 — the app · data (Egypt, monthly EGP)
//  Provenance: regulatory anchors are cited; company facts are public record; salary
//  percentiles are MODELED (±15%) from public postings + community reports. See DATASET.
// =====================================================================
export const DATASET = {
  version: "2026-Q1", updated: "2026-03-31", basis: "إجمالي شهري (أساسي + بدلات ثابتة) · قطاع خاص · القاهرة الكبرى = 1.00",
  anchors: [
    ["الحد الأدنى للأجور — قطاع خاص", "7,000 ج.م/شهر", "المجلس القومي للأجور، 2025"],
    ["الحد الأقصى للأجر التأميني 2026", "≈ 16,700 ج.م/شهر (+15% سنويًا)", "قانون التأمينات 148/2019"],
    ["حصة العامل في التأمينات", "11% من الأجر التأميني", "قانون 148/2019"],
    ["شرائح ضريبة الدخل", "0% حتى 40 ألف … 27.5% فوق 1.2 مليون سنويًا · إعفاء شخصي 20,000", "قانون 175/2023"],
    ["التضخم السنوي (حضر)", "≈ 12% · يُحدَّث شهريًا", "البنك المركزي / الجهاز المركزي للتعبئة والإحصاء"],
    ["تصنيف المقاولين", "الدرجة الأولى → السابعة حسب حجم الأعمال", "الاتحاد المصري لمقاولي التشييد والبناء"],
    ["مزاولة المهنة", "القيد بنقابة المهندسين شرط لمزاولة المهنة · حد أدنى استرشادي لأجر المهندس", "نقابة المهندسين"],
    ["التقسيم الإداري", "27 محافظة → مدن ومراكز وأحياء", "الهيئة العامة للتخطيط العمراني / وزارة التنمية المحلية"],
  ],
  method: "المتوسط والربعيات نماذج من إعلانات وظائف عامة (2025–2026) وتقارير مجتمعية، مُعايَرة على الحد الأدنى للأجور وسقف الأجر التأميني. معامل المحافظة/المدينة ومعامل المسار ومعامل المسمّى مقدَّرة. كل رقم تشاركه أنت يستبدل التقدير برقم حقيقي.",
};

export const TABS = [
  { id: "home", label: "الرئيسية", icon: Home }, { id: "community", label: "المجتمع", icon: Users },
  { id: "jobs", label: "الوظائف", icon: Briefcase }, { id: "market", label: "السوق", icon: Wallet }, { id: "tools", label: "الأدوات", icon: Calculator }, { id: "inbox", label: "الرسائل", icon: MessageCircle },
];


// ---- Geography: 7 regions → 27 governorates → cities / markaz / districts (multiplier is modeled; a place inherits its governorate's unless stated) ----
export const REGIONS = [
  ["gc", "القاهرة الكبرى"], ["alex", "الإسكندرية والساحل الشمالي"], ["delta", "الدلتا"], ["canal", "منطقة القناة"], ["upper", "الصعيد"], ["sinai", "البحر الأحمر وسيناء"], ["west", "الوادي الجديد والصحراء الغربية"],
];

export const GOVS: any = [
  // [key, name, region, multiplier]
  ["cairo", "القاهرة", "gc", 1.00], ["giza", "الجيزة", "gc", 0.98], ["qalyubia", "القليوبية", "gc", 0.92],
  ["alexandria", "الإسكندرية", "alex", 0.93], ["matrouh", "مطروح", "alex", 0.95], ["beheira", "البحيرة", "alex", 0.84],
  ["dakahlia", "الدقهلية", "delta", 0.86], ["gharbia", "الغربية", "delta", 0.84], ["menoufia", "المنوفية", "delta", 0.83], ["kafr", "كفر الشيخ", "delta", 0.82], ["damietta", "دمياط", "delta", 0.85], ["sharqia", "الشرقية", "delta", 0.88],
  ["portsaid", "بورسعيد", "canal", 0.9], ["ismailia", "الإسماعيلية", "canal", 0.88], ["suez", "السويس", "canal", 0.98],
  ["benisuef", "بني سويف", "upper", 0.82], ["fayoum", "الفيوم", "upper", 0.8], ["minya", "المنيا", "upper", 0.8], ["assiut", "أسيوط", "upper", 0.82], ["sohag", "سوهاج", "upper", 0.78], ["qena", "قنا", "upper", 0.8], ["luxor", "الأقصر", "upper", 0.82], ["aswan", "أسوان", "upper", 0.85],
  ["redsea", "البحر الأحمر", "sinai", 1.05], ["southsinai", "جنوب سيناء", "sinai", 1.05], ["northsinai", "شمال سيناء", "sinai", 1.0],
  ["newvalley", "الوادي الجديد", "west", 0.85],
];

export const KIND = { new: "مدينة جديدة", city: "مدينة", markaz: "مركز", district: "حي", zone: "منطقة مشروعات" };

// [id, name, kind, multiplier?]
export const CITIES = {
  cairo: [["nac", "العاصمة الإدارية الجديدة", "new", 1.06], ["newcairo", "القاهرة الجديدة (التجمع)", "new", 1.03], ["rehab", "الرحاب", "zone", 1.03], ["madinaty", "مدينتي", "zone", 1.03], ["shorouk", "الشروق", "new", 0.98], ["badr", "بدر", "new", 0.97], ["may15", "15 مايو", "new", 0.96], ["nasr", "مدينة نصر", "district"], ["heliopolis", "مصر الجديدة", "district", 1.02], ["nozha", "النزهة", "district"], ["maadi", "المعادي", "district"], ["mokattam", "المقطم", "district"], ["zamalek", "الزمالك", "district", 1.02], ["downtown", "وسط البلد", "district"], ["abdeen", "عابدين", "district", 0.98], ["boulaq", "بولاق", "district", 0.98], ["shubra", "شبرا", "district", 0.97], ["sahel", "الساحل", "district", 0.96], ["rodelfarag", "روض الفرج", "district", 0.96], ["sharabia", "الشرابية", "district", 0.95], ["waily", "الوايلي", "district", 0.97], ["hadayekqobba", "حدائق القبة", "district", 0.96], ["zeitoun", "الزيتون", "district", 0.96], ["ainshams", "عين شمس", "district", 0.96], ["matareya", "المطرية", "district", 0.95], ["marg", "المرج", "district", 0.94], ["salam", "السلام", "district", 0.94], ["misrqadima", "مصر القديمة", "district", 0.97], ["sayeda", "السيدة زينب", "district", 0.97], ["khalifa", "الخليفة", "district", 0.96], ["basateen", "البساتين", "district", 0.97], ["darelsalam", "دار السلام", "district", 0.95], ["tora", "طرة", "district", 0.97], ["maasara", "المعصرة", "district", 0.95], ["helwan", "حلوان", "district", 0.96], ["tebbin", "التبين", "district", 0.94]],
  giza: [["zayed", "الشيخ زايد", "new", 1.02], ["oct", "6 أكتوبر", "new", 1.02], ["hadayekoct", "حدائق أكتوبر", "new", 1.0], ["hadayekahram", "حدائق الأهرام", "zone", 0.97], ["mohandessin", "المهندسين", "district", 1.0], ["dokki", "الدقي", "district", 1.0], ["agouza", "العجوزة", "district", 0.99], ["giza_c", "الجيزة (المدينة)", "city"], ["imbaba", "إمبابة", "district", 0.95], ["boulaqdakrour", "بولاق الدكرور", "district", 0.94], ["haram", "الهرم", "district", 0.95], ["faisal", "فيصل", "district", 0.94], ["omraneya", "العمرانية", "district", 0.94], ["warraq", "الوراق", "district", 0.93], ["ossim", "أوسيم", "markaz", 0.9], ["kerdasa", "كرداسة", "markaz", 0.9], ["abunomros", "أبو النمرس", "markaz", 0.9], ["hawamdeya", "الحوامدية", "city", 0.9], ["badrashein", "البدرشين", "markaz", 0.88], ["manshiyet", "منشأة القناطر", "markaz", 0.88], ["ayat", "العياط", "markaz", 0.86], ["saff", "الصف", "markaz", 0.86], ["atfih", "أطفيح", "markaz", 0.85], ["wahat", "الواحات البحرية", "markaz", 0.88]],
  qalyubia: [["obour", "العبور", "new", 0.95], ["banha", "بنها", "city", 0.88], ["shubrakheima", "شبرا الخيمة", "city", 0.9], ["khosous", "الخصوص", "city", 0.9], ["qalyub", "قليوب", "markaz", 0.9], ["khanka", "الخانكة", "markaz", 0.9], ["qanater", "القناطر الخيرية", "markaz", 0.88], ["qaha", "قها", "city", 0.88], ["tukh", "طوخ", "markaz", 0.86], ["shibinqanater", "شبين القناطر", "markaz", 0.86], ["kafrshukr", "كفر شكر", "markaz", 0.85]],
  alexandria: [["smouha", "سموحة وسان ستيفانو", "district", 0.95], ["sharq", "شرق (سيدي جابر)", "district", 0.94], ["montaza", "المنتزه", "district"], ["sidibishr", "سيدي بشر", "district"], ["miami", "ميامي", "district"], ["wasat", "وسط", "district"], ["gharb", "غرب", "district", 0.92], ["gomrok", "الجمرك", "district", 0.92], ["aboukir", "أبو قير", "district", 0.92], ["agami", "العجمي", "district", 0.9], ["dekheila", "الدخيلة", "district", 0.9], ["amreya", "العامرية", "markaz", 0.9], ["borg", "برج العرب الجديدة", "new", 0.92], ["borgold", "برج العرب", "city", 0.9]],
  matrouh: [["alamein", "العلمين الجديدة", "new", 1.12], ["hekma", "رأس الحكمة", "zone", 1.12], ["dabaa", "الضبعة", "markaz", 1.02], ["alameinold", "العلمين", "city", 1.0], ["hammam", "الحمام", "markaz", 0.95], ["marsa", "مرسى مطروح", "city", 0.9], ["sidibarrani", "سيدي براني", "markaz", 0.88], ["negila", "النجيلة", "markaz", 0.86], ["salloum", "السلوم", "markaz", 0.86], ["siwa", "سيوة", "markaz", 0.86]],
  beheira: [["damanhur", "دمنهور", "city"], ["nubaria", "النوبارية الجديدة", "new", 0.86], ["wadinatrun", "وادي النطرون", "markaz", 0.86], ["kafrdawar", "كفر الدوار", "markaz"], ["rashid", "رشيد", "markaz", 0.82], ["edku", "إدكو", "markaz", 0.82], ["abuhommos", "أبو حمص", "markaz", 0.82], ["badr_b", "بدر", "markaz", 0.82], ["delengat", "الدلنجات", "markaz", 0.8], ["mahmoudia", "المحمودية", "markaz", 0.8], ["rahmaniya", "الرحمانية", "markaz", 0.8], ["itay", "إيتاي البارود", "markaz", 0.8], ["hosheisa", "حوش عيسى", "markaz", 0.8], ["shubrakhit", "شبراخيت", "markaz", 0.8], ["komhamada", "كوم حمادة", "markaz", 0.8], ["abumatamir", "أبو المطامير", "markaz", 0.8]],
  dakahlia: [["mansoura", "المنصورة", "city"], ["newmansoura", "المنصورة الجديدة", "new", 0.95], ["gamasa", "جمصة", "city", 0.84], ["talkha", "طلخا", "markaz", 0.85], ["mitghamr", "ميت غمر", "markaz", 0.84], ["dekernes", "دكرنس", "markaz", 0.82], ["aga", "أجا", "markaz", 0.82], ["sinbillawein", "السنبلاوين", "markaz", 0.82], ["belqas", "بلقاس", "markaz", 0.82], ["sherbin", "شربين", "markaz", 0.82], ["menyanasr", "منية النصر", "markaz", 0.8], ["manzala", "المنزلة", "markaz", 0.8], ["temai", "تمي الأمديد", "markaz", 0.8], ["gamalia", "الجمالية", "markaz", 0.8], ["matariya_d", "المطرية", "markaz", 0.8], ["baniobeid", "بني عبيد", "markaz", 0.8], ["nabaroh", "نبروه", "markaz", 0.8], ["mitsalsil", "ميت سلسيل", "markaz", 0.8]],
  gharbia: [["tanta", "طنطا", "city"], ["mahalla", "المحلة الكبرى", "city", 0.83], ["kafrzayat", "كفر الزيات", "markaz", 0.82], ["zefta", "زفتى", "markaz", 0.8], ["santa", "السنطة", "markaz", 0.8], ["qutur", "قطور", "markaz", 0.8], ["basyoun", "بسيون", "markaz", 0.8], ["samannoud", "سمنود", "markaz", 0.8]],
  menoufia: [["shebin", "شبين الكوم", "city", 0.82], ["sadat", "مدينة السادات", "new", 0.9], ["menouf", "منوف", "markaz", 0.8], ["ashmoun", "أشمون", "markaz", 0.8], ["bagour", "الباجور", "markaz", 0.8], ["quesna", "قويسنا", "markaz", 0.82], ["berketsaba", "بركة السبع", "markaz", 0.8], ["tala", "تلا", "markaz", 0.8], ["shohada", "الشهداء", "markaz", 0.8], ["sersellayan", "سرس الليان", "city", 0.8]],
  kafr: [["kafr_c", "كفر الشيخ", "city"], ["desouk", "دسوق", "markaz", 0.8], ["baltim", "بلطيم", "markaz"], ["fuwwah", "فوه", "markaz", 0.78], ["metoubes", "مطوبس", "markaz", 0.78], ["hamoul", "الحامول", "markaz", 0.78], ["biyala", "بيلا", "markaz", 0.78], ["riyadh_k", "الرياض", "markaz", 0.78], ["sidisalem", "سيدي سالم", "markaz", 0.78], ["qallin", "قلين", "markaz", 0.78]],
  damietta: [["damietta_c", "دمياط", "city"], ["newdamietta", "دمياط الجديدة", "new", 0.88], ["portdamietta", "ميناء دمياط", "zone", 0.9], ["rasbar", "رأس البر", "city"], ["ezbetborg", "عزبة البرج", "city", 0.82], ["faraskur", "فارسكور", "markaz", 0.82], ["zarqa", "الزرقا", "markaz", 0.8], ["kafrsaad", "كفر سعد", "markaz", 0.8], ["kafrbatikh", "كفر البطيخ", "city", 0.8]],
  sharqia: [["ramadan", "العاشر من رمضان", "new", 0.92], ["salhiya", "الصالحية الجديدة", "new", 0.88], ["zagazig", "الزقازيق", "city", 0.85], ["belbeis", "بلبيس", "markaz", 0.85], ["menyaqamh", "منيا القمح", "markaz", 0.82], ["abuhammad", "أبو حماد", "markaz", 0.82], ["abukabir", "أبو كبير", "markaz", 0.8], ["faqous", "فاقوس", "markaz", 0.8], ["hehya", "ههيا", "markaz", 0.8], ["ibrahimiya", "الإبراهيمية", "markaz", 0.8], ["qurein", "القرين", "city", 0.8], ["mashtoul", "مشتول السوق", "markaz", 0.8], ["qenayat", "القنايات", "city", 0.8], ["diarbnegm", "ديرب نجم", "markaz", 0.8], ["kafrsaqr", "كفر صقر", "markaz", 0.78], ["awladsaqr", "أولاد صقر", "markaz", 0.78], ["husseiniya", "الحسينية", "markaz", 0.78], ["sanhagar", "صان الحجر", "markaz", 0.78]],
  portsaid: [["eastps", "شرق بورسعيد (المنطقة الاقتصادية)", "zone", 1.0], ["ps_c", "بورسعيد", "city"], ["sharq_ps", "حي الشرق", "district"], ["arab", "حي العرب", "district"], ["manakh", "حي المناخ", "district"], ["zohour", "حي الزهور", "district"], ["dawahy", "حي الضواحي", "district", 0.88], ["portfouad", "بورفؤاد", "city"]],
  ismailia: [["ism_c", "الإسماعيلية", "city"], ["newism", "الإسماعيلية الجديدة", "new", 0.9], ["qantarasharq", "القنطرة شرق", "markaz"], ["fayed", "فايد", "markaz", 0.86], ["qantaragharb", "القنطرة غرب", "markaz", 0.85], ["tellkebir", "التل الكبير", "markaz", 0.82], ["abusuweir", "أبو صوير", "markaz", 0.82], ["qassasin", "القصاصين", "markaz", 0.82]],
  suez: [["sokhna", "العين السخنة", "zone", 1.05], ["galala", "الجلالة", "new", 1.05], ["attaka", "عتاقة", "district", 0.95], ["suez_c", "السويس", "city", 0.92], ["arbaeen", "الأربعين", "district", 0.92], ["faisal_s", "فيصل", "district", 0.92], ["ganayen", "الجناين", "district", 0.9]],
  northsinai: [["arish", "العريش", "city"], ["birabd", "بئر العبد", "markaz", 0.98], ["sheikhzuweid", "الشيخ زويد", "markaz", 0.95], ["rafah", "رفح", "markaz", 0.95], ["hasana", "الحسنة", "markaz", 0.95], ["nakhl", "نخل", "markaz", 0.95]],
  southsinai: [["sharm", "شرم الشيخ", "city"], ["dahab", "دهب", "city", 1.02], ["rassedr", "رأس سدر", "markaz", 1.02], ["aburudeis", "أبو رديس", "markaz", 1.02], ["tur", "الطور", "city", 1.0], ["nuweiba", "نويبع", "city", 1.0], ["taba", "طابا", "city", 1.0], ["abuzenima", "أبو زنيمة", "markaz", 1.0], ["catherine", "سانت كاترين", "markaz", 0.98]],
  redsea: [["gouna", "الجونة", "zone"], ["hurghada", "الغردقة", "city", 1.0], ["rasghareb", "رأس غارب", "markaz"], ["safaga", "سفاجا", "markaz"], ["marsaalam", "مرسى علم", "markaz"], ["quseir", "القصير", "markaz", 1.02], ["shalateen", "شلاتين", "markaz", 1.0], ["halayeb", "حلايب", "markaz", 1.0]],
  fayoum: [["fay_c", "الفيوم", "city"], ["newfayoum", "الفيوم الجديدة", "new", 0.82], ["senouris", "سنورس", "markaz", 0.78], ["itsa", "إطسا", "markaz", 0.76], ["tamiya", "طامية", "markaz", 0.76], ["ibsheway", "أبشواي", "markaz", 0.76], ["yousefsedik", "يوسف الصديق", "markaz", 0.76]],
  benisuef: [["bs_c", "بني سويف", "city"], ["newbs", "بني سويف الجديدة", "new", 0.84], ["wasta", "الواسطى", "markaz", 0.78], ["nasser", "ناصر", "markaz", 0.78], ["ehnasia", "إهناسيا", "markaz", 0.78], ["beba", "ببا", "markaz", 0.78], ["fashn", "الفشن", "markaz", 0.78], ["somosta", "سمسطا", "markaz", 0.76]],
  minya: [["minya_c", "المنيا", "city"], ["newminya", "المنيا الجديدة", "new", 0.82], ["maghagha", "مغاغة", "markaz", 0.78], ["banimazar", "بني مزار", "markaz", 0.78], ["samalut", "سمالوط", "markaz", 0.78], ["mallawi", "ملوي", "markaz", 0.78], ["adwa", "العدوة", "markaz", 0.76], ["matay", "مطاي", "markaz", 0.76], ["abuqurqas", "أبو قرقاص", "markaz", 0.76], ["deirmawas", "دير مواس", "markaz", 0.76]],
  assiut: [["assiut_c", "أسيوط", "city"], ["newassiut", "أسيوط الجديدة", "new", 0.84], ["dairut", "ديروط", "markaz", 0.78], ["qusiya", "القوصية", "markaz", 0.78], ["manfalut", "منفلوط", "markaz", 0.78], ["abnub", "أبنوب", "markaz", 0.78], ["fath", "الفتح", "markaz", 0.78], ["abutig", "أبو تيج", "markaz", 0.78], ["sahelselim", "ساحل سليم", "markaz", 0.76], ["badari", "البداري", "markaz", 0.76], ["sedfa", "صدفا", "markaz", 0.76], ["ghanayem", "الغنايم", "markaz", 0.76]],
  sohag: [["sohag_c", "سوهاج", "city"], ["newsohag", "سوهاج الجديدة", "new", 0.8], ["akhmim", "أخميم", "markaz", 0.76], ["girga", "جرجا", "markaz", 0.76], ["tahta", "طهطا", "markaz", 0.76], ["balyana", "البلينا", "markaz", 0.75], ["maragha", "المراغة", "markaz", 0.75], ["monshaa", "المنشأة", "markaz", 0.75], ["darelsalam_s", "دار السلام", "markaz", 0.75], ["tema", "طما", "markaz", 0.75], ["juhayna", "جهينة", "markaz", 0.74], ["saqulta", "ساقلتة", "markaz", 0.74], ["asirat", "العسيرات", "markaz", 0.74]],
  qena: [["qena_c", "قنا", "city"], ["newqena", "قنا الجديدة", "new", 0.82], ["nagh", "نجع حمادي", "markaz", 0.82], ["qus", "قوص", "markaz", 0.77], ["abutesht", "أبو تشت", "markaz", 0.76], ["farshut", "فرشوط", "markaz", 0.76], ["deshna", "دشنا", "markaz", 0.76], ["waqf", "الوقف", "markaz", 0.76], ["qift", "قفط", "markaz", 0.76], ["naqada", "نقادة", "markaz", 0.76]],
  luxor: [["luxor_c", "الأقصر", "city"], ["newluxor", "طيبة الجديدة", "new", 0.83], ["tod", "الطود", "markaz", 0.78], ["esna", "إسنا", "markaz", 0.78], ["armant", "أرمنت", "markaz", 0.78], ["qurna", "القرنة", "markaz", 0.78], ["bayadiya", "البياضية", "markaz", 0.77], ["zeiniya", "الزينية", "markaz", 0.77]],
  aswan: [["aswan_c", "أسوان", "city"], ["newaswan", "أسوان الجديدة", "new", 0.86], ["toshka", "توشكى", "zone", 1.05], ["abusimbel", "أبو سمبل", "city"], ["komombo", "كوم أمبو", "markaz", 0.82], ["edfu", "إدفو", "markaz", 0.82], ["daraw", "دراو", "markaz", 0.8], ["nasrnuba", "نصر النوبة", "markaz", 0.8], ["kalabsha", "كلابشة", "markaz", 0.8]],
  newvalley: [["kharga", "الخارجة", "city"], ["dakhla", "الداخلة", "markaz"], ["farafra", "الفرافرة", "markaz", 0.84], ["paris", "باريس", "markaz", 0.82], ["balat", "بلاط", "markaz", 0.82]],
};

export const gov = (key?: any) => GOVS.find((g) => g[0] === key) || GOVS[0];

export const govName = (key?: any) => gov(key)[1];

export const regionName = (key?: any) => (REGIONS.find((r) => r[0] === key) || REGIONS[0])[1];

export const citiesOf = (govKey?: any) => CITIES[govKey] || [];

export const cityOf = (govKey?: any, cityKey?: any) => cityKey ? citiesOf(govKey).find((c) => c[0] === cityKey) : null;

export const areaOf = cityOf;

export const cityName = (govKey?: any, cityKey?: any) => { const c = cityOf(govKey, cityKey); return c ? c[1] : ""; };

export const placeName = (govKey?: any, cityKey?: any) => { const c = cityOf(govKey, cityKey); return c ? `${c[1]} · ${govName(govKey)}` : govName(govKey); };

export const placeShort = (govKey?: any, cityKey?: any) => { const c = cityOf(govKey, cityKey); return c ? c[1] : govName(govKey); };

export const placeMult = (govKey?: any, cityKey?: any) => { const c = cityOf(govKey, cityKey); return c && c[3] != null ? c[3] : gov(govKey)[3]; };

export const CITY_COUNT = Object.values(CITIES).reduce((a, l) => a + l.length, 0);

// Typical monthly rent for an engineer (1–2 bedrooms), modeled 2026
export const RENT = { cairo: 9500, giza: 8500, qalyubia: 5500, alexandria: 7500, matrouh: 6000, beheira: 4000, dakahlia: 5000, gharbia: 4500, menoufia: 4000, kafr: 3800, damietta: 4500, sharqia: 4500, portsaid: 5500, ismailia: 5000, suez: 5500, benisuef: 3800, fayoum: 3500, minya: 3500, assiut: 4000, sohag: 3300, qena: 3300, luxor: 3800, aswan: 4000, redsea: 7000, southsinai: 7500, northsinai: 4500, newvalley: 3000 };

export const RENT_AREA = { nac: 12000, newcairo: 14000, rehab: 13000, madinaty: 13000, zayed: 13000, oct: 11000, heliopolis: 11000, zamalek: 16000, maadi: 12000, alamein: 15000, hekma: 15000, newmansoura: 7000, sokhna: 9000, galala: 9000, ramadan: 5500, sadat: 4500, eastps: 6500, toshka: 0, gouna: 12000, sharm: 9000, smouha: 9000 };

export const rentFor = (g?: any, a?: any) => (a && RENT_AREA[a] != null) ? RENT_AREA[a] : (RENT[g] || 5000);
