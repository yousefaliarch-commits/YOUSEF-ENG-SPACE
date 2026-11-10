// =====================================================================
//  Firm templates (قوالب المكتب) — a tool document saved as a starting point: the firm's own parameters (retention and its
//  cap, deduction rules, wastes, truck sizes…), its signature boxes and revision scheme, and — when wanted — its standard rows.
//  · A template is a tool document of kind «tpl.<tool>» in the same store as every other document (lib/tool-store.ts), so it
//    is kept on the phone first, backed up to the account, merged per document and shared by all the member's devices.
//    Lists of real documents never show it: they ask the store for the tool's own kinds.
//  · What a template keeps: with rows — the body as it is; without — only its parameters (see `paramsOnly`). A tool may then
//    clear what must never carry over (certified quantities, a reply, an approval): ToolModule.template.
//  · A template can leave the app as a small JSON file and come back from a colleague's; a file is untrusted input —
//    data/template-file.ts validates its envelope, `safeJson` bounds its body, and the tool itself must be able to build a
//    document from it before it is saved (features/tools/templates.tsx).
//  Pure: no DOM, no store.
// =====================================================================
import type { DocRev, SignBox, TitleExtras } from "./doc-controls";
import { cleanRev, cleanSign, cleanTitleExtras } from "./doc-controls";
import type { ProfileSnap, ToolDoc } from "./tool-docs";

export const TPL_PREFIX = "tpl.";
export const templateKind = (kind: string) => `${TPL_PREFIX}${kind}`;
export const isTemplateKind = (kind: string) => kind.startsWith(TPL_PREFIX);
export const TPL_NAME_MAX = 80;
export const TPL_FILE_MAX = 600_000;   // characters of JSON a template file may hold
export const TPL_FORMAT = "engspace.template";

export type TemplateBody<B = unknown> = {
  of: string;            // the tool's document kind
  v: number;             // that tool's body version when it was saved
  body: B;
  rows: boolean;         // saved with the document's rows, or parameters only
  sign?: SignBox[];
  tb?: TitleExtras;
  rev?: string;          // the revision scheme a new document starts with
};
export type ToolTemplate<B = unknown> = ToolDoc<TemplateBody<B>>;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const hasArray = (x: unknown): boolean => Array.isArray(x) || (isObj(x) && Object.values(x).some(hasArray));

// «parameters only»: every top-level value that is not a list and holds no list (rates, thresholds, choices, calibration,
// per-mode inputs); lists — the rows of this particular document — come from a blank document instead
export function paramsOnly<B>(blank: B, body: B): B {
  if (!isObj(blank) || !isObj(body)) return structuredClone(blank);
  const out: Record<string, unknown> = structuredClone(blank);
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || hasArray(v)) continue;
    out[k] = structuredClone(v);
  }
  return out as B;
}

// what goes into a template: the tool's own answer when it has one (it knows what never carries over — certified
// quantities, a reply, an approval), else the rows as they are or only the parameters
export function templateBody<B>(body: B, blank: B, rows: boolean, own?: (b: B, rows: boolean) => B): B {
  if (own) return own(structuredClone(body), rows);
  return rows ? structuredClone(body) : paramsOnly(blank, body);
}

export const cleanTemplateName = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, TPL_NAME_MAX);

export function templateDoc<B>(o: {
  id: string; name: string; kind: string; v: number; body: B; rows: boolean; profile: ProfileSnap; now: number;
  sign?: SignBox[]; tb?: TitleExtras; rev?: string;
}): ToolTemplate<B> {
  const sign = cleanSign(o.sign);
  const tb = cleanTitleExtras(o.tb);
  const rev = cleanRev(o.rev || "");
  return {
    id: o.id, kind: templateKind(o.kind), v: 1, at: 0, createdAt: o.now, projectId: null, title: cleanTemplateName(o.name) || "قالب",
    dateIso: new Date(o.now).toISOString().slice(0, 10), docNo: null, rev: "00", status: "draft", profile: o.profile,
    body: { of: o.kind, v: o.v, body: o.body, rows: o.rows, ...(sign ? { sign } : {}), ...(tb ? { tb } : {}), ...(rev && rev !== "00" ? { rev } : {}) },
    photos: {}, log: [],
  };
}

// the scheme a document starts with, from a revision it may already have reached: P03 → P01, C → A, 04 → 00
export function revStart(rev: string): string {
  const r = cleanRev(rev);
  const num = /^(.*?)(\d+)$/.exec(r);
  if (num) return num[1] ? `${num[1]}${"1".padStart(num[2].length, "0")}` : "0".repeat(num[2].length);
  const let_ = /^(.*?)[A-Z]+$/.exec(r);
  if (let_) return `${let_[1]}A`;
  return r || "00";
}

// a new draft from a template: its own id, today's date, no number, no history
export function docFromTemplate<B>(tpl: ToolTemplate<B>, o: { id: string; projectId: string | null; dateIso: string; title: string; profile: ProfileSnap; now: number }): ToolDoc<B> {
  const t = tpl.body;
  const sign = cleanSign(t.sign);
  const tb = cleanTitleExtras(t.tb);
  return {
    id: o.id, kind: t.of, v: t.v, at: 0, createdAt: o.now, projectId: o.projectId, title: o.title, dateIso: o.dateIso, docNo: null,
    rev: cleanRev(t.rev || "") || "00", status: "draft", profile: o.profile, body: structuredClone(t.body), photos: {}, log: [],
    ...(sign ? { sign } : {}), ...(tb ? { tb } : {}),
  };
}

