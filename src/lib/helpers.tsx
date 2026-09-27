// Migrated from the prototype part(s): app_1e_helpers
import { useEffect, useRef, useState } from "react";
import { COMPANIES, catName, company, companyMult } from "../data/companies";
import { CITIES, GOVS, gov, placeMult, placeName } from "../data/geo";
import { divTitle } from "../domain/division";
import { DISC, EXP, LEVEL_EXP, MARKET, POSITIONS, RETIRED_ROLES, ROLE, SKILLS, TITLES, TRACK_ADJ, TRACK_MULT, discTitle, expForYears, isCompanyRole, label, posForYears, posLabelG, posShort, posYears, position, repLevel, roleTitle, trackLabel, tracksFor, yearsLabel } from "../domain/taxonomy";
import { detectContact, normalizeText } from "../domain/text-guard";
import { reduced } from "./runtime";
import { Num } from "../ui/primitives";
import { fmt } from "../ui/theme";

export const round500 = (n) => Math.round(n / 500) * 500;

export const rand = (s) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

export const hex4 = (s) => Math.floor(rand(s) * 65535).toString(16).padStart(4, "0");

export const seedOf = (str) => [...String(str)].reduce((a, c) => a + c.charCodeAt(0) * 7, 3);

// Percentiles for a discipline × experience, scaled by place and track. Returns {p10,p25,p50,p75,p90}
export function marketFor(disc, exp, govKey, track = "site", cityKey) {
  const m = placeMult(govKey, cityKey) * (TRACK_MULT[track] || 1); const [p10, p25, p50, p75, p90] = (MARKET[disc] || MARKET.civil)[exp] || MARKET.civil["3-5"];
  return { p10: round500(p10 * m), p25: round500(p25 * m), p50: round500(p50 * m), p75: round500(p75 * m), p90: round500(p90 * m) };
}

export const medianFor = (...a) => marketFor(...a).p50;

export function sampleSize(disc, exp, govKey) { const base = 40 + Math.floor(rand(seedOf(disc + exp + govKey)) * 300); return Math.round(base * Math.min(1, gov(govKey)[3] * 0.9 + 0.2)); }

export const quality = (n) => (n >= 100 ? ["موثّق", "verified"] : n >= 30 ? ["كافٍ", "accent"] : ["أولي", "warn"]);

export function reportsFor(disc, exp, govKey) {
  const { p25, p75 } = marketFor(disc, exp, govKey); const seed = seedOf(disc + exp + govKey);
  const whens = ["منذ يومين", "منذ 4 أيام", "منذ أسبوع", "منذ أسبوعين", "منذ 3 أسابيع", "منذ شهر"]; const yrs = { "0-2": [1, 2], "3-5": [3, 5], "5-8": [5, 8], "8-12": [8, 12], "12+": [12, 20] }[exp];
  return Array.from({ length: 6 }, (_, i) => { const r = rand(seed + i * 13), r2 = rand(seed + i * 29); const c = COMPANIES[Math.floor(r2 * COMPANIES.length)];
    return { id: `${seed}-${i}`, anon: hex4(seed + i * 7), title: TITLES[disc][i % TITLES[disc].length], company: c.name, coId: c.id, years: yrs[0] + Math.round(r * (yrs[1] - yrs[0])), salary: round500(p25 + (p75 - p25) * r * 1.15), verified: r2 > 0.3, when: whens[i] }; });
}

// ---- Expected salary range for a job: market band (discipline × years) × place × sub-discipline × position × employer category. The employer never types a number. ----
export function estimateFor(job) {
  const yrs = job.years ? (job.years[0] + Math.min(job.years[1], job.years[0] + 4)) / 2 : 4; const exp = expForYears(yrs); const pos = position(job.pos);
  const m = marketFor(job.disc, exp, job.gov, job.sub, job.city); const c = company(job.co); const cm = companyMult(c); const k = pos[3] * cm;
  const lo = round500(m.p25 * k), mid = round500(m.p50 * k), hi = round500(m.p75 * k); const n = sampleSize(job.disc, exp, job.gov);
  return { lo, mid, hi, exp, n, q: quality(n), k, parts: [["الخبرة والتخصّص", `${label(EXP, exp)} · ${ROLE[job.disc]}`, `${fmt(m.p25)}–${fmt(m.p75)}`], ["المسار", trackLabel(job.sub, job.disc), `×${(TRACK_MULT[job.sub] || 1).toFixed(2)}`], ["المكان", placeName(job.gov, job.city), `×${placeMult(job.gov, job.city).toFixed(2)}`], ["المسمّى", posShort(job.pos), `×${pos[3].toFixed(2)}`], ["نوع الجهة", c ? catName(c.cat) : "—", `×${cm.toFixed(2)}`]], ccy: c && c.pay && c.pay.basis !== "EGP" ? c.pay.basis : null };
}

