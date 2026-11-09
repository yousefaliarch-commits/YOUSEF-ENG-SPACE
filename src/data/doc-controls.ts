// =====================================================================
//  Document controls — what an engineer may set on any tool document beyond its calculation: the revision code and its
//  history, the signature boxes, two title-block cells (scale, reference), and the project's document-number pattern.
//  · Every firm numbers and signs differently, so none of this is fixed: defaults come from the tool and the project,
//    and a document may override them. An issued document keeps what it was issued with (the host freezes it).
//  · Pure: types, cleaning, the next revision, the number pattern, and one function that lays these over a tool's DocSpec.
//    No tool knows about them — features/tools/host.tsx applies them to whatever a tool builds.
// =====================================================================
import type { DocBlock, DocSpec, RevRow, SignParty } from "../doc/model";

export type SignBox = { label: string; name?: string; title?: string };
// one issued revision; the three names are frozen when it is issued (people change, an issued revision does not)
export type DocRev = { rev: string; dateIso: string; desc: string; prepared?: string; checked?: string; approved?: string };
export type TitleExtras = { scale?: string; reference?: string };
export type DocControls = { sign?: SignBox[]; revs?: DocRev[]; tb?: TitleExtras };

export const SIGN_MAX = 6;
export const REVS_MAX = 40;
export const REV_MAX_LEN = 8;

// ---------------------------------------------------------------------
//  Revision codes: 00 · 01 … | A · B … | P01 · P02 … | C01 … — whatever the firm uses, the next one follows its pattern
// ---------------------------------------------------------------------
export const REV_PRESETS: [string, string][] = [
  ["00", "رقمي: 00 · 01 · 02"],
  ["A", "حرفي: A · B · C"],
  ["P01", "تمهيدي: P01 · P02"],
  ["C01", "تعاقدي: C01 · C02"],
];

// what a member may type as a revision code: Latin letters, digits, dot and dash (Arabic digits are read as Latin)
export function cleanRev(raw: string): string {
  return String(raw ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, REV_MAX_LEN);
}

// letters as a bijective base-26 number: A … Z, AA, AB …
function nextLetters(s: string): string {
  const out = s.split("");
  let i = out.length - 1;
  while (i >= 0) {
    if (out[i] !== "Z") {
      out[i] = String.fromCharCode(out[i].charCodeAt(0) + 1);
      return out.join("");
    }
    out[i] = "A";
    i--;
  }
  return `A${out.join("")}`;
}

// the revision after `rev`, in the same scheme: trailing digits count up (keeping their width), else trailing letters do
export function nextRev(rev: string): string {
  const r = cleanRev(rev);
  if (!r) return "01";
  const num = /^(.*?)(\d+)$/.exec(r);
  if (num) {
    const n = String(Number(num[2]) + 1).padStart(num[2].length, "0");
    return `${num[1]}${n}`.slice(0, REV_MAX_LEN);
  }
  const let_ = /^(.*?)([A-Z]+)$/.exec(r);
  if (let_) return `${let_[1]}${nextLetters(let_[2])}`.slice(0, REV_MAX_LEN);
  return `${r}1`.slice(0, REV_MAX_LEN);
}

// ---------------------------------------------------------------------
//  Cleaning what is stored on a document
// ---------------------------------------------------------------------
const line = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function cleanSign(boxes: SignBox[] | undefined | null): SignBox[] | undefined {
  if (!Array.isArray(boxes)) return undefined;
  const out = boxes
    .slice(0, SIGN_MAX)
    .map((b) => ({ label: line(b?.label, 60), name: line(b?.name, 80) || undefined, title: line(b?.title, 80) || undefined }))
    .filter((b) => b.label);
  return out.length ? out : undefined;
}

export function cleanTitleExtras(tb: TitleExtras | undefined | null): TitleExtras | undefined {
  const scale = line(tb?.scale, 16);
  const reference = line(tb?.reference, 60);
  return scale || reference ? { ...(scale ? { scale } : {}), ...(reference ? { reference } : {}) } : undefined;
}

// the history with one more issued revision (same code issued again replaces its row — a re-issue is not a new revision)
export function withRevision(revs: DocRev[] | undefined, entry: DocRev): DocRev[] {
  const clean: DocRev = {
    rev: cleanRev(entry.rev) || "00",
    dateIso: /^\d{4}-\d{2}-\d{2}/.test(entry.dateIso) ? entry.dateIso.slice(0, 10) : "",
    desc: line(entry.desc, 120),
    prepared: line(entry.prepared, 60) || undefined,
    checked: line(entry.checked, 60) || undefined,
    approved: line(entry.approved, 60) || undefined,
  };
  return [...(revs || []).filter((r) => r.rev !== clean.rev), clean].slice(-REVS_MAX);
}

export const revisionRows = (revs: DocRev[] | undefined): RevRow[] =>
  (revs || []).map((r) => ({ rev: r.rev, dateIso: r.dateIso, desc: r.desc, prepared: r.prepared || "", checked: r.checked || "", approved: r.approved || "" }));

