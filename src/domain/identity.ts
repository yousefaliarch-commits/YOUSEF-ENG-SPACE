// Migrated from the prototype part(s): app_1g_identity, app_4c_moderation
import {
  EyeOff, FileCheck, ShieldCheck, UserRound, VenetianMask
} from "lucide-react";
import { GOVS } from "../data/geo";
import { divTitle } from "./division";
import { POSITIONS, POS_F, canVerifyRole, discTitle, genderOf, isCompanyRole, posYears, roleTitle } from "./taxonomy";
import { personaTitle } from "../lib/helpers";
import { specOfPersona } from "../ui/characters";

// =====================================================================
//  Accounts & dual identity
//  · Registration is a standard account: e-mail + password, full name, gender, age, graduation year, specialty + sub-track,
//    governorate + city. The password is hashed on the device (PBKDF2-SHA256, random salt) — the password itself is never kept.
//  · Verification is optional and only adds a badge: engineers (Syndicate card and/or graduation certificate) and site
//    supervisors (certificate or experience letter), reviewed by hand by the administration. Employer accounts never verify.
//  · Every author-facing action — post, reply, salary share, company review, vote — is taken either PUBLICLY (full name + full
//    profile) or ANONYMOUSLY (a separate hash + high-level role + credential). The two snapshots never share a field, an avatar
//    style or a counter, so an anonymous item cannot be traced back to the public profile by members or employers.
// =====================================================================
export const THIS_YEAR = new Date().getFullYear();

export const ACCOUNT_KEY = "engspace.account.v1", SESSION_KEY = "engspace.session.v1";

export const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

export const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };

export const loadAccount = () => { try { const a = JSON.parse(lsGet(ACCOUNT_KEY) || "null"); return a && a.email && a.hash && a.salt ? a : null; } catch (e) { return null; } };

export const saveAccount = (a) => lsSet(ACCOUNT_KEY, a ? JSON.stringify(a) : null);

export const hasSession = () => lsGet(SESSION_KEY) === "1";

export const setSession = (on) => lsSet(SESSION_KEY, on ? "1" : null);

export const randHex = (n) => { let s = ""; try { const a = new Uint8Array(Math.ceil(n / 2)); crypto.getRandomValues(a); s = Array.from(a, (b) => b.toString(16).padStart(2, "0")).join(""); } catch (e) { while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); } return s.slice(0, n); };


// ---- field validation — every message says what to fix, never just "invalid" ----
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const emailError = (v) => { const s = String(v || "").trim(); return !s ? "اكتب بريدك الإلكتروني" : !EMAIL_RE.test(s) ? "صيغة البريد غير صحيحة — مثال: name@example.com" : ""; };

export const passwordChecks = (pw) => { const s = String(pw || ""); return [["len", "8 أحرف على الأقل", s.length >= 8], ["letter", "حرف", /[A-Za-zء-ي]/.test(s)], ["digit", "رقم", /\d/.test(s)], ["strong", "رمز أو 12 حرفًا", /[^A-Za-z0-9ء-ي\s]/.test(s) || s.length >= 12]]; };

export const passwordScore = (pw) => (pw ? passwordChecks(pw).filter((c) => c[2]).length : 0);

export const PASSWORD_LEVELS = [["", "bg-track"], ["ضعيفة", "bg-bad"], ["ضعيفة", "bg-bad"], ["مقبولة", "bg-warn"], ["قوية", "bg-good"]];

export const passwordError = (pw) => { if (!pw) return "اختر كلمة مرور"; const miss = passwordChecks(pw).slice(0, 3).filter((c) => !c[2]); return miss.length ? "كلمة المرور تحتاج: " + miss.map((c) => c[1]).join(" و") : ""; };

export const confirmError = (pw, c) => (!c ? "أعد كتابة كلمة المرور" : c !== pw ? "كلمتا المرور غير متطابقتين" : "");

export const cleanName = (v) => String(v || "").trim().replace(/\s+/g, " ");

export const nameError = (v) => { const s = cleanName(v); if (!s) return "اكتب اسمك الكامل"; if (!/^[ء-ْA-Za-z' .-]+$/.test(s)) return "الاسم بالحروف فقط — بدون أرقام أو رموز"; if (s.length > 60) return "الاسم أطول من 60 حرفًا"; if (s.split(" ").filter((w) => w.replace(/[.'-]/g, "").length >= 2).length < 2) return "اكتب الاسم الأول واسم العائلة على الأقل"; return ""; };

export const ageError = (v) => { if (v === "" || v == null) return "اكتب عمرك"; const n = Number(v); if (!Number.isInteger(n)) return "العمر رقم صحيح بالسنوات"; if (n < 18 || n > 75) return "العمر بين 18 و75 سنة"; return ""; };

export const gradError = (v, age) => { if (v === "" || v == null) return "اكتب سنة التخرج"; const n = Number(v); if (!Number.isInteger(n) || n < 1965 || n > THIS_YEAR + 1) return `اكتب سنة بين 1965 و${THIS_YEAR + 1}`; if (!ageError(age) && n - (THIS_YEAR - Number(age)) < 19) return "سنة التخرج لا تتوافق مع عمرك — راجع الرقمين"; return ""; };