// ---- Smart matching: strict classification → score 0–100 with a breakdown; ≥85 = perfect match → push notification ----
export function matchJob(job, p) {
  if (!p || isCompanyRole(p.role)) return null;
  const pd = p.disc; const parts = [];
  const disc = job.disc === pd ? 40 : 0; parts.push(["التخصّص", disc, 40, ROLE[job.disc]]);
  const sub = job.sub === p.track ? 25 : (TRACK_ADJ[job.sub] || []).includes(p.track) ? 12 : 0; parts.push(["المسار", sub, 25, trackLabel(job.sub, job.disc)]);
  const [ya, yb] = posYears(p.pos); const my = (ya + yb) / 2; const [ja, jb] = job.years || [0, 30]; const inRange = my >= ja && my <= jb; const dist = inRange ? 0 : Math.min(Math.abs(my - ja), Math.abs(my - jb));
  const exp = inRange ? 20 : dist <= 2 ? 10 : 0; parts.push(["سنوات الخبرة", exp, 20, yearsLabel(job.years || [0, 30])]);
  const place = job.gov === p.gov ? (p.city && job.city && p.city !== job.city ? 8 : 10) : gov(job.gov)[2] === gov(p.gov)[2] ? 5 : 0; parts.push(["المكان", place, 10, placeName(job.gov, job.city)]);
  const posPts = job.pos === p.pos ? 5 : Math.abs(POSITIONS.findIndex((x) => x[0] === job.pos) - POSITIONS.findIndex((x) => x[0] === p.pos)) === 1 ? 3 : 0; parts.push(["المسمّى", posPts, 5, posShort(job.pos)]);
  const score = disc + sub + exp + place + posPts; const tier = score >= 85 ? ["مطابقة تامة", "verified"] : score >= 65 ? ["مطابقة قوية", "accent"] : score >= 40 ? ["مطابقة جزئية", "warn"] : ["غير مطابقة", "default"];
  return { score, parts, tier: tier[0], tone: tier[1], perfect: score >= 85, gaps: parts.filter((x) => x[1] < x[2]).map((x) => x[0]) };
}

// Modeled reach of a posting's push notification: members whose profile matches the classification exactly
export const reachFor = (job) => { const n = sampleSize(job.disc, expForYears((job.years[0] + job.years[1]) / 2), job.gov); return { exact: Math.round(n * 2.6), near: Math.round(n * 6.1) }; };


