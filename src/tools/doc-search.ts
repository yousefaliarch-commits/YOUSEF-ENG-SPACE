// =====================================================================
//  Finding saved tool documents (W3): a pure filter over the document index — the words typed match the title, the number,
//  the WBS path (zone · level · element), the tool's name and the date, all of them, in any order; a zone narrows the list.
//  Arabic is matched loosely the way people type it (أ إ آ → ا, ة → ه, ى → ي, no tashkeel), Latin case-insensitively.
// =====================================================================
import { wbsPath, type ToolHeader } from "../data/tool-docs";
import { toolById } from "./registry";

export const normalise = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[⁦-⁩‪-‮]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const toolName = (kind: string) => {
  const t = toolById(kind);
  return t ? t.name : kind;
};

export const haystack = (h: ToolHeader) => normalise([h.title, h.docNo || "", wbsPath(h.wbs), toolName(h.kind), h.dateIso, h.rev ? `rev ${h.rev}` : ""].join(" "));

export function searchDocs(list: ToolHeader[], query: string, o: { zone?: string | null; kinds?: string[] | null; projectId?: string | null } = {}): ToolHeader[] {
  const words = normalise(query).split(" ").filter(Boolean);
  const zone = o.zone ? normalise(o.zone) : null;
  return list.filter((h) => {
    if (h.deleted) return false;
    if (o.kinds && !o.kinds.includes(h.kind)) return false;
    if (o.projectId && h.projectId !== o.projectId) return false;
    if (zone && normalise(h.wbs?.zone || "") !== zone) return false;
    if (!words.length) return true;
    const hay = haystack(h);
    return words.every((w) => hay.includes(w));
  });
}

// the zones the listed documents are filed under, most used first
export function zonesOf(list: ToolHeader[]): string[] {
  const n = new Map<string, number>();
  list.forEach((h) => {
    const z = (h.wbs?.zone || "").trim();
    if (z) n.set(z, (n.get(z) || 0) + 1);
  });
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([z]) => z);
}
