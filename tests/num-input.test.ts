// Numbers typed on site (src/lib/num-input.ts): Arabic-Indic and Persian digits, Arabic decimal marks, minus signs, and
// "no number" never turning into a zero.
import { describe, expect, it } from "vitest";
import { numInputNormalize, numInputParse, numInputProblem, numInputShow } from "../src/lib/num-input";

describe("what a member types becomes the number they mean", () => {
  it("Arabic-Indic and Persian digits, Arabic decimal mark, comma decimal", () => {
    expect(numInputParse("١٢٫٥")).toBe(12.5);
    expect(numInputParse("۱۲٫۵")).toBe(12.5);
    expect(numInputParse("12,5")).toBe(12.5);
    expect(numInputParse("١٢،٧٥")).toBe(12.75);
    expect(numInputParse(" 0.15 ")).toBe(0.15);
    expect(numInputParse(".5")).toBe(0.5);
    expect(numInputNormalize("−٣٫٢")).toBe("-3.2");
  });
  it("minus only where allowed (levels below a benchmark)", () => {
    expect(numInputParse("-1.25")).toBeNull();
    expect(numInputParse("-1.25", { allowNegative: true })).toBe(-1.25);
    expect(numInputParse("−١٫٢٥", { allowNegative: true })).toBe(-1.25);
  });
  it("no number is null, never zero", () => {
    for (const s of ["", " ", "-", ".", "1.2.3", "12a", "abc", "1e3", "١٢ م"]) expect(numInputParse(s, { allowNegative: true })).toBeNull();
    expect(numInputParse("0")).toBe(0);
  });
  it("rules: integer counts, ranges", () => {
    expect(numInputParse("3.5", { integer: true })).toBeNull();
    expect(numInputParse("٤", { integer: true, min: 1 })).toBe(4);
    expect(numInputParse("0", { min: 1 })).toBeNull();
    expect(numInputParse("101", { max: 100 })).toBeNull();
  });
  it("explains a refusal, but not while the member is still typing", () => {
    expect(numInputProblem("-")).toBeNull(); expect(numInputProblem("")).toBeNull();
    expect(numInputProblem("12a")).toBe("اكتب رقمًا فقط");
    expect(numInputProblem("-2")).toBe("القيمة لا تكون سالبة هنا");
    expect(numInputProblem("2.5", { integer: true })).toBe("اكتب عددًا صحيحًا");
    expect(numInputProblem("0", { min: 1 })).toBe("أقل قيمة 1");
  });
  it("shows a dash for no number", () => {
    expect(numInputShow(null)).toBe("—"); expect(numInputShow(NaN)).toBe("—");
    expect(numInputShow(1234.567)).toBe("1,234.57"); expect(numInputShow(2, 3)).toBe("2");
  });
});
