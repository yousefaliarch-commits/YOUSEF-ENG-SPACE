

// ---- Contact details are ALLOWED everywhere. detectContact() only recognises them: the job parser lifts them into the ad's contact card,
//      and public posts get a soft "this will be visible to everyone" hint. It never blocks. ----
export const DIGIT_WORDS = { "صفر": "0", "زيرو": "0", "واحد": "1", "اتنين": "2", "اثنين": "2", "تلاتة": "3", "ثلاثة": "3", "اربعة": "4", "أربعة": "4", "خمسة": "5", "ستة": "6", "سبعة": "7", "تمانية": "8", "ثمانية": "8", "تسعة": "9", zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };

export const normalizeText = (s?: any) => {
  let t = String(s || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0));
  t = t.replace(/(^|[\s(])[oO](?=[\doO]*\d)/g, "$10"); for (let i = 0; i < 4; i++) t = t.replace(/(\d)[oO](?=[\doO]*\d)/g, "$10");
  t = t.split(/(\s+|[،,.])/).map((tok) => { const k = tok.toLowerCase(); return DIGIT_WORDS[k] != null ? DIGIT_WORDS[k] : tok; }).join("");
  return t;
};

export const CONTACT_KINDS = { phone: "رقم هاتف", email: "بريد إلكتروني", url: "رابط" };

export function detectContact(raw?: any) {
  const text = normalizeText(raw); const hits: any = []; const push = (kind?: any, m?: any) => { if (m && !hits.some((h) => h.kind === kind && h.match === m)) hits.push({ kind, label: CONTACT_KINDS[kind], match: m }); };
  (text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi) || []).forEach((m) => push("email", m.trim()));
  (text.match(/(?:\+?20|0)\s?1[0125](?:[\s\-]?\d){8}\b|\+?\d[\d\s\-().]{7,}\d/g) || []).forEach((m) => { const d = m.replace(/\D/g, ""); if (d.length >= 8 && d.length <= 15 && !/^20\d\d$/.test(d)) push("phone", m.trim()); });
  (text.match(/(?:https?:\/\/|www\.)[^\s]+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|eg|io|me|co|link|app|dev|info|site|sa|ae|uk)\b(?:\/\S*)?/gi) || []).forEach((m) => { if (!/@/.test(m)) push("url", m); });
  const email = (hits.find((h) => h.kind === "email") || {}).match || null; const phone = (hits.find((h) => h.kind === "phone") || {}).match || null;
  return { found: hits.length > 0, hits, email, phone: phone ? phone.replace(/[\s\-().]/g, "") : null };
}


// =====================================================================
//  Language filter — the ONLY restriction on text anywhere on the platform (posts, replies, reviews, private messages, job ads).
//  Phones, e-mails, links and handles are allowed. What is blocked: profanity, insults aimed at a person, threats, hate speech and
//  sexual harassment — in Arabic, Franco-Arabic and English, including spaced/dotted/leet obfuscations and stretched letters.
// =====================================================================
export const LANG_KINDS = { profanity: "سباب أو ألفاظ نابية", insult: "إهانة موجّهة لشخص", threat: "تهديد", hate: "تمييز أو كراهية", sexual: "تحرّش أو إيحاء جنسي", tone: "لهجة حادّة" };

export const AR_PROFANITY = ["كس", "كسم", "كسمك", "كسمه", "كسمها", "كسمكم", "كسامك", "خول", "خولات", "شرموط", "شرموطه", "شراميط", "عرص", "عرصه", "معرص", "معرصين", "متناك", "متناكه", "متناكين", "منيك", "منيوك", "منيوكه", "منيوكين", "زب", "زبي", "زبر", "طيز", "احا", "اححا", "نيك", "انيك", "ينيك", "نيكه", "قحبه", "قحاب", "لبوه", "لبوات", "خرا", "خراء", "بعر", "يلعن", "زانيه", "عاهره", "عاهرات", "داعر", "لوطي"];

