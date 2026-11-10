import { describe, expect, it } from "vitest";
import { applyAnswers, normaliseSpeech, parseDictation, previewTakeoff, toConcreteRows } from "../src/domain/tools/voice-parse";

const BRIEF = "احسبلي كمية خرسانة لقواعد مسلحة 10 قواعد بمقاس 2 في 2.5 وارتفاع 60 سم";

describe("dictation → concrete take-off", () => {
  it("reads the brief's sentence: 10 footings, 2 × 2.5 m, 60 cm high", () => {
    const p = parseDictation(BRIEF);
    expect(p.elements).toHaveLength(1);
    const e = p.elements[0];
    expect(e.kind).toBe("footing");
    expect(e.n).toBe(10);
    expect(e.dims).toMatchObject({ L: 2, B: 2.5, H: 0.6 });
  });

  it("asks only for what was not said: grade and waste, never a dimension", () => {
    const q = parseDictation(BRIEF).questions;
    expect(q.map((x) => x.id)).toEqual(["grade", "waste"]);
    expect(q.every((x) => !x.required)).toBe(true);
  });

  it("asks for a missing dimension instead of guessing it", () => {
    const p = parseDictation("5 قواعد بمقاس 2 في 2");
    const need = p.questions.filter((x) => x.required);
    expect(need.map((x) => x.field)).toEqual(["H"]);
  });

  it("reads Arabic digits, spoken numbers and English", () => {
    expect(parseDictation("١٠ قواعد ٢ في ٢٫٥ ارتفاع ٦٠ سم").elements[0]).toMatchObject({ n: 10, dims: { L: 2, B: 2.5, H: 0.6 } });
    expect(parseDictation("عشرة قواعد 2 في 2.5 ارتفاع ستين سم").elements[0].n).toBe(10);
    expect(parseDictation("8 footings 1.5 x 1.5 height 50 cm").elements[0]).toMatchObject({ kind: "footing", n: 8, dims: { L: 1.5, B: 1.5, H: 0.5 } });
  });

  it("reads grade and waste when said", () => {
    const p = parseDictation(`${BRIEF} خرسانة C35 هالك 5`);
    expect(p.grade).toBe("C35");
    expect(p.wastePct).toBe(5);
    expect(p.questions).toHaveLength(0);
  });

  it("answers complete the take-off and match the engine", () => {
    const p = parseDictation(BRIEF);
    const a = applyAnswers(p, { grade: "c35", waste: "4" });
    expect(a.open).toHaveLength(0);
    expect(a.grade).toBe("C35");
    const rows = toConcreteRows(a.elements, a.wastePct);
    expect(rows[0]).toMatchObject({ kind: "footing", n: "10", waste: "4" });
    const t = previewTakeoff(rows);
    expect(t.netM3).toBeCloseTo(10 * 2 * 2.5 * 0.6, 6);
  });

  it("normalises speech without touching plain numbers", () => {
    expect(normaliseSpeech("٢ في ٢٫٥")).toContain("2 x 2.5");
  });
});
