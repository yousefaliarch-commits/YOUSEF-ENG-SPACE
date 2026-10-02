// src/data/checklists.ts + src/lib/report-pdf.ts — QA/QC templates, tally, device/server merge, the PDF container
import { describe, expect, it } from "vitest";
import { TEMPLATES, itemsOf, mergeInspections, newInspection, tally } from "../src/data/checklists";
import { pdfFromJpegs } from "../src/lib/report-pdf";

describe("checklists", () => {
  it("every template has unique ids and non-empty sections", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) { expect(t.sections.length).toBeGreaterThan(0); for (const [, items] of t.sections) expect(items.length).toBeGreaterThan(0); }
  });
  it("suggests a verdict only from complete or failing marks", () => {
    const t = TEMPLATES[0]; const keys = itemsOf(t);
    expect(tally(t, {}).suggested).toBe(""); expect(tally(t, {}).open).toBe(keys.length);
    const all = Object.fromEntries(keys.map((k) => [k, "pass"])); expect(tally(t, all).suggested).toBe("accepted");
    expect(tally(t, { ...all, [keys[1]]: "na" }).suggested).toBe("accepted");
    expect(tally(t, { [keys[0]]: "fail" }).suggested).toBe("rejected");
  });
  it("device and server copies merge: newer edit wins, nothing dropped", () => {
    const a = { ...newInspection(TEMPLATES[0]), id: "a", at: 10, project: "old" }; const b = { ...newInspection(TEMPLATES[1]), id: "b", at: 5 };
    const m = mergeInspections([{ ...a, at: 20, project: "new" }], [a, b]);
    expect(m.map((x) => x.id)).toEqual(["a", "b"]); expect(m[0].project).toBe("new");
  });
});

describe("report pdf", () => {
  it("writes a well-formed PDF with one image page per JPEG", () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); const out = new TextDecoder("latin1").decode(pdfFromJpegs([jpg, jpg]));
    expect(out.startsWith("%PDF-1.4")).toBe(true); expect(out.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(out).toContain("/Count 2"); expect(out.match(/\/Subtype \/Image/g)!.length).toBe(2);
    const xref = Number(out.match(/startxref\n(\d+)/)![1]); expect(out.slice(xref, xref + 4)).toBe("xref");
  });
});
