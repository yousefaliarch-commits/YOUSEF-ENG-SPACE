import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck, Briefcase, Building2, Camera, CircleAlert, CircleCheck, EyeOff, FileCheck, FileUp, Hourglass, 
  IdCard, LoaderCircle, LockKeyhole, RotateCcw, ScrollText, Send, ShieldCheck, Trash2, UserCog, X
} from "lucide-react";
import { DIVISIONS, discName, divConflict, divOf, divisionForDisc } from "../../domain/division";
import { THIS_YEAR, accIdOf, cleanName, gx, hasSession, memberAccId, randHex } from "../../domain/identity";
import { canVerifyRole, genderOf, roleTitle, tracksFor } from "../../domain/taxonomy";
import { loadPdf } from "../../lib/vendor";
import { L2, L3, say, trIn, whenIn } from "../../i18n/i18n";
import { loadPersona } from "../../lib/helpers";
import { processImage } from "../../lib/media";
import { blobToDataUrl, compressCanvas } from "../../lib/compress";
import { reduced } from "../../lib/runtime";
import { Chip, Num, Primary, Quiet, RoundButton, Secondary } from "../../ui/primitives";

// =====================================================================
//  Verification — optional, for engineers and site supervisors only, reviewed 100 % by hand
//  · Employer accounts (HR, business owners) are never verified: their role badge — «موارد بشرية» / «صاحب عمل» — says who they are.
//  · An engineer submits the Syndicate card and/or the graduation certificate (a site supervisor: a certificate or an experience
//    letter). The page only re-encodes each image (no EXIF, long side ≤ 1600 px). Nothing is read, scored or judged automatically,
//    and the member sees no processing steps — only «Reading submitted details…», then «Credentials under review».
//  · A person on the EngSpace administration reviews every request in the admin console («طلبات التوثيق»).
//  · The images exist only while the request waits for that review. The moment it is approved or rejected — or the member
//    withdraws it, or VERIFY_TTL_DAYS pass — they are purged, and the record keeps only the decision (status, division,
//    graduation year, reference).
//  · In this preview the review queue lives in the app's shared store, which the admin console reads too. The member's own
//    pending request also waits in this browser (a reload must not lose it) and is erased from it at the same moment.
// =====================================================================
export const VERIFY_KEY = "engspace.verify.v1", VERIFY_TTL_DAYS = 7, VERIFY_SLA_H = 24;

export const DOC_SLOTS = {
  card: { icon: IdCard, pdf: false, title: L2("كارنيه نقابة المهندسين", "Engineers Syndicate card"), short: L2("كارنيه النقابة", "Syndicate card"), hint: L2("الوجه الأمامي كاملًا: الاسم والشعبة وسنة التخرج مقروءة", "The whole front side, with the name, division and graduation year legible") },
  cert: { icon: ScrollText, pdf: true, title: L2("شهادة التخرج", "Graduation certificate"), short: L2("شهادة التخرج", "Graduation certificate"), hint: L2("صورة أو PDF: الاسم والتخصص وسنة التخرج مقروءة", "A photo or PDF, with the name, major and graduation year legible") },
  letter: { icon: ScrollText, pdf: true, title: L2("شهادة أو إفادة خبرة", "Certificate or experience letter"), short: L2("شهادة / إفادة خبرة", "Certificate / experience letter"), hint: L2("صورة أو PDF: الاسم والمسمّى وجهة العمل مقروءة", "A photo or PDF, with the name, job title and employer legible") },
};

export const docSlots = (role?: any) => (role === "supervisor" ? ["letter"] : ["card", "cert"]);

export const DOC_ERRORS = {
  big: L2("الملف أكبر من 15 ميجابايت — صوّر المستند من جديد أو اختر ملفًا أصغر", "The file is over 15 MB — take a new photo or choose a smaller file"),
  small: L2("الصورة صغيرة جدًا لتُقرأ — صوّر المستند من مسافة أقرب", "The image is too small to read — photograph the document from closer"),
  decode: L2("تعذّر فتح الملف — استخدم صورة JPG أو PNG أو ملف PDF", "The file couldn't be opened — use a JPG or PNG photo, or a PDF"),
};

export const VERIFY_REJECT: any = [
  ["unclear", L2("الصورة غير واضحة أو مقصوصة", "The photo is unclear or cropped")],
  ["mismatch", L2("الاسم في المستند لا يطابق اسم الحساب", "The name on the document doesn't match the account name")],
  ["wrongdoc", L2("المستند ليس كارنيه نقابة ولا شهادة تخرج", "The document isn't a Syndicate card or a graduation certificate")],
  ["expired", L2("عضوية النقابة في الكارنيه منتهية", "The Syndicate membership on the card has expired")],
  ["altered", L2("في المستند علامات تعديل", "The document shows signs of alteration")],
  ["other", L2("سبب آخر", "Another reason")],
];

export const rejectOf = (id?: any) => (VERIFY_REJECT.find((r) => r[0] === id) || VERIFY_REJECT[VERIFY_REJECT.length - 1])[1];