// ---- AI job-description parser (rule-based, on-device): reads free text → discipline, sub-discipline, years, position, place, mode, type, skills; strips any salary the employer typed ----
export const KW = {
  disc: { civil: /مدني|إنشائ|خرسان|structur|civil|طرق|كبار|جيوتقن|geotech|أساسات/gi, architecture: /معمار|تشطيب|تصميم داخلي|architect|interior|واجهات/gi, mechanical: /ميكانيك|hvac|تكييف|حريق|صرف|mechanical|\bmep\b|plumbing|تبريد|firefighting/gi, electrical: /كهرب|electric|تيار خفيف|\bbms\b|محطات|\bsld\b|قوى|لوحات كهرب|low current/gi, survey: /مساح|survey|\bgis\b|total station|gnss|جيوماتكس/gi },
  sub: { pm: /مدير مشروع|مدير المشروع|project manager|إدارة مشروعات|إدارة المشروعات/gi, planning: /تخطيط|primavera|\bp6\b|planning|scheduling|جدول زمني/gi, contracts: /عقود|حصر كميات|\bqs\b|quantity surve|fidic|مطالبات|claims/gi, bim: /\bbim\b|navisworks|نمذجة|clash/gi, design: /تصميم|design|etabs|sap2000|\bsafe\b|حسابات إنشائية/gi, tech: /مكتب فني|technical office|مكتب فنى|حصر|مستخلص|shop drawing|لوحات تنفيذية/gi, supervision: /إشراف استشاري|استشاري|supervision|consultant|مراجعة التنفيذ/gi, qa: /جودة|\bqa\b|\bqc\b|\bhse\b|سلامة|iso 9001|ضبط الجودة/gi, gis: /\bgis\b|arcgis|qgis|جيوماتكس/gi, site: /موقع|تنفيذ|site|execution|construction|مقاول/gi },
  pos: { director: /مدير إدارة|مدير عام|director|رئيس قطاع/i, pm: /مدير مشروع|مدير المشروع|project manager/i, cm: /مدير تنفيذ|construction manager/i, tom: /مدير مكتب فني|technical office manager/i, section: /رئيس قسم|section head|head of/i, lead: /قائد فريق|team lead|lead engineer|\blead\b/i, senior: /سينيور|senior|مهندس أول/i, junior: /جونيور|junior|مبتدئ/i, fresh: /حديث التخرج|حديثي التخرج|fresh|graduate|خريج/i },
  mode: { hybrid: /هجين|hybrid/i, remote: /عن بعد|عن بُعد|remote/i, office: /مكتب|office/i, site: /موقع|site|الإقامة/i },
};

export const ARABIC_NUMS = { "سنة": 1, "سنتين": 2, "سنتان": 2, "ثلاث": 3, "تلات": 3, "أربع": 4, "اربع": 4, "خمس": 5, "ست": 6, "سبع": 7, "ثمان": 8, "تمان": 8, "تسع": 9, "عشر": 10 };