// ---- password hashing: PBKDF2-SHA256 through WebCrypto; iterated SHA-256 only where WebCrypto is missing ----
export function sha256hex(str) {
  const ascii = unescape(encodeURIComponent(str)); const rr = (v, n) => (v >>> n) | (v << (32 - n)); const W = 2 ** 32; const H = [], K = []; const comp = {}; let pc = 0;
  for (let c = 2; pc < 64; c++) { if (!comp[c]) { for (let i = 0; i < 313; i += c) comp[i] = c; H[pc] = (Math.pow(c, 0.5) * W) | 0; K[pc++] = (Math.pow(c, 1 / 3) * W) | 0; } }
  let s = ascii + "\x80"; while ((s.length % 64) - 56) s += "\x00"; const words = [];
  for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << (((3 - i) % 4) * 8);
  words[words.length] = ((ascii.length * 8) / W) | 0; words[words.length] = ascii.length * 8;
  let hash = H.slice(0, 8);
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16)); const old = hash; hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + K[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  return hash.slice(0, 8).map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

export async function hashSecret(pw, salt, algo = "PBKDF2-SHA256", iter = 150000) {
  const subtle = typeof crypto !== "undefined" && crypto.subtle;
  if (algo === "PBKDF2-SHA256" && subtle) {
    const enc = new TextEncoder(); const key = await subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: iter }, key, 256);
    return { algo, iter, hash: Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("") };
  }
  let h = salt + ":" + pw; for (let i = 0; i < 3000; i++) h = sha256hex(h + ":" + salt); return { algo: "SHA256-x3000", iter: 3000, hash: h };
}

export async function createAccountRecord(email, pw) { const salt = randHex(32); const r = await hashSecret(pw, salt); return { email: String(email).trim().toLowerCase(), salt, ...r, createdAt: Date.now() }; }

export async function checkPassword(acc, pw) { if (!acc || !pw) return false; const r = await hashSecret(pw, acc.salt, acc.algo, acc.iter); return r.hash === acc.hash; }


// ---- what each identity shows ----
// Second-person wording follows the member's gender: gx(gender, "اختر", "اختاري")
export const gx = (gender, m, f) => (genderOf(gender) === "female" ? f : m);

export const yearsText = (n, gender) => (n <= 0 ? (genderOf(gender) === "female" ? "حديثة التخرج" : "حديث التخرج") : n === 1 ? "سنة خبرة" : n === 2 ? "سنتان خبرة" : n <= 10 ? `${n} سنوات خبرة` : `${n} سنة خبرة`);

export const expYears = (p) => (p.gradYear ? Math.max(0, THIS_YEAR - Number(p.gradYear)) : posYears(p.pos || "mid")[0]);

// the credential behind a badge — employer accounts have none: their role badge says who they are
export const credentialOf = (p) => (!p.verified || !canVerifyRole(p.role) ? null : p.role === "supervisor" ? "مؤهل موثّق" : p.verifyKind === "certificate" ? "شهادة هندسية موثّقة" : "عضوية نقابة موثّقة");

export const highRole = (p) => (p.role === "engineer" ? divTitle(p) || discTitle(p.disc, p.gender) : roleTitle(p.role, p.gender));

// Ghost mode: high-level role + experience + credential. No name, no age, no city, no employer, no contact.
export const anonTitle = (p) => [highRole(p), isCompanyRole(p.role) ? null : yearsText(expYears(p), p.gender), credentialOf(p)].filter(Boolean).join(" · ");

// Public mode: the full professional title (discipline · sub-track · exact position · city) — the name travels with it
export const publicTitle = (p) => personaTitle(p);

export const honorific = (p) => (p.role === "engineer" ? "م." : "");

export const displayName = (a) => [honorific({ role: a.userRole || a.role, gender: a.gender }), a.name].filter(Boolean).join(" ");

export const IDENTITY = { anon: { label: "مجهول", icon: VenetianMask, short: "بمعرّفك المجهول" }, public: { label: "علني", icon: UserRound, short: "باسمك" } };

// The author snapshot stored on every item. The two branches never carry each other's fields.
export const authorOf = (p, as, level = 0) => {
  const ok = !!p.verified && canVerifyRole(p.role); const base = { gender: p.gender, userRole: p.role, spec: specOfPersona(p), look: genderOf(p.gender) === "female" ? (p.look === "hair" ? "hair" : "hood") : undefined, verified: ok, verifyKind: ok ? p.verifyKind || "syndicate" : null, division: ok && p.division ? p.division : null, level };
  return as === "public"
    ? { as: "public", pid: p.pid, photo: p.photo && p.showPhoto !== false ? p.photo : undefined, name: cleanName(p.name), age: p.age != null && p.age !== "" ? Number(p.age) : null, gradYear: p.gradYear ? Number(p.gradYear) : null, role: publicTitle(p), ...base }
    : { as: "anon", anon: p.anon, avatar: p.avatar, role: anonTitle(p), ...base };
};