export const AR_PROFANITY_PHRASES = ["ابن الوسخه", "بنت الوسخه", "ابن المتناكه", "ابن الشرموطه", "ابن كلب", "ابن الكلب", "ولاد الكلب", "بنت الكلب", "يلعن ابوك", "يلعن دينك", "يلعن امك", "لعنه الله عليك", "الله ياخدك", "الله يخربيتك", "الله يلعنك", "كس ام", "روح في داهيه", "غور من وشي"];

export const AR_MILD = ["زفت", "وسخ", "وسخه", "قرف", "مقرف", "مقرفه", "هباب"];

export const AR_INSULTS = ["غبي", "غبيه", "اغبياء", "حمار", "حماره", "حمير", "بهيم", "بهيمه", "بهايم", "جاهل", "جاهله", "جهله", "حيوان", "حيوانه", "حيوانات", "كلب", "كلبه", "كلاب", "خنزير", "خنزيره", "قذر", "قذره", "حقير", "حقيره", "زباله", "تافه", "تافهه", "فاشل", "فاشله", "معفن", "معفنه", "متخلف", "متخلفه", "عبيط", "عبيطه", "هبله", "اهبل", "اهطل", "مجنون", "مجنونه", "نصاب", "نصابه", "حرامي", "حراميه", "كداب", "كدابه", "منافق", "منافقه", "صايع", "صايعه", "بلطجي", "منحط", "منحطه", "وقح", "وقحه", "سافل", "سافله"];

export const AR_THREATS = ["هقتلك", "هموتك", "هدبحك", "هضربك", "هكسرك", "هكسر راسك", "هكسرلك", "هوريك", "هخليك تندم", "هخرب بيتك", "هندمك", "هاجيلك", "هعرف اجيبك", "هفضحك", "هنشر صورك", "هنشر بياناتك", "هجيبك", "لو شفتك", "احذر مني", "هعمل فيك", "هوديك في داهيه", "هطلعك من الشركه", "هاخد حقي منك", "هضربك بالجزمه"];

export const AR_HATE = ["زنجي", "زنوج", "زنجيه", "كروزي", "كروزيه", "رافضي", "ناصبي", "مجوسي"];

export const AR_HATE_ADDR = ["عبد", "عبده", "نصراني", "نصرانيه", "كافر", "كافره", "يهودي", "يهوديه", "صليبي", "شيعي", "وهابي", "اخواني", "عبيد"];

export const AR_SEXUAL = ["ابعتي صورتك", "ابعت صورتك", "ابعتيلي صورتك", "ابعتلي صورتك", "صورتك ليا", "عايز صورتك", "عاوز صورتك", "جسمك", "صدرك", "خصرك", "بوسه", "ابوسك", "احضنك", "نتقابل لوحدنا", "تعالي عندي", "نامي معايا", "مثيره", "انتي مثيره", "يا مزه", "مزه", "يا قمر", "يا حلوه", "يا حبيبتي", "حبيبتي", "يا روحي", "يا عمري", "بحبك", "عايزك ليا", "نبقى لوحدنا", "شكل جسمك"];

export const AR_SEXUAL_MILD = ["انتي حلوه", "شكلك حلو", "عيونك", "صوتك حلو", "يا حبيبي", "يا جميل", "يا عسل", "مسا الورد"];

export const AR_NAME_EXCEPTIONS = new Set(["خوله", "زبيده", "عبده", "عبدالله", "عبدالرحمن"]);

export const FR_PROFANITY = ["kos", "koss", "kosom", "kosomak", "kosommak", "kosomk", "kosomek", "kosomkom", "kosmk", "ksm", "ksmk", "khawal", "5awal", "5wal", "khwal", "5awalat", "sharmota", "sharmoota", "shrmota", "sharameet", "3ars", "3rs", "m3ars", "m3rs", "metnak", "mtnak", "metnaka", "manyak", "manyk", "manyoka", "zeby", "zoby", "zobr", "zobrak", "zebi", "zeb", "teez", "teezak", "a7a", "a7aa", "neek", "ne2ek", "nek", "yneek", "2a7ba", "a7ba", "labwa", "lbwa", "5ara", "khara", "yel3an", "3ahera", "3ahra"];