// What the badge says, per the document the reviewer accepted
export const credentialL2 = (role?: any, kind?: any) => (role === "supervisor" ? L2("مؤهل موثّق", "Verified qualification") : kind === "certificate" ? L2("شهادة هندسية موثّقة", "Verified engineering degree") : L2("عضوية نقابة موثّقة", "Verified Syndicate membership"));

export const DEPT_AR = { civil: "الهندسة المدنية", architecture: "الهندسة المعمارية", mechanical: "هندسة القوى الميكانيكية", electrical: "هندسة القوى والآلات الكهربية", chemical: "الهندسة الكيميائية", mining: "هندسة التعدين والبترول", textile: "هندسة الغزل والنسيج" };


// ---- one document → re-encoded on this device (document profile: legibility first, ~250 KB); a PDF → its first page ----
export async function prepDoc(file?: any) {
  if (!file) throw new Error("decode"); if (file.size > 25e6) throw new Error("big");
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!pdf) { const im = await processImage(file, { profile: "document" }); if (Math.min(im.w, im.h) < 500) throw new Error("small"); return { src: im.src, w: im.w, h: im.h }; }
  let doc = null;
  try {
    const lib = await loadPdf();
    // isEvalSupported: false — no eval of font programs from an uploaded PDF (CVE-2024-4367)
    doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1 }); const v2 = page.getViewport({ scale: Math.min(4, 1600 / Math.max(vp.width, vp.height)) });
    const c = document.createElement("canvas"); c.width = Math.round(v2.width); c.height = Math.round(v2.height); const x = c.getContext("2d"); x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: x, viewport: v2 }).promise; const z = await compressCanvas(c, "document"); const out: any = { src: await blobToDataUrl(z.blob), w: z.w, h: z.h, pdf: true }; c.width = 0; c.height = 0; return out;
  } catch (e) { throw new Error(e && e.message === "big" ? "big" : "decode"); }
  finally { if (doc) { try { await doc.destroy(); } catch (e) {} } }
}


// ---- demo documents: invented data, clearly marked, drawn on this device — never a real person's card ----
export function drawDemoDoc(kind?: any, { name = "—", division = "civil", year = 2018, gender = "male", blur = false, nameOnDoc = null }: any = {}) {
  const dv = divOf(division) || DIVISIONS[0]; const nm = nameOnDoc || name; const W = kind === "card" ? 1000 : 1400, H = kind === "card" ? 630 : 990;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); const font = (w?: any, s?: any) => `${w} ${s}px 'IBM Plex Sans Arabic', sans-serif`; x.direction = "rtl";
  const center = (text?: any, y?: any, f?: any, color?: any) => { x.textAlign = "center"; x.font = f; x.fillStyle = color; x.fillText(text, W / 2, y); };
  if (kind === "card") {
    x.fillStyle = "#f3efe4"; x.fillRect(0, 0, W, H); x.fillStyle = "#b8973f"; x.fillRect(0, 0, W, 96); center("نقابة المهندسين", 64, font("bold", 44), "#ffffff");
    [["الاسم", nm], ["الشعبة", dv.short], ["التخرج", String(year)], ["العضوية", `سارية حتى ${THIS_YEAR + 1}`], ["الرقم القومي", "•••• •••• •••• ••"]].forEach(([l, v]: any, i) => {
      const y = 172 + i * 68; x.textAlign = "right"; x.font = font("bold", 27); x.fillStyle = "#2f6b3a"; x.fillText(l + " :", 960, y); x.font = font("bold", 29); x.fillStyle = "#1f1f1f"; x.fillText(v, 760, y); });
    x.fillStyle = "#cfcabb"; x.fillRect(70, 150, 210, 270); x.textAlign = "center"; x.font = font("", 20); x.fillStyle = "#8a8578"; x.fillText("صورة", 175, 292);
    center("نموذج تجريبي — بيانات وهمية", 596, font("bold", 20), "#8a2b2b");
  } else if (kind === "cert") {
    x.fillStyle = "#f7f1de"; x.fillRect(0, 0, W, H); x.strokeStyle = "#7a5c1e"; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 3; x.strokeRect(70, 70, W - 140, H - 140);
    center("شهادة تخرج", 186, font("bold", 58), "#1f2a44"); center("جامعة تجريبية — كلية الهندسة", 250, font("", 32), "#1f2a44");
    center("تشهد الكلية بأن", 330, font("", 30), "#1f2a44"); center(nm, 392, font("bold", 42), "#1f2a44");
    center(`${genderOf(gender) === "female" ? "حصلت" : "حصل"} على درجة بكالوريوس الهندسة — ${DEPT_AR[dv.id] || DEPT_AR.civil}`, 462, font("", 30), "#1f2a44");
    center(`دور مايو ${year} · بتقدير عام جيد جدًا`, 516, font("", 28), "#1f2a44");
    x.strokeStyle = "#1f2a44"; x.lineWidth = 2; [1050, 350].forEach((cx) => { x.beginPath(); x.moveTo(cx - 150, 780); x.lineTo(cx + 150, 780); x.stroke(); });
    x.strokeStyle = "#8a2b2b"; x.lineWidth = 6; x.beginPath(); x.arc(700, 760, 74, 0, Math.PI * 2); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(700, 760, 58, 0, Math.PI * 2); x.stroke();
    center("نموذج تجريبي — بيانات وهمية", 900, font("bold", 22), "#8a2b2b");
  } else {
    x.fillStyle = "#fbfbf8"; x.fillRect(0, 0, W, H); x.fillStyle = "#23405f"; x.fillRect(0, 0, W, 110); center("شركة تجريبية للمقاولات العامة", 70, font("bold", 40), "#ffffff");
    center("إفادة خبرة", 210, font("bold", 50), "#1f1f1f");
    const f = genderOf(gender) === "female";
    [`تفيد الشركة بأن ${f ? "السيدة" : "السيد"} / ${nm}`, `${f ? "تعمل" : "يعمل"} لديها بوظيفة ${f ? "مشرفة" : "مشرف"} موقع منذ عام ${Number(year) + 2} وحتى تاريخه،`, "وقد أُعطيت هذه الإفادة بناءً على طلبه دون أدنى مسؤولية على الشركة."].forEach((l, i) => center(l, 320 + i * 64, font("", 31), "#1f1f1f"));
    x.strokeStyle = "#23405f"; x.lineWidth = 5; x.beginPath(); x.arc(360, 700, 80, 0, Math.PI * 2); x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(900, 720); x.lineTo(1180, 720); x.stroke();
    center("نموذج تجريبي — بيانات وهمية", 900, font("bold", 22), "#8a2b2b");
  }
  let out = c;
  if (blur) { const s = document.createElement("canvas"); s.width = Math.round(W / 7); s.height = Math.round(H / 7); s.getContext("2d").drawImage(c, 0, 0, s.width, s.height); const b = document.createElement("canvas"); b.width = W; b.height = H; b.getContext("2d").drawImage(s, 0, 0, W, H); s.width = 0; s.height = 0; out = b; }
  const url = out.toDataURL("image/jpeg", 0.85); if (out !== c) { out.width = 0; out.height = 0; } c.width = 0; c.height = 0; return url;
}

