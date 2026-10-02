// src/domain/raises.ts + src/data/inflation.ts — inflation arithmetic, salary history, and the seed kept in step with SQL
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { INFLATION } from "../src/data/inflation";
import { addMonths, cumulative, monthsBetween, realHistory } from "../src/domain/raises";

describe("months", () => {
  it("adds and subtracts across years", () => { expect(addMonths("2024-11", 3)).toBe("2025-02"); expect(addMonths("2025-01", -1)).toBe("2024-12"); expect(monthsBetween("2023-06", "2025-02")).toBe(20); });
});

describe("inflation", () => {
  it("twelve months at a flat y/y rate compound to that rate", () => {
    const s: [string, number][] = Array.from({ length: 24 }, (_, i) => [addMonths("2030-01", i), 20]);
    expect(cumulative(s, "2030-01", "2031-01").pct).toBeCloseTo(20, 6);
  });
  it("carries the latest rate past the last published month, and says how many months were assumed", () => {
    const c = cumulative(INFLATION, "2025-09", "2026-09"); expect(c.assumed).toBe(12); expect(c.pct).toBeCloseTo(11.7, 6); expect(c.lastPublished).toBe("2025-09");
  });
  it("2023 → 2024 on the real series is in the 30s", () => { const c = cumulative(INFLATION, "2023-01", "2024-01"); expect(c.pct).toBeGreaterThan(28); expect(c.pct).toBeLessThan(36); expect(c.assumed).toBe(0); });
});

describe("salary history", () => {
  it("each raise against inflation, and today's purchasing power", () => {
    const h = realHistory(INFLATION, [{ month: "2024-01", salary: 20000 }, { month: "2023-01", salary: 15000 }], "2025-01");
    expect(h.steps).toHaveLength(1); expect(h.steps[0].nominal).toBeCloseTo(33.33, 1); expect(h.steps[0].real).toBeLessThan(3);
    expect(h.now!.months).toBe(12); expect(h.now!.keepLevel).toBeGreaterThan(24000); expect(h.now!.realNow).toBeLessThan(16500);
  });
  it("empty history", () => { expect(realHistory(INFLATION, []).now).toBeNull(); });
});

describe("the bundled series matches the database seed", () => {
  it("same months, same values", () => {
    const sql = readFileSync(new URL("../supabase/migrations/20261004000012_scorecards_raises.sql", import.meta.url), "utf8");
    const seed = [...sql.matchAll(/\('(\d{4}-\d{2})-01', (-?[\d.]+)\)/g)].map((m) => [m[1], Number(m[2])]);
    expect(seed).toEqual(INFLATION);
  });
});
