// Migrated from the prototype part(s): app_1h_division
import { DISC, genderOf } from "./taxonomy";

// =====================================================================
//  Syndicate divisions (الشعب). The Egyptian Engineers Syndicate registers every engineer in one of seven divisions.
//  A verified engineer's division is set by the admin who reviewed the documents (see _app_2e_verify) — never read automatically.
//  The on-device OCR engine below is kept for one job only: checking post images for money figures (_app_1i_media).
// =====================================================================
export const DIVISIONS = [
  { id: "civil", label: "الشعبة المدنية", short: "مدني", app: "civil", m: "مهندس مدني", f: "مهندسة مدنية", note: "تشمل الإنشائي والطرق والري والصحي والمساحة" },
  { id: "architecture", label: "الشعبة المعمارية", short: "معماري", app: "architecture", m: "مهندس معماري", f: "مهندسة معمارية", note: "تشمل العمارة والتخطيط والتصميم العمراني" },
  { id: "mechanical", label: "الشعبة الميكانيكية", short: "ميكانيكا", app: "mechanical", m: "مهندس ميكانيكا", f: "مهندسة ميكانيكا", note: "تشمل القوى والإنتاج والسيارات والطيران والبحرية والميكاترونكس" },
  { id: "electrical", label: "الشعبة الكهربائية", short: "كهرباء", app: "electrical", m: "مهندس كهرباء", f: "مهندسة كهرباء", note: "تشمل القوى والإلكترونيات والاتصالات والحاسبات والطبية الحيوية" },
  { id: "chemical", label: "الشعبة الكيميائية", short: "كيميائي", app: null, m: "مهندس كيميائي", f: "مهندسة كيميائية", note: "تشمل الكيميائية والبتروكيماويات" },
  { id: "mining", label: "شعبة التعدين والبترول", short: "تعدين وبترول", app: null, m: "مهندس تعدين وبترول", f: "مهندسة تعدين وبترول", note: "تشمل التعدين والبترول والفلزات" },
  { id: "textile", label: "شعبة الغزل والنسيج", short: "غزل ونسيج", app: null, m: "مهندس غزل ونسيج", f: "مهندسة غزل ونسيج", note: "هندسة الغزل والنسيج والتريكو" },
];

export const divOf = (id?: any) => DIVISIONS.find((d) => d.id === id) || null;

export const divisionForDisc = (disc?: any) => (disc === "survey" ? "civil" : divOf(disc) ? disc : null);

export const discName = (id?: any) => (DISC.find((d) => d[0] === id) || [null, "—"])[1];

// A verified division with no market discipline of its own (chemical, mining & petroleum, textile) names the engineer's title
export const divTitle = (p?: any) => { const d = p && p.verified && p.division ? divOf(p.division) : null; return d && !d.app ? (genderOf(p.gender) === "female" ? d.f : d.m) : null; };

// The market discipline a division maps to: civil stays survey for surveying engineers (same division); chemical, mining and textile
// have none (the registered specialty keeps the market data)
export const discForDivision = (div?: any, prior?: any) => { const d = divOf(div); if (!d || !d.app) return null; if (div === "civil" && prior === "survey") return "survey"; return d.app; };

export const divConflict = (div?: any, prior?: any) => { const mapped = discForDivision(div, prior); return { mapped, conflict: !!mapped && !!prior && mapped !== prior }; };