export const DEMO_DOCS = new Map();

// a document's image: an uploaded one, or a seeded demo drawn once on first view (and dropped with the request's purge)
export const docSrc = (r?: any, i?: any) => { const d = r && r.docs && r.docs[i]; if (!d) return null; if (d.src) return d.src; const k = r.id + ":" + i; if (!DEMO_DOCS.has(k)) DEMO_DOCS.set(k, drawDemoDoc(d.kind, d.demo || {})); return DEMO_DOCS.get(k); };


// ---- requests ----
export const verifyId = () => "V-" + randHex(6).toUpperCase();

export function newVerifyRequest(p?: any, docs?: any, now: any = Date.now()) {
  return { id: verifyId(), acc: memberAccId(p), pid: p.pid || null, mine: true, name: cleanName(p.name) || "—", gender: p.gender, role: p.role, disc: p.disc, gradYear: p.gradYear ? Number(p.gradYear) : null, gov: p.gov, city: p.city || null,
    docs: docs.map((d) => ({ kind: d.kind, src: d.src, w: d.w, h: d.h, pdf: !!d.pdf, sample: !!d.sample })), kinds: docs.map((d) => d.kind), at: now, status: "pending", decision: null, purged: 0, purgedAt: null };
}

// The purge: every image leaves the request for good (and the demo cache); what remains is the decision record
export const purgeRequest = (r?: any, status?: any, extra: any = {}, now: any = Date.now()) => { (r.docs || []).forEach((d, i) => DEMO_DOCS.delete(r.id + ":" + i)); const n = (r.docs || []).length; return { ...r, ...extra, status, docs: [], purged: (r.purged || 0) + n, purgedAt: n ? now : r.purgedAt || null }; };

// What the member's profile remembers about the request — never an image
export const verifySummary = (r?: any, extra: any = {}) => ({ id: r.id, at: r.at, kinds: r.kinds || [], status: r.status, purged: r.purged || 0, purgedAt: r.purgedAt || null, decidedAt: r.decision ? r.decision.at : null, ...extra });

// this browser's copy of the member's own pending request — written on submit, erased the moment it is decided or withdrawn
export const saveOwnRequest = (r?: any) => { if (!hasSession()) return false; try { localStorage.setItem(VERIFY_KEY, JSON.stringify(r)); return true; } catch (e) { return false; } };

export const loadOwnRequest = () => { try { const r = JSON.parse(localStorage.getItem(VERIFY_KEY) || "null"); return r && r.id && r.status === "pending" && Array.isArray(r.docs) ? r : null; } catch (e) { return null; } };