export const FR_INSULTS = ["ghabi", "8abi", "ghaby", "7omar", "7mar", "homar", "bahim", "7ayawan", "hayawan", "kalb", "5anzeer", "khanzeer", "zbala", "zebala", "tafeh", "fashel", "3abeet", "3beet", "habla", "ahbal", "meta5alef", "mota5alef", "7aramy", "7arami", "nassab", "kaddab", "kadab", "sa2et", "safel", "wa2e7"];

export const EN_PROFANITY = ["fuck", "fucking", "fucker", "fucked", "fuk", "fck", "fcuk", "shit", "sht", "bullshit", "bitch", "btch", "bitches", "asshole", "ass", "bastard", "dick", "dickhead", "cunt", "motherfucker", "mofo", "whore", "slut", "pussy", "cock", "wanker", "prick", "stfu", "piss", "screw you", "go to hell", "twat", "douche", "douchebag", "jackass", "faggot", "fag"];

export const EN_INSULTS = ["idiot", "idiots", "moron", "morons", "retard", "retarded", "dumbass", "jerk", "scumbag", "imbecile", "loser", "losers"];

export const EN_MILD = ["stupid", "dumb", "pathetic", "trash", "damn", "wtf", "crap", "sucks", "garbage", "shut up"];

export const EN_THREATS = ["kill you", "i will kill", "ill kill", "hurt you", "beat you", "break your", "you will regret", "youll regret", "i know where you live", "expose you", "destroy you", "i will find you", "watch your back"];

export const EN_HATE = ["nigger", "nigga", "kike", "raghead", "towelhead", "sand nigger", "chink", "spic", "wetback"];

export const EN_SEXUAL = ["sexy", "hot girl", "nudes", "send pic", "send me a pic", "send me your pic", "your body", "sleep with", "hook up", "date me", "you are hot", "youre hot", "so hot", "babe", "baby girl", "kiss you", "hug you", "my love", "sweetheart", "honey"];

export const arNorm = (s?: any) => s.replace(/[ً-ْـ‏‎]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/گ/g, "ك").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));

export const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s", "!": "i", "|": "l" };

export const AR_PREFIX = /^(?:و|ف|ب|ل|ك|ال|لل|وال|بال|فال|يا)/;
 export const AR_SUFFIX = /(?:كم|كو|هم|هن|ها|ين|ات|ني|نا|ك|ه|ي|و)$/;