// ---------------------------------------------------------------------
//  Over a tool's DocSpec: the revision table, the two title-block cells and the signature boxes
// ---------------------------------------------------------------------
export const signParties = (spec: DocSpec): SignParty[] => {
  for (const s of spec.sections) for (const b of s.blocks) if (b.k === "signatures") return b.parties;
  return [];
};

// the boxes a document shows before anyone customises them: the tool's own roles with the project's names
export const defaultSign = (spec: DocSpec): SignBox[] => signParties(spec).map((p) => ({ label: p.role, name: p.name, title: p.title }));

export function applyDocControls(spec: DocSpec, c: DocControls): DocSpec {
  const sign = cleanSign(c.sign);
  const tb = cleanTitleExtras(c.tb);
  const revisions = revisionRows(c.revs);
  if (!sign && !tb && !revisions.length) return spec;
  const swap = (b: DocBlock): DocBlock =>
    b.k === "signatures" && sign ? { ...b, parties: sign.map((x) => ({ role: x.label, name: x.name, title: x.title })) } : b;
  return {
    ...spec,
    title: { ...spec.title, ...(tb?.scale ? { scale: tb.scale } : {}), ...(tb?.reference ? { reference: tb.reference } : {}) },
    revisions: revisions.length ? revisions : spec.revisions,
    sections: sign ? spec.sections.map((s) => ({ ...s, blocks: s.blocks.map(swap) })) : spec.sections,
  };
}

// what the issue fingerprint covers besides the calculation: custom boxes and title cells (absent → the hash of a document
// issued before these existed is unchanged)
export function controlsForHash(c: DocControls): { sign?: SignBox[]; tb?: TitleExtras } | undefined {
  const sign = cleanSign(c.sign);
  const tb = cleanTitleExtras(c.tb);
  return sign || tb ? { ...(sign ? { sign } : {}), ...(tb ? { tb } : {}) } : undefined;
}

// ---------------------------------------------------------------------
//  Document numbers: a pattern per project. {code} project code · {type} document type · {n} … {nnnnnn} the counter (as
//  many digits as letters) · {yy} / {yyyy} the document's year · {orig} the originator code. Default: {code}-{type}-{nnnn}
// ---------------------------------------------------------------------
export const DOCNO_DEFAULT = "{code}-{type}-{nnnn}";
export const DOCNO_PRESETS: [string, string][] = [
  [DOCNO_DEFAULT, "المشروع-النوع-الرقم"],
  ["{code}-{orig}-{type}-{nnnn}", "المشروع-المُصدِر-النوع-الرقم"],
  ["{type}/{yyyy}/{nnn}", "النوع/السنة/الرقم"],
  ["{code}-{type}-{yy}{nnn}", "المشروع-النوع-السنة والرقم"],
];
export const DOCNO_MAX = 40;

export type DocNoParts = { code: string; type: string; n: number; dateIso?: string; orig?: string };

const TOKEN = /\{(code|type|n{1,6}|yy|yyyy|orig)\}/g;

// a pattern is usable when it is short, has a counter (or two documents would share a number) and only known tokens
export function docNoPatternProblem(pattern: string): string | null {
  const p = String(pattern ?? "").trim();
  if (!p) return null;
  if (p.length > 60) return "النمط طويل";
  if (!/\{n{1,6}\}/.test(p)) return "النمط يحتاج العدّاد {nnnn} حتى لا يتكرر رقم";
  const unknown = p.replace(TOKEN, "").match(/\{[^}]*\}?/);
  if (unknown) return `رمز غير معروف: ${unknown[0]}`;
  if (/[^A-Za-z0-9._/\- ]/.test(p.replace(TOKEN, ""))) return "حروف إنجليزية وأرقام و - _ . / فقط";
  return null;
}

export function formatDocNo(pattern: string | undefined | null, parts: DocNoParts): string {
  const usable = pattern && pattern.trim() && !docNoPatternProblem(pattern) ? pattern.trim() : DOCNO_DEFAULT;
  const year = /^\d{4}/.test(parts.dateIso || "") ? (parts.dateIso as string).slice(0, 4) : String(new Date().getFullYear());
  const n = Math.max(1, Math.floor(parts.n) || 1);
  const raw = usable.replace(TOKEN, (_m, t: string) => {
    if (t === "code") return parts.code;
    if (t === "type") return parts.type;
    if (t === "yy") return year.slice(2);
    if (t === "yyyy") return year;
    if (t === "orig") return (parts.orig || "").toUpperCase();
    return String(n).padStart(t.length, "0");
  });
  // an empty token (no originator) must not leave «--» or a dangling separator
  const tidy = raw.replace(/[^A-Za-z0-9._/-]+/g, "").replace(/([-_./])[-_./]+/g, "$1").replace(/^[-_./]+|[-_./]+$/g, "");
  return tidy.slice(0, DOCNO_MAX) || `${parts.code}-${parts.type}-${String(n).padStart(4, "0")}`;
}