export const dropOwnRequest = () => { try { localStorage.removeItem(VERIFY_KEY); } catch (e) {} };

// Requests from other members waiting in the queue — demo documents with invented names, drawn when a reviewer opens them
export function seedVerifs(now: any = Date.now()) {
  const H = 3600e3;
  const mk = (id?: any, name?: any, gender?: any, role?: any, disc?: any, gradYear?: any, gov?: any, ago?: any, docs?: any) => ({ id, acc: accIdOf("verify:" + id), pid: null, mine: false, name, gender, role, disc, gradYear, gov, city: null,
    docs: docs.map(([kind, demo]: any) => ({ kind, demo: { name, gender, division: divisionForDisc(disc) || "civil", year: gradYear, ...demo } })), kinds: docs.map((d) => d[0]), at: now - ago * H, status: "pending", decision: null, purged: 0, purgedAt: null });
  const done = (r?: any, status?: any, decision?: any, kinds?: any, agoDecided?: any) => ({ ...r, status, docs: [], kinds, purged: kinds.length, purgedAt: now - agoDecided * H, decision: { by: "team", at: now - agoDecided * H, ...decision } });
  return [
    mk("V-7A21C3", "عمر حسين عبد الله", "male", "engineer", "civil", 2016, "cairo", 3, [["card", {}], ["cert", {}]]),
    mk("V-5E90B4", "سارة ماهر فتحي", "female", "engineer", "architecture", 2019, "giza", 9, [["cert", { nameOnDoc: "سلمى ماهر فتحي" }]]),
    mk("V-3D48A6", "ياسر جمال سعيد", "male", "engineer", "electrical", 2012, "alexandria", 20, [["card", { blur: true }]]),
    mk("V-2C11F8", "آية فؤاد رمضان", "female", "supervisor", "civil", 2014, "dakahlia", 27, [["letter", {}]]),
    done(mk("V-1B07D2", "مصطفى نبيل حسين", "male", "engineer", "mechanical", 2015, "cairo", 52, []), "approved", { division: "mechanical", gradYear: 2015, kind: "syndicate" }, ["card", "cert"], 49),
    done(mk("V-0F3A9E", "هبة سعيد ماهر", "female", "engineer", "civil", 2018, "giza", 30, []), "rejected", { reason: "mismatch", note: "" }, ["cert"], 26),
  ];
}

// The queue as it starts: the seeded requests + this member's own pending one, unless it expired or no longer matches the account
export function verifs0(now: any = Date.now()) {
  const out = seedVerifs(now); const own = loadOwnRequest(); if (!own) return out;
  const p = hasSession() ? loadPersona() : null;
  if (!p || own.pid !== p.pid || !p.pending || p.verifyRef !== own.id) { dropOwnRequest(); return out; } // a stale copy: not this account's open request
  // unreviewed for VERIFY_TTL_DAYS: the documents are erased now, and the app tells the member (see the reconcile effect in AppView)
  if (now - own.at > VERIFY_TTL_DAYS * 864e5) { dropOwnRequest(); return [purgeRequest({ ...own, mine: true }, "expired", { decision: { by: "system", at: now } }, now), ...out]; }
  return [{ ...own, mine: true }, ...out];
}