export function langNormalize(raw?: any) {
  let t = arNorm(String(raw || "")).toLowerCase().replace(/['’]/g, "");
  t = t.replace(/([ء-يa-z0-9])[.\-_*·]+(?=[ء-يa-z0-9])/g, "$1");
  t = t.replace(/(?:^|\s)((?:[ء-يa-z]\s){2,}[ء-يa-z])(?=\s|$)/g, (m, g) => " " + g.replace(/\s/g, ""));
  t = t.replace(/(.)\1{2,}/g, "$1$1");
  return " " + t.replace(/[^ء-يa-z0-9@$!|\s]+/g, " ").replace(/\s+/g, " ").trim() + " ";
}

export const mask = (s?: any) => s.split(" ").map((w) => (w.length <= 1 ? w : w[0] + "•".repeat(Math.min(6, w.length - 1)))).join(" ");

export const arCandidates = (tok?: any) => { const out = new Set([tok, tok.replace(/(.)\1+/g, "$1")]); [...out].forEach((t) => { const p = t.replace(AR_PREFIX, ""); const s = t.replace(AR_SUFFIX, ""); const ps = p.replace(AR_SUFFIX, ""); [p, s, ps].forEach((x) => { if (x.length >= 2) out.add(x); }); }); return [...out]; };

export const latCandidates = (tok?: any) => { const base = tok; const leet = base.replace(/[0134578@$!|]/g, (c) => LEET[c] || c); const out = new Set([base, leet, base.replace(/(.)\1+/g, "$1"), leet.replace(/(.)\1+/g, "$1"), base.replace(/s$/, ""), leet.replace(/s$/, "")]); return [...out]; };

export function screenLanguage(raw?: any) {
  const text = langNormalize(raw); const hits: any = []; const warnings: any = [];
  const hit = (kind?: any, m?: any) => { const mm = mask(m.trim()); if (!hits.some((h) => h.kind === kind && h.match === mm)) hits.push({ kind, label: LANG_KINDS[kind], match: mm }); };
  const warn = (kind?: any, m?: any) => { const s = `${LANG_KINDS[kind]}: «${mask(m.trim())}» — خفّف اللهجة أو اجعلها عن الفعل لا الشخص`; if (!warnings.includes(s)) warnings.push(s); };
  const has = (phrase?: any) => text.includes(" " + phrase + " ");
  AR_PROFANITY_PHRASES.forEach((p) => { if (has(p)) hit("profanity", p); });
  AR_THREATS.forEach((p) => { if (has(p)) hit("threat", p); }); EN_THREATS.forEach((p) => { if (has(p)) hit("threat", p); });
  AR_SEXUAL.forEach((p) => { if (has(p)) hit("sexual", p); }); EN_SEXUAL.forEach((p) => { if (has(p)) hit("sexual", p); });
  AR_SEXUAL_MILD.forEach((p) => { if (has(p)) warn("sexual", p); });
  EN_PROFANITY.filter((p) => p.includes(" ")).forEach((p) => { if (has(p)) hit("profanity", p); }); EN_MILD.filter((p) => p.includes(" ")).forEach((p) => { if (has(p)) warn("tone", p); });
  EN_HATE.forEach((p) => { if (has(p)) hit("hate", p); });
  const tokens = text.trim().split(" ").filter(Boolean);
  tokens.forEach((tok, i) => {
    if (/^[ء-ي]+$/.test(tok)) {
      if (AR_NAME_EXCEPTIONS.has(tok)) return;
      const cands = arCandidates(tok);
      if (cands.some((c) => AR_PROFANITY.includes(c))) { hit("profanity", tok); return; }
      if (cands.some((c) => AR_HATE.includes(c))) { hit("hate", tok); return; }
      const prev = tokens[i - 1] || "", next = tokens[i + 1] || ""; const addressed = /^(?:يا|انت|انتي|انتو|انتم|انتوا|ياابن|يابن)$/.test(prev) || /^(?:انت|انتي)$/.test(next);
      if (cands.some((c) => AR_HATE_ADDR.includes(c)) && addressed) { hit("hate", prev + " " + tok); return; }
      if (cands.some((c) => AR_INSULTS.includes(c))) { if (addressed) hit("insult", (prev ? prev + " " : "") + tok); else warn("insult", tok); return; }
      if (cands.some((c) => AR_MILD.includes(c))) warn("tone", tok);
    } else if (/^[a-z0-9@$!|]+$/.test(tok)) {
      const cands = latCandidates(tok);
      if (cands.some((c) => FR_PROFANITY.includes(c) || EN_PROFANITY.includes(c))) { hit("profanity", tok); return; }
      if (cands.some((c) => EN_HATE.includes(c))) { hit("hate", tok); return; }
      const prev = tokens[i - 1] || ""; const addressed = /^(?:ya|enta|enty|inta|inti|you|u|youre|ur|are)$/.test(prev) || /^(?:يا|انت|انتي)$/.test(prev);
      if (cands.some((c) => EN_INSULTS.includes(c))) { hit("insult", tok); return; }
      if (cands.some((c) => FR_INSULTS.includes(c))) { if (addressed) hit("insult", prev + " " + tok); else warn("insult", tok); return; }
      if (cands.some((c) => EN_MILD.includes(c))) warn("tone", tok);
    }
  });
  const order: any = ["threat", "hate", "sexual", "profanity", "insult"]; hits.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return { blocked: hits.length > 0, hits, warnings, clean: text.trim() };
}

export const LANGUAGE_POLICY = "EngSpace لا يقيّد ما تشاركه من وسائل تواصل — رقمك وبريدك وروابطك لك. القيد الوحيد هو اللغة: لا سباب، لا إهانة موجّهة لشخص، لا تهديد، لا تمييز، لا تحرّش — بالعربية أو الفرانكو أو الإنجليزية، مهما كانت طريقة كتابتها.";