export const AUTHOR_FIELDS = ["as", "anon", "avatar", "spec", "look", "photo", "pid", "name", "age", "gradYear", "gender", "userRole", "verified", "verifyKind", "division", "level", "expert", "role", "dm"];

export const pickAuthor = (x) => Object.fromEntries(AUTHOR_FIELDS.filter((k) => x && x[k] !== undefined).map((k) => [k, x[k]]));

export const authorKey = (a) => (a && a.as === "public" ? "p:" + a.pid : "a:" + (a && a.anon));

export const isSelf = (a, p) => !!a && (a.as === "public" ? !!p.pid && a.pid === p.pid : !!p.anon && a.anon === p.anon);

export const sameAuthor = (a, b) => !!a && !!b && authorKey(a) === authorKey(b);


// ---- seed data: anonymous authors are reduced to the ghost-mode line (their stored titles carried city and track) ----
export const SEED_POS_YEARS = { fresh: 0, junior: 2, mid: 4, senior: 7, lead: 10, section: 12, tom: 14, cm: 15, pm: 15, director: 18 };

export const seedAnonLine = (text, userRole = "engineer", verified = true, gender) => {
  const segs = String(text || "").split(" · ").map((s) => s.trim()).filter(Boolean); if (!segs.length) return String(text || "");
  const out = [segs[0]]; const role = userRole || "engineer";
  if (isCompanyRole(role)) { if (segs[1] && !/\d/.test(segs[1]) && !GOVS.some((g) => g[1] === segs[1])) out.push(segs[1]); }
  else {
    const ym = segs.map((s) => /(\d+)\s*(?:سنوات|سنة|سنين)/.exec(s)).find(Boolean); let yrs = ym ? Number(ym[1]) : null;
    if (yrs == null) { const pos = POSITIONS.find(([id, l]) => segs.some((s) => s === l || s === POS_F[id])); if (pos) yrs = SEED_POS_YEARS[pos[0]]; }
    if (yrs != null) out.push(yearsText(yrs, gender));
  }
  if (verified && role === "engineer") out.push("عضوية نقابة موثّقة");
  return out.join(" · ");
};

export const normalizeAuthor = (x) => { if (!x || x.as === "public") return x; if (x.as === "anon") return x; const verified = !canVerifyRole(x.userRole || "engineer") ? false : x.verified !== undefined ? !!x.verified : (x.userRole || "engineer") === "engineer"; return { ...x, as: "anon", verified, role: seedAnonLine(x.role, x.userRole, verified, x.gender) }; };

export const normalizeComments = (cs) => (cs || []).map((c) => ({ ...normalizeAuthor(c), replies: normalizeComments(c.replies) }));

export const normalizeSeedPosts = (ps) => ps.map((p) => ({ ...normalizeAuthor(p), comments: normalizeComments(p.comments) }));

export const normalizeThreads = (ts) => ts.map((t) => ({ ...t, meAs: t.meAs || "anon", with: t.with.as ? t.with : { ...t.with, as: "anon", title: seedAnonLine(t.with.title, t.with.role, !!t.with.verified, t.with.gender) } }));


// ---- the trust & privacy commitments, word for word everywhere they appear ----
export const TRUST_POLICY = [
  { id: "share", icon: ShieldCheck, title: "ضمان عدم مشاركة البيانات", body: "ملفاتك الشخصية ومستندات التوثيق وبياناتك الخاصة لن تُشارك أبدًا ولن تُباع ولن تكون متاحة لأي صاحب عمل أو جهة حكومية أو شركة توظيف أو أي طرف ثالث — تحت أي ظرف." },
  { id: "docs", icon: FileCheck, title: "تعامل آمن مع المستندات", body: "مستندات التوثيق يراجعها فريق إدارة EngSpace يدويًا ولا يطّلع عليها غيره. فور انتهاء المراجعة — قُبل الطلب أو رُفض — تُحذف الصور تلقائيًا ونهائيًا، ولا نحتفظ بأي نسخة منها، ولا تُشارك مع أي أحد." },
  { id: "ghost", icon: EyeOff, title: "حماية مطلقة للهوية", body: "في الوضع المجهول لا يستطيع أي عضو أو صاحب عمل تتبّع هويتك الحقيقية: لا اسم ولا عمر ولا بيانات تواصل، ومعرّفك المجهول منفصل تمامًا عن ملفك العلني ولا يرتبط به." },
];

export const TRUST_FOOTNOTE = "كلمة المرور تُحفظ مشفّرة (PBKDF2) ولا يطّلع عليها أحد — ولا نحن. في هذه المعاينة تبقى كل بياناتك على جهازك.";


// ---- accounts: every identity maps to an internal account id; the member's public and anonymous identities share one ----
export const fnv = (s) => { let h = 2166136261; const str = String(s); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };

export const accIdOf = (key) => "acc-" + fnv(key).slice(0, 6);

export const memberAccId = (p) => accIdOf("member:" + ((p && (p.pid || p.email)) || "me"));

export const authorAccId = (a, self, p) => (self || (a && p && isSelf(a, p)) ? memberAccId(p) : accIdOf(authorKey(a)));
