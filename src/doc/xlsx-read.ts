// =====================================================================
//  Reading a workbook (W8 — BOQ import): the sheets of an .xlsx as rows of text, on the device, with the zip library the app
//  already ships (fflate). Only what a bill of quantities needs: shared / inline strings, numbers as written, booleans, the
//  sheet order of the workbook. No formulas are evaluated — Excel stores each formula's last value, and that is what is read.
//  Never throws for a malformed file: it returns no sheets, and the import screen says so.
// =====================================================================
import { strFromU8, unzipSync } from "fflate";

export type ReadSheet = { name: string; rows: string[][] };

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e: string) =>
    e === "amp" ? "&" : e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "apos" ? "'"
      : String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

// the text of every <t> inside a string item (a rich-text cell is several runs)
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

// "AB12" → 27 (zero-based column)
export const colIndex = (ref: string) => {
  const letters = (/^[A-Z]+/.exec(ref) || ["A"])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export function readXlsx(bytes: Uint8Array): ReadSheet[] {
  try {
    const z = unzipSync(bytes);
    const file = (p: string) => (z[p] ? strFromU8(z[p]) : "");
    const shared = [...file("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
    const rels = new Map<string, string>();
    for (const m of file("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)\/?>/g)) {
      const id = /\bId="([^"]+)"/.exec(m[1]);
      const target = /\bTarget="([^"]+)"/.exec(m[1]);
      if (id && target) rels.set(id[1], target[1].replace(/^\/?(xl\/)?/, "xl/"));
    }
    const sheets: ReadSheet[] = [];
    for (const m of file("xl/workbook.xml").matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const name = decode((/\bname="([^"]*)"/.exec(m[1]) || ["", "Sheet"])[1]);
      const rid = (/\br:id="([^"]+)"/.exec(m[1]) || ["", ""])[1];
      const path = rels.get(rid) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
      const xml = file(path);
      if (!xml) continue;
      const rows: string[][] = [];
      for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
        const rn = Number((/\br="(\d+)"/.exec(r[1]) || ["", String(rows.length + 1)])[1]) - 1;
        const row: string[] = [];
        let next = 0;
        for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = (/\br="([A-Z]+)\d*"/.exec(c[1]) || [])[1];
          const at = ref ? colIndex(ref) : next;
          const t = (/\bt="([^"]+)"/.exec(c[1]) || ["", "n"])[1];
          const body = c[2] || "";
          const v = /<v>([\s\S]*?)<\/v>/.exec(body);
          let text = "";
          if (t === "s") text = v ? shared[Number(v[1])] ?? "" : "";
          else if (t === "inlineStr") text = textOf(body);
          else if (t === "b") text = v ? (v[1] === "1" ? "TRUE" : "FALSE") : "";
          else text = v ? decode(v[1]) : "";
          while (row.length < at) row.push("");
          row[at] = text;
          next = at + 1;
        }
        while (rows.length < rn) rows.push([]);
        rows[rn] = row;
      }
      sheets.push({ name, rows });
    }
    return sheets;
  } catch {
    return [];
  }
}