export function parseJobText(raw) {
  const text = normalizeText(raw); const lower = text.toLowerCase(); const conf = {}; const out = { title: "", disc: null, sub: null, pos: null, years: null, gov: null, city: null, mode: null, type: "full", skills: [], reqs: [], desc: "", salaryStripped: null, contact: detectContact(raw) };
  const score = (dict) => { const s = Object.entries(dict).map(([k, re]) => [k, (lower.match(re) || []).length]).sort((a, b) => b[1] - a[1]); const tot = s.reduce((a, x) => a + x[1], 0); return { pick: s[0][1] > 0 ? s[0][0] : null, conf: tot ? s[0][1] / tot : 0 }; };
  const d = score(KW.disc); out.disc = d.pick || "civil"; conf.disc = d.pick ? Math.max(0.35, d.conf) : 0.2;
  const s = score(KW.sub); out.sub = s.pick && tracksFor(out.disc).some((t) => t[0] === s.pick) ? s.pick : "site"; conf.sub = s.pick ? Math.max(0.35, s.conf) : 0.2;
  let y = null; let m;
  if ((m = /(\d{1,2})\s*(?:-|–|—|إلى|الى|to)\s*(\d{1,2})\s*(?:سن|عام|years?|yrs?)/i.exec(text))) y = [Number(m[1]), Number(m[2])];
  else if ((m = /(?:لا تقل عن|على الأقل|at least|minimum(?: of)?|min\.?)\s*(\d{1,2})\s*(?:سن|عام|years?|yrs?)?/i.exec(text)) || (m = /(\d{1,2})\s*\+\s*(?:سن|عام|years?|yrs?)/i.exec(text)) || (m = /(?:خبرة|experience)\s*(?:من|of)?\s*(\d{1,2})\s*(?:سن|عام|years?|yrs?)/i.exec(text)) || (m = /(\d{1,2})\s*(?:سنوات|سنة|سنين|years?|yrs?)\s*(?:خبرة|of experience|experience)/i.exec(text))) y = [Number(m[1]), Number(m[1]) + 3];
  else if ((m = new RegExp("(" + Object.keys(ARABIC_NUMS).join("|") + ")\\s*(?:سنوات|سنين|سنة|أعوام)").exec(text))) { const n = ARABIC_NUMS[m[1]]; y = [n, n + 3]; }
  else if (KW.pos.fresh.test(text)) y = [0, 1];
  if (y) { y = [Math.min(y[0], y[1]), Math.max(y[0], y[1])]; out.years = y; conf.years = 0.9; }
  let pos = null; for (const [k, re] of Object.entries(KW.pos)) { if (re.test(text)) { pos = k; break; } }
  if (pos) { out.pos = pos; conf.pos = 0.85; } else if (y) { out.pos = posForYears((y[0] + y[1]) / 2); conf.pos = 0.55; } else { out.pos = "mid"; conf.pos = 0.25; }
  if (!out.years) { out.years = posYears(out.pos); conf.years = 0.4; }
  if (out.sub === "pm" && !["pm", "cm", "director"].includes(out.pos)) out.pos = "pm";
  if (["pm", "cm", "director"].includes(out.pos) && tracksFor(out.disc).some((t) => t[0] === "pm")) out.sub = "pm";
  const EN_PLACES = { "new cairo": ["cairo", "newcairo"], "new capital": ["cairo", "nac"], "administrative capital": ["cairo", "nac"], "6th of october": ["giza", "oct"], "6 october": ["giza", "oct"], "sheikh zayed": ["giza", "zayed"], "alamein": ["matrouh", "alamein"], "sokhna": ["suez", "sokhna"], "alexandria": ["alexandria", null], "cairo": ["cairo", null], "giza": ["giza", null], "mansoura": ["dakahlia", "mansoura"], "tanta": ["gharbia", "tanta"], "assiut": ["assiut", "assiut_c"], "hurghada": ["redsea", "hurghada"], "10th of ramadan": ["sharqia", "ramadan"], "maadi": ["cairo", "maadi"], "nasr city": ["cairo", "nasr"], "heliopolis": ["cairo", "heliopolis"], "obour": ["qalyubia", "obour"], "sadat city": ["menoufia", "sadat"], "damietta": ["damietta", null], "port said": ["portsaid", null], "suez": ["suez", null], "ismailia": ["ismailia", null], "luxor": ["luxor", null], "aswan": ["aswan", null], "sharm": ["southsinai", "sharm"], "gouna": ["redsea", "gouna"] };
  let best = null; const consider = (name, g, c) => { if (name.length >= 3 && text.includes(name) && (!best || name.length > best.n.length)) best = { n: name, g, c }; };
  GOVS.forEach(([g, name]) => consider(name, g, null)); Object.entries(CITIES).forEach(([g, list]) => list.forEach(([c, name]) => { consider(name.replace(/\s*\(.*\)$/, ""), g, c); }));
  Object.entries(EN_PLACES).forEach(([k, [g, c]]) => { if (lower.includes(k) && (!best || k.length > best.n.length)) best = { n: k, g, c }; });
  if (best) { out.gov = best.g; out.city = best.c; conf.place = 0.85; } else { conf.place = 0; }
  for (const [k, re] of Object.entries(KW.mode)) { if (re.test(text)) { out.mode = k; break; } } if (!out.mode) out.mode = out.sub === "site" ? "site" : "office"; conf.mode = KW.mode[out.mode] && KW.mode[out.mode].test(text) ? 0.8 : 0.4;
  out.type = /عقد مشروع|contract|مؤقت|temporary|بالمشروع/i.test(text) ? "contract" : /دوام جزئي|part[- ]?time/i.test(text) ? "parttime" : "full";
  // Arabic conjunctions glue onto Latin names ("وAutoCAD"), so only Latin letters/digits count as word boundaries
  out.skills = SKILLS.filter((sk) => new RegExp("(?<![A-Za-z0-9])" + sk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*") + "(?![A-Za-z0-9])", "i").test(text));
  // Salary privacy: numbers next to salary words are removed from the public description and replaced by the EngSpace estimate
  const sal = /(?:راتب|مرتب|salary|ج\.?م|جنيه|egp|le)\D{0,25}?(\d{1,3}(?:[,٬]\d{3})+|\d{4,6})(?:\s*(?:-|–|إلى|to)\s*(\d{1,3}(?:[,٬]\d{3})+|\d{4,6}))?|(\d{1,3}(?:[,٬]\d{3})+|\d{4,6})(?:\s*(?:-|–|إلى|to)\s*(\d{1,3}(?:[,٬]\d{3})+|\d{4,6}))?\s*(?:ج\.?م|جنيه|egp|le\b|شهريًا|شهريا|\/\s*شهر|per month|monthly)/i;
  let clean = raw; const sm = sal.exec(normalizeText(raw)); if (sm) { out.salaryStripped = sm[0]; clean = raw.replace(new RegExp("[^\\n.]*" + sm[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\n.]*[.\\n]?", "i"), "").trim(); }
  // Lines carrying contact details move to the ad's contact card (e-mail / phone) instead of the description
  const lines = clean.split(/\n+/).map((l) => l.trim()).filter((l) => l && !detectContact(l).found);
  const isReq = (l) => /^[-•*·▪●\d]+[.)]?\s*/.test(l) || /^(?:يشترط|مطلوب|خبرة|إجادة|بكالوريوس|شهادة|معرفة|القدرة|إتقان|required|must|proficien|bachelor|degree|experience in)/i.test(l);
  out.reqs = lines.filter(isReq).map((l) => l.replace(/^[-•*·▪●\d]+[.)]?\s*/, "")).slice(0, 8);
  const body = lines.filter((l) => !isReq(l)); const first = body[0] || lines[0] || "";
  out.title = first.length <= 60 && !/[.،:]/.test(first) ? first.replace(/^(?:مطلوب|وظيفة|job title:?|position:?)\s*/i, "") : `${ROLE[out.disc]} ${trackLabel(out.sub, out.disc)}`.replace(/موقع \/ تنفيذ/, "موقع");
  if (["pm", "cm", "director", "tom", "section"].includes(out.pos) && out.title === `${ROLE[out.disc]} ${trackLabel(out.sub, out.disc)}`) out.title = `${posShort(out.pos)} — ${DISC.find((x) => x[0] === out.disc)[1]}`;
  out.desc = (first === out.title ? body.slice(1) : body).join(" ").trim() || lines.filter((l) => l !== first).map((l) => l.replace(/^[-•*·▪●\d]+[.)]?\s*/, "")).join("، ").trim() || out.title; conf.title = first.length <= 60 ? 0.7 : 0.4;
  out.conf = conf; out.confLabel = (k) => (conf[k] >= 0.75 ? ["مؤكد", "verified"] : conf[k] >= 0.45 ? ["مرجّح", "accent"] : ["تخمين — راجعه", "warn"]);
  return out;
}

// Egypt payroll (approximate): social insurance 11% up to the insurable-wage cap; income tax brackets of Law 175/2023 with the 20,000 personal exemption
export const TAX = { cap: 16700, ins: 0.11, exempt: 20000, brackets: [[40000, 0], [55000, 0.10], [70000, 0.15], [200000, 0.20], [400000, 0.225], [1200000, 0.25], [Infinity, 0.275]] };

export function egyptNet(gross) {
  const ins = Math.min(gross, TAX.cap) * TAX.ins; const annual = Math.max(0, (gross - ins) * 12 - TAX.exempt); let tax = 0, prev = 0;
  for (const [lim, r] of TAX.brackets) { if (annual > prev) tax += (Math.min(annual, lim) - prev) * r; prev = lim; if (annual <= lim) break; }
  return { ins: Math.round(ins), tax: Math.round(tax / 12), net: Math.round(gross - ins - tax / 12) };
}

// The full professional title everyone sees — never truncated anywhere in the UI
export const personaTitle = (p) => {
  const g = p.gender; const place = placeName(p.gov, p.city);
  if (isCompanyRole(p.role)) return `${roleTitle(p.role, g)} · ${p.companyName || "شركة"} · ${place}`;
  if (p.role === "supervisor") return `${roleTitle(p.role, g)} · ${place}`; // one fixed title for every site supervisor
  return `${divTitle(p) || discTitle(p.disc, g)} · ${trackLabel(p.track, p.disc)} · ${posLabelG(p.pos, g)} · ${place}`;
};

export const personaExp = (p) => LEVEL_EXP[p.pos] || "3-5";

// The account profile. name/email/age are private: they appear only on the member's own screens and, for items the member
// chooses to post publicly, the name (and full title) travels with that item. `identity` is the default for new actions.
export const DEFAULT_PERSONA = { name: "", email: "", gender: "male", age: null, gradYear: null, role: "engineer", verified: false, verifyKind: null, pending: false, verifyRef: null, disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "newcairo", goal: "learn", companyName: null, companyId: null, avatar: null, openToRecruiters: true, identity: "anon", anon: null, pid: null, division: null, verifyReq: null, photo: null, showPhoto: true, look: null };

// Deep links (#app/…) and the device previews open straight into the app with this demo member
export const DEMO_PERSONA = { ...DEFAULT_PERSONA, name: "أحمد سامي", email: "ahmed.demo@example.com", age: 29, gradYear: 2020, anon: "4f2c", pid: "u-demo" };

export const GOAL_TOOL = { raise: "raise", switch: "compare", first: "path", relocate: "move", learn: "net", hire: "compare", benchmark: "inflation" };

export const PERSONA_KEY = "engspace.persona.v6";

export const storedRetiredRole = () => { try { const p = JSON.parse(localStorage.getItem(PERSONA_KEY) || "null"); return !!(p && RETIRED_ROLES.includes(p.role)); } catch (e) { return false; } };

export const loadPersona = () => { try { const v = localStorage.getItem(PERSONA_KEY); if (!v) return null; const p = JSON.parse(v); return p && typeof p === "object" && p.name && p.anon && p.pid && !RETIRED_ROLES.includes(p.role) ? { ...DEFAULT_PERSONA, ...p } : null; } catch (e) { return null; } };

export const savePersona = (p) => { try { if (p) localStorage.setItem(PERSONA_KEY, JSON.stringify(p)); else localStorage.removeItem(PERSONA_KEY); } catch (e) {} };

export function useCountUp(value, ms = 640) {
  const [v, setV] = useState(value); const from = useRef(value);
  useEffect(() => {
    if (reduced() || from.current === value) { setV(value); from.current = value; return; }
    const a = from.current, b = value, t0 = performance.now(); let raf;
    const tick = (t) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); setV(Math.round(a + (b - a) * e)); if (k < 1) raf = requestAnimationFrame(tick); else from.current = b; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return v;
}

export const Money = ({ n, size = "text-[32px]", unit = "ج.م / شهر", className = "" }) => { const v = useCountUp(n); return <span className={`inline-flex items-baseline gap-2 flex-wrap ${className}`}><Num className={`${size} font-semibold tracking-[-0.04em] leading-none`}>{fmt(v)}</Num><span className="text-[12px] text-ink-2">{unit}</span></span>; };


// Brand sigil kept for the design board; identities in the app use Avatar
export function Sigil({ id = "0000", size = 40, className = "", draw = false }) {
  const d = [...String(id).padEnd(4, "0")].slice(0, 4).map((ch) => parseInt(ch, 16) || 0);
  const arches = [0, 1, 2].slice(0, 2 + (d[0] % 2)).map((i) => { const w = 22 + (d[i] % 8) * 3; const h = 26 + (d[(i + 1) % 4] % 8) * 3; const x = 6 + ((d[(i + 2) % 4] * 3) % Math.max(1, 52 - w)); return { w, h, x, o: [0.95, 0.55, 0.35][i] }; });
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="rgb(var(--wash))" />
      {arches.map((a, i) => <path key={i} d={`M${a.x} 56 V${56 - a.h + a.w / 2} A${a.w / 2} ${a.w / 2} 0 0 1 ${a.x + a.w} ${56 - a.h + a.w / 2} V56`} fill="none" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" opacity={a.o} className={draw ? "draw" : ""} style={draw ? { animationDelay: `${i * 160}ms` } : undefined} />)}
      <circle cx={12 + (d[3] % 10) * 4} cy="13" r="2" fill="rgb(var(--accent))" opacity=".85" />
    </svg>
  );
}

export function LevelRing({ pts, size = 72, children }) {
  const r = repLevel(pts); const R = (size - 4) / 2, C = 2 * Math.PI * R;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line-2)" strokeWidth="2.5" /><circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - r.progress)} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)" }} /></svg>
      {children}
    </span>
  );
}