// ---------------------------------------------------------------------
//  The file a template travels in
// ---------------------------------------------------------------------
export type TemplateFile = {
  format: typeof TPL_FORMAT; version: 1; kind: string; v: number; name: string; rows: boolean; savedAt: string;
  body: unknown; sign?: SignBox[]; tb?: TitleExtras; rev?: string;
};

export function templateFile(tpl: ToolTemplate): TemplateFile {
  const t = tpl.body;
  return {
    format: TPL_FORMAT, version: 1, kind: t.of, v: t.v, name: tpl.title, rows: !!t.rows, savedAt: tpl.dateIso,
    body: t.body, ...(t.sign ? { sign: t.sign } : {}), ...(t.tb ? { tb: t.tb } : {}), ...(t.rev ? { rev: t.rev } : {}),
  };
}

// a file name any system accepts: Arabic letters kept, separators and control characters out
export const templateFileName = (name: string) =>
  `${cleanTemplateName(name).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 60) || "template"}.engspace-template.json`;

// ---------------------------------------------------------------------
//  A free-form body from outside, bounded: plain JSON only, no prototype keys, nothing deep, long or huge
// ---------------------------------------------------------------------
export type JsonLimits = { depth: number; nodes: number; text: number; list: number; keys: number; key: number };
export const TPL_LIMITS: JsonLimits = { depth: 10, nodes: 60_000, text: 4_000, list: 2_000, keys: 200, key: 64 };
const BAD_KEY = new Set(["__proto__", "constructor", "prototype"]);

export type SafeJson = { ok: true; value: unknown } | { ok: false; why: "depth" | "size" | "type" | "key" | "text" };

export function safeJson(input: unknown, lim: JsonLimits = TPL_LIMITS): SafeJson {
  type Why = Extract<SafeJson, { ok: false }>["why"];
  const st: { nodes: number; why: Why | null } = { nodes: 0, why: null };
  const fail = (w: Why) => {
    st.why = st.why || w;
    return undefined;
  };
  const walk = (v: unknown, depth: number): unknown => {
    if (st.why) return undefined;
    if (++st.nodes > lim.nodes) return fail("size");
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : fail("type");
    if (typeof v === "string") return v.length <= lim.text ? v : fail("text");
    if (depth >= lim.depth) return fail("depth");
    if (Array.isArray(v)) {
      if (v.length > lim.list) return fail("size");
      return v.map((x) => walk(x, depth + 1));
    }
    if (typeof v === "object") {
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null) return fail("type");
      const keys = Object.keys(v);
      if (keys.length > lim.keys) return fail("size");
      // a null-prototype copy: a key can never reach Object.prototype, whatever it is called
      const out: Record<string, unknown> = Object.create(null);
      for (const k of keys) {
        if (BAD_KEY.has(k) || k.length > lim.key || k.length === 0) return fail("key");
        out[k] = walk((v as Record<string, unknown>)[k], depth + 1);
      }
      return { ...out };
    }
    return fail("type");
  };
  const value = walk(input, 0);
  return st.why ? { ok: false, why: st.why } : { ok: true, value };
}

// The body a tool will accept, shaped by its own blank document (the file's body is already bounded, plain JSON):
//  · every field the blank defines exists, with the file's value only where the kind of value matches (text for text, a
//    list for a list) — anything the blank does not define is dropped at the top level;
//  · a parameter group (an object the blank fills, e.g. the pour order or the contract's thresholds) gets the same
//    treatment one level down; an object the blank leaves empty is a free-form record and is taken as it is;
//  · a list keeps only rows of the right kind: like the blank's first row when it has one — and every field that row
//    defines is present in each row, so a screen never reads a missing field — else rows all of one kind (a mixed list
//    is no list of rows at all and falls back to the blank's).
const kindOf = (x: unknown) => (Array.isArray(x) ? "list" : x === null ? "null" : typeof x);

function conformRow(example: Record<string, unknown>, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = structuredClone(row);
  for (const [k, e] of Object.entries(example)) {
    if (!(k in row) || kindOf(row[k]) !== kindOf(e)) out[k] = structuredClone(e);
  }
  return out;
}

function conformList(blank: unknown[], list: unknown[]): unknown[] {
  if (blank.length) {
    const e = blank[0];
    const same = list.filter((x) => kindOf(x) === kindOf(e));
    return isObj(e) ? same.map((x) => conformRow(e, x as Record<string, unknown>)) : structuredClone(same);
  }
  return new Set(list.map(kindOf)).size <= 1 ? structuredClone(list) : [];
}

function conformGroup(blank: Record<string, unknown>, group: Record<string, unknown>): Record<string, unknown> {
  if (!Object.keys(blank).length) return structuredClone(group);
  return conformRow(blank, group);
}

export function conformBody<B>(blank: B, body: unknown): B {
  if (!isObj(blank) || !isObj(body)) return structuredClone(blank);
  const out: Record<string, unknown> = structuredClone(blank);
  for (const [k, b] of Object.entries(blank)) {
    if (!(k in body)) continue;
    const v = body[k];
    if (kindOf(v) !== kindOf(b)) continue;
    out[k] = Array.isArray(b) ? conformList(b, v as unknown[]) : isObj(b) ? conformGroup(b, v as Record<string, unknown>) : structuredClone(v);
  }
  return out as B;
}

// issued revisions never travel with a template (a new document has no history)
export type TemplateSource = Pick<ToolDoc, "kind" | "v" | "body" | "sign" | "tb" | "rev" | "profile"> & { revs?: DocRev[] };