// =====================================================================
//  The member's side — one sheet: privacy guarantee → documents → «Reading submitted details…» → «Credentials under review» → decision
//  Written in both languages side by side (L2/L3), so the whole sheet is rendered translate="no".
// =====================================================================
export const VX = {
  promiseTitle: L2("ضمان الخصوصية", "Privacy guarantee"),
  promise: L2("يراجع فريق إدارة EngSpace طلب التوثيق يدويًا. تُحذف المستندات التي ترفعها حذفًا نهائيًا فور انتهاء المراجعة، ولا تُشارك مع أي أحد.", "Verification is reviewed manually by our administration. Your uploaded documents are permanently deleted immediately after review and are never shared with anyone."),
  p1: L2("يراجعها شخص من فريق الإدارة — لا خوارزمية ولا قراءة آلية.", "A person on our administration team reviews them — no algorithm, no automatic reading."),
  p2: L2("تُحذف لحظة القرار، قُبل الطلب أو رُفض — ولا تبقى أكثر من 7 أيام حتى لو لم تُراجع.", "Deleted the moment a decision is made, approved or rejected — and never kept longer than 7 days, even if not yet reviewed."),
  p3: L2("لا تُشارك مع أي صاحب عمل أو شركة أو جهة حكومية أو أي طرف ثالث — تحت أي ظرف.", "Never shared with any employer, company, government body or other third party — under any circumstances."),
  p4: L2("ما يبقى بعد المراجعة: حالة التوثيق والشعبة وسنة التخرج ورقم الطلب فقط.", "All that remains after review: the verification status, division, graduation year and request number."),
  introTitle: L3("أضف شارة «موثّق»", "أضيفي شارة «موثّق»", "Add the “Verified” badge"),
  introEng: L3("ارفع كارنيه نقابة المهندسين وشهادة التخرج — أو أحدهما إن لم يتوفر الآخر. الشارة تظهر في هويتيك العلنية والمجهولة.", "ارفعي كارنيه نقابة المهندسين وشهادة التخرج — أو أحدهما إن لم يتوفر الآخر. الشارة تظهر في هويتيك العلنية والمجهولة.", "Upload your Engineers Syndicate card and your graduation certificate — or one of them if you don't have the other. The badge shows on both your public and anonymous identities."),
  introSup: L3("ارفع شهادتك أو إفادة خبرة من جهة عملك. الشارة تظهر في هويتيك العلنية والمجهولة.", "ارفعي شهادتك أو إفادة خبرة من جهة عملك. الشارة تظهر في هويتيك العلنية والمجهولة.", "Upload your certificate or an experience letter from your employer. The badge shows on both your public and anonymous identities."),
  take: L3("صوّر", "صوّري", "Take photo"), retake: L3("صوّر من جديد", "صوّري من جديد", "Retake"), pick: L3("اختر ملفًا", "اختاري ملفًا", "Choose file"), replace: L2("استبدال", "Replace"), remove: L2("إزالة المستند", "Remove document"),
  attaching: L2("جارٍ الإرفاق…", "Attaching…"), attached: L2("مُرفق", "Attached"), sampleTag: L2("نموذج تجريبي", "sample"),
  sample: L2("جرّب بمستندات تجريبية (بيانات وهمية)", "Try with sample documents (made-up data)"),
  send: L2("إرسال للمراجعة", "Send for review"), needOne: L3("أرفق مستندًا واحدًا على الأقل", "أرفقي مستندًا واحدًا على الأقل", "Attach at least one document"),
  optional: L2("التوثيق اختياري تمامًا — كل خصائص التطبيق تعمل بدونه.", "Verification is entirely optional — every feature of the app works without it."),
  reading: L2("جارٍ قراءة البيانات المرسلة…", "Reading submitted details…"), readingSub: L2("لحظات ويصل طلبك إلى فريق المراجعة.", "One moment — your request is on its way to the review team."),
  sent: L2("وصل طلبك إلى فريق المراجعة", "Your request reached the review team"),
  pendingTitle: L2("بياناتك قيد المراجعة", "Credentials under review"),
  pendingSub: L2("يراجعها فريق الإدارة يدويًا، عادةً خلال 24 ساعة — ونخبرك فور القرار.", "Our administration team reviews them by hand, usually within 24 hours — we'll let you know as soon as there's a decision."),
  ref: L2("رقم الطلب", "Request no."), sentAt: L2("أُرسل", "Sent"), docs: L2("المستندات", "Documents"), reviewed: L2("رُوجع", "Reviewed"), division: L2("الشعبة", "Division"), grad: L2("سنة التخرج", "Graduation year"), credential: L2("الشارة", "Badge"),
  held: L2("المستندات محفوظة مؤقتًا لفريق المراجعة وحده، وتُحذف نهائيًا لحظة القرار.", "The documents are held only for the review team and are permanently deleted the moment a decision is made."),
  withdraw: L2("سحب الطلب وحذف المستندات", "Withdraw the request and delete the documents"), withdrawSure: L2("تأكيد — احذف المستندات الآن نهائيًا", "Confirm — delete the documents permanently now"), cancel: L2("تراجع", "Cancel"), close: L2("إغلاق", "Close"),
  okTitle: L2("حسابك موثّق", "Your account is verified"),
  okSub: L2("راجع فريق الإدارة مستنداتك واعتمدها. الشارة ظاهرة الآن في هويتيك العلنية والمجهولة.", "Our administration team reviewed and approved your documents. The badge now shows on both your public and anonymous identities."),
  noTitle: L2("لم يُعتمد طلب التوثيق", "Your verification request wasn't approved"), reason: L2("السبب", "Reason"), note: L2("ملاحظة المراجِع", "Reviewer's note"),
  again: L2("تقديم طلب جديد", "Submit a new request"),
  purged: (n?: any, when?: any, lang?: any) => (lang === "en" ? `${n === 1 ? "The document was" : `All ${n} documents were`} permanently deleted right after the review — ${when}.` : `حُذفت المستندات (${n}) نهائيًا فور المراجعة — ${when}.`),
  withdrawn: L2("سحبت طلبك السابق — وحُذفت مستنداته نهائيًا.", "You withdrew your previous request — its documents were permanently deleted."),
  expired: L2("لم يُراجَع طلبك السابق خلال 7 أيام — فحُذفت مستنداته نهائيًا. يمكنك التقديم من جديد.", "Your previous request wasn't reviewed within 7 days, so its documents were permanently deleted. You can submit again."),
  employer: L2("حسابات جهات العمل لا تحتاج توثيقًا", "Employer accounts don't need verification"),
  employerBody: L2("تظهر في كل مكان بشارة دورك — «صاحب عمل» أو «موارد بشرية» — دون رفع أي مستند.", "You appear everywhere with your role badge — “Employer” or “HR” — without uploading any document."),
};

export const toneBox = { good: "bg-good/15 text-good", bad: "bg-bad/15 text-bad", warn: "bg-warn/15 text-warn", accent: "bg-wash text-accent" };

export const StatusHead = ({ icon: I, tone = "accent", title, sub }: any) => (
  <div className="flex items-start gap-3"><span className={`grid place-items-center w-11 h-11 shrink-0 rounded-xl ${toneBox[tone]}`}><I size={20} /></span><div className="min-w-0"><h4 className="text-[16px] font-medium leading-snug">{title}</h4>{sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{sub}</p>}</div></div>
);

export const Facts = ({ rows }: any) => <dl className="grid grid-cols-2 gap-x-3 text-[11.5px]">{rows.filter(Boolean).map(([k, v]: any) => <div key={k} className="flex justify-between gap-2 border-b border-line py-1.5"><dt className="text-ink-3 shrink-0">{k}</dt><dd className="text-ink text-end leading-snug">{v}</dd></div>)}</dl>;

// The written guarantee, first thing on the submission screen
export function PrivacyPromise({ app, compact = false }: any) {
  const t = (x?: any) => say(app, x);
  return (
    <section aria-label={t(VX.promiseTitle)} className="rounded-2xl border border-good/25 bg-good/[0.06] p-3.5">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-good"><ShieldCheck size={15} className="shrink-0" /> {t(VX.promiseTitle)}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{t(VX.promise)}</p>
      {!compact && <ul className="mt-2.5 space-y-1.5">{[[UserCog, VX.p1], [Trash2, VX.p2], [EyeOff, VX.p3], [FileCheck, VX.p4]].map(([I, x]: any, i) => <li key={i} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-2"><I size={13} className="shrink-0 mt-[3px] text-good" /><span>{t(x)}</span></li>)}</ul>}
    </section>
  );
}

export function DocSlot({ app, kind, doc, busy, err, onFile, onRemove }: any) {
  const t = (x?: any) => say(app, x); const S = DOC_SLOTS[kind]; const I = S.icon; const camRef = useRef<any>(null), fileRef = useRef<any>(null);
  const pick = (e?: any) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onFile(f); };
  return (
    <div className={`rounded-2xl border p-3 transition-colors ${doc ? "border-good/30 bg-good/[0.04]" : err ? "border-bad/40 bg-surface" : "border-dashed border-line-3 bg-surface"}`}>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={pick} tabIndex={-1} aria-label={`${t(S.title)} — ${t(VX.take)}`} className="sr-only" />
      <input ref={fileRef} type="file" accept={S.pdf ? "image/*,application/pdf" : "image/*"} onChange={pick} tabIndex={-1} aria-label={`${t(S.title)} — ${t(VX.pick)}`} className="sr-only" />
      <div className="flex items-start gap-3">
        {doc ? <img src={doc.src} alt="" draggable={false} className="w-20 h-14 shrink-0 rounded-lg object-cover border border-line bg-elevated select-none pointer-events-none" /> : <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-wash text-accent"><I size={20} /></span>}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium leading-snug">{t(S.title)}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{doc ? <span className="inline-flex items-center gap-1 text-good"><CircleCheck size={12} /> {t(VX.attached)}{doc.sample ? ` · ${t(VX.sampleTag)}` : ""}</span> : busy ? <span className="inline-flex items-center gap-1.5"><LoaderCircle size={12} className="spin text-accent" /> {t(VX.attaching)}</span> : t(S.hint)}</p>
        </div>
        {doc && <RoundButton label={t(VX.remove)} onClick={onRemove} className="shrink-0"><X size={16} /></RoundButton>}
      </div>
      {!busy && <div className="mt-2.5 flex gap-2"><Secondary onClick={() => camRef.current && camRef.current.click()} className="flex-1 h-10 text-[12.5px] press"><Camera size={15} /> {t(doc ? VX.retake : VX.take)}</Secondary><Secondary onClick={() => fileRef.current && fileRef.current.click()} className="flex-1 h-10 text-[12.5px] press"><FileUp size={15} /> {t(doc ? VX.replace : VX.pick)}</Secondary></div>}
      {err && <p role="alert" className="mt-2 text-[11.5px] leading-snug text-bad flex items-start gap-1.5"><CircleAlert size={12} className="shrink-0 mt-0.5" /><span>{t(err)}</span></p>}
    </div>
  );
}

export function VerifyIntake({ app, info, onSubmit }: any) {
  const p = app.profile; const t = (x?: any) => say(app, x); const slots = docSlots(p.role);
  const [docs, setDocs] = useState<any>({}); const [busy, setBusy] = useState<any>({}); const [errs, setErrs] = useState<any>({}); const [tried, setTried] = useState(false);
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);
  const attach = async (kind?: any, file?: any) => {
    setBusy((b) => ({ ...b, [kind]: true })); setErrs((e) => ({ ...e, [kind]: null }));
    try { const d = await prepDoc(file); if (alive.current) setDocs((s) => ({ ...s, [kind]: { kind, ...d } })); }
    catch (e) { if (alive.current) setErrs((x) => ({ ...x, [kind]: DOC_ERRORS[e && e.message] || DOC_ERRORS.decode })); }
    finally { if (alive.current) setBusy((b) => ({ ...b, [kind]: false })); }
  };
  const sample = () => { const demo: any = { name: cleanName(p.name) || "—", gender: p.gender, division: divisionForDisc(p.disc) || "civil", year: Number(p.gradYear) || THIS_YEAR - 5 }; setDocs(Object.fromEntries(slots.map((k) => [k, { kind: k, src: drawDemoDoc(k, demo), w: k === "card" ? 1000 : 1400, h: k === "card" ? 630 : 990, sample: true }]))); setErrs({}); };
  const list = slots.map((k) => docs[k]).filter(Boolean); const working = slots.some((k) => busy[k]);
  return (
    <div className="space-y-3">
      {info && <p role="status" className="p-3 rounded-xl bg-elevated/70 border border-line text-[12px] leading-relaxed text-ink-2 flex items-start gap-2"><Trash2 size={14} className="shrink-0 mt-0.5 text-good" /><span>{t(info)}</span></p>}
      <PrivacyPromise app={app} />
      <div className="pt-1"><h4 className="text-[15px] font-medium">{t(VX.introTitle)}</h4><p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{t(p.role === "supervisor" ? VX.introSup : VX.introEng)}</p></div>
      {slots.map((k) => <DocSlot key={k} app={app} kind={k} doc={docs[k]} busy={!!busy[k]} err={errs[k]} onFile={(f) => attach(k, f)} onRemove={() => setDocs((s) => { const n: any = { ...s }; delete n[k]; return n; })} />)}
      <button type="button" onClick={sample} className="w-full min-h-10 text-[12px] text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">{t(VX.sample)}</button>
      {tried && !list.length && <p role="alert" className="text-[12px] text-bad flex items-center gap-1.5"><CircleAlert size={13} /> {t(VX.needOne)}</p>}
      <Primary disabled={working} onClick={() => { setTried(true); if (list.length) onSubmit(list); }} className="w-full h-12 press"><Send size={16} className="rtl:-scale-x-100" /> {t(VX.send)}</Primary>
      <p className="text-[11px] leading-snug text-ink-3 text-center">{t(VX.optional)}</p>
    </div>
  );
}

// One sheet for the whole life of a request. The member only ever sees plain states — never how the documents are handled inside.
export function VerifyCenter({ app }: any) {
  const p = app.profile; const t = (x?: any) => say(app, x); const en = app.lang === "en"; const trx = (s?: any) => trIn(app.lang, s);
  const [fresh, setFresh] = useState(false); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const [sure, setSure] = useState(false);
  const timer = useRef<any>(null); useEffect(() => () => clearTimeout(timer.current), []);
  const req = p.verifyReq || null; const when = (ms?: any) => whenIn(app.lang, ms);
  const kinds = (ks?: any) => (ks || []).map((k) => t((DOC_SLOTS[k] || DOC_SLOTS.cert).short)).join(en ? " + " : " + ");
  const wrap = (node?: any) => <div translate="no" lang={app.lang} className="space-y-3">{node}</div>;
  if (!canVerifyRole(p.role)) return wrap(<>
    <StatusHead icon={Building2} tone="accent" title={t(VX.employer)} sub={t(VX.employerBody)} />
    <p className="flex items-center gap-2 text-[12px] text-ink-2"><Chip tone={p.role === "owner" ? "owner" : "hr"}>{p.role === "owner" ? <Briefcase size={12} /> : <Building2 size={12} />}{trx(roleTitle(p.role, p.gender))}</Chip></p>
    <Secondary onClick={app.closeSheet} className="w-full h-11">{t(VX.close)}</Secondary>
  </>);
  const submit = (docs?: any) => { app.submitVerification(docs); setSending(true); setSent(false); timer.current = setTimeout(() => { setSending(false); setSent(true); setFresh(false); }, reduced() ? 250 : 1300); };
  if (sending) return wrap(<div role="status" aria-live="polite" className="py-10 flex flex-col items-center text-center gap-3"><LoaderCircle size={34} className="spin text-accent" /><p className="text-[15px] font-medium">{t(VX.reading)}</p><p className="text-[12.5px] text-ink-2 max-w-[32ch] leading-relaxed">{t(VX.readingSub)}</p></div>);
  if (p.verified) {
    const { mapped, conflict } = divConflict(p.division, p.disc); const d = divOf(p.division);
    return wrap(<>
      <StatusHead icon={BadgeCheck} tone="good" title={t(VX.okTitle)} sub={t(VX.okSub)} />
      <Facts rows={[[t(VX.credential), t(credentialL2(p.role, p.verifyKind))], d && [t(VX.division), trx(d.label)], p.gradYear && [t(VX.grad), <Num>{p.gradYear}</Num>], req && [t(VX.ref), <Num>{req.id}</Num>], req && req.decidedAt && [t(VX.reviewed), when(req.decidedAt)]]} />
      {req && req.purged > 0 && <p className="text-[11.5px] leading-relaxed text-good flex items-start gap-1.5"><Trash2 size={13} className="shrink-0 mt-0.5" />{VX.purged(req.purged, when(req.purgedAt), app.lang)}</p>}
      {d && !d.app && <p className="text-[11.5px] leading-relaxed text-ink-2">{en ? `Your verified title is “${trx(genderOf(p.gender) === "female" ? d.f : d.m)}”; market estimates stay on your registered specialty (${trx(discName(p.disc))}).` : `لقبك الموثّق «${genderOf(p.gender) === "female" ? d.f : d.m}»، وتقديرات السوق تبقى على تخصصك المسجّل «${discName(p.disc)}».`}</p>}
      {conflict && <div className="p-3 rounded-xl bg-wash border border-accent/20 space-y-2"><p className="text-[12px] leading-relaxed">{en ? `Your verified division matches the ${trx(discName(mapped))} specialty, but you registered as ${trx(discName(p.disc))}. Update your specialty?` : `شعبتك الموثّقة تقابل تخصص «${discName(mapped)}»، وتخصصك المسجّل «${discName(p.disc)}». ${gx(p.gender, "هل تحدّث تخصصك؟", "هل تحدّثين تخصصك؟")}`}</p><Secondary onClick={() => { app.updateProfile({ disc: mapped, track: tracksFor(mapped).some((x) => x[0] === p.track) ? p.track : "site" }); app.toast(en ? `Your specialty is now ${trx(discName(mapped))}` : `تخصصك الآن: ${discName(mapped)}`); }} className="w-full h-10 text-[12.5px]">{en ? `Switch to ${trx(discName(mapped))}` : `التحويل إلى «${discName(mapped)}»`}</Secondary></div>}
      <Secondary onClick={app.closeSheet} className="w-full h-11">{t(VX.close)}</Secondary>
    </>);
  }
  if (p.pending) return wrap(<>
    {sent && <p role="status" className="pop-in p-3 rounded-xl bg-good/10 border border-good/25 text-[12.5px] text-good flex items-center gap-2"><CircleCheck size={16} className="shrink-0" />{t(VX.sent)}</p>}
    <StatusHead icon={Hourglass} tone="warn" title={t(VX.pendingTitle)} sub={t(VX.pendingSub)} />
    <Facts rows={[req && [t(VX.ref), <Num>{req.id}</Num>], req && [t(VX.sentAt), when(req.at)], req && req.kinds && req.kinds.length > 0 && [t(VX.docs), kinds(req.kinds)]]} />
    <p className="text-[11.5px] leading-relaxed text-ink-2 flex items-start gap-1.5"><LockKeyhole size={13} className="shrink-0 mt-0.5 text-good" />{t(VX.held)}</p>
    {!sure ? <div className="flex gap-2"><Secondary onClick={app.closeSheet} className="flex-1 h-11">{t(VX.close)}</Secondary><Quiet onClick={() => setSure(true)} className="h-11 px-3 text-[12.5px] text-bad/90 hover:text-bad"><Trash2 size={14} /> {t(VX.withdraw)}</Quiet></div>
      : <div className="flex gap-2"><Primary onClick={() => { app.withdrawVerification(); setSure(false); setSent(false); }} className="flex-1 h-11 !bg-bad !text-white"><Trash2 size={15} /> {t(VX.withdrawSure)}</Primary><Secondary onClick={() => setSure(false)} className="h-11 px-4">{t(VX.cancel)}</Secondary></div>}
  </>);
  if (req && req.status === "rejected" && !fresh) return wrap(<>
    <StatusHead icon={CircleAlert} tone="bad" title={t(VX.noTitle)} sub={req.reason ? `${t(VX.reason)}: ${t(rejectOf(req.reason))}` : null} />
    {req.note && <p className="p-3 rounded-xl bg-canvas/60 border border-line text-[12px] leading-relaxed"><span className="text-ink-3">{t(VX.note)}: </span>{req.note}</p>}
    {req.purged > 0 && <p className="text-[11.5px] leading-relaxed text-good flex items-start gap-1.5"><Trash2 size={13} className="shrink-0 mt-0.5" />{VX.purged(req.purged, when(req.purgedAt), app.lang)}</p>}
    <Primary onClick={() => setFresh(true)} className="w-full h-12 press"><RotateCcw size={15} /> {t(VX.again)}</Primary>
    <PrivacyPromise app={app} compact />
  </>);
  return wrap(<VerifyIntake app={app} info={req && !fresh ? (req.status === "withdrawn" ? VX.withdrawn : req.status === "expired" ? VX.expired : null) : null} onSubmit={submit} />);
}
