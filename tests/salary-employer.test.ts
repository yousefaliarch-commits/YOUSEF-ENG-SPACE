// A salary report's employer type: its own field (never mixed into the company name), the same ids as the database, and a badge.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPLOYERS, employerBadge } from "../src/domain/taxonomy";
import { shareOf, shareRow } from "../src/backend/map";

const sql = readFileSync(new URL("../supabase/migrations/20261012000020_salary_employer_type.sql", import.meta.url), "utf8");

describe("employer type on a salary report", () => {
  it("the database accepts exactly the app's employer types", () => {
    const ids = /employer in \(([^)]*)\)/.exec(sql)![1].match(/'(\w+)'/g)!.map((x) => x.slice(1, -1)); expect(ids).toEqual(EMPLOYERS.map((e: any) => e[0]));
    const backfill = /company in \(([^)]*)\)/.exec(sql)![1].match(/'(\w+)'/g)!.map((x) => x.slice(1, -1)); expect(backfill).toEqual(ids);
  });
  it("shareRow keeps the type and the company apart", () => {
    const r = shareRow({ disc: "civil", exp: "3-5", salary: 15000, gov: "cairo", employer: "consulting", company: null, title: "مهندس", as: "anon" });
    expect(r).toMatchObject({ employer: "consulting", company: null });
    expect(shareRow({ disc: "civil", exp: "3-5", salary: 15000, employer: "contracting", company: "أوراسكوم", as: "anon" })).toMatchObject({ employer: "contracting", company: "أوراسكوم" });
  });
  it("a report listed in the market carries its type, and no longer shows the raw id as a company", () => {
    const s: any = shareOf({ id: "1", title: "ت", years: 4, salary: 15000, company: null, employer: "consulting", gov: "cairo", track: "tech", author: { anon: "a1b2c3" }, created_at: new Date().toISOString() });
    expect(s.employer).toBe("consulting"); expect(s.company).toBe("");
  });
  it("every type has a badge; contracting, consulting and owner read as the owner described", () => {
    for (const [id] of EMPLOYERS as any) expect(employerBadge(id)).not.toBeNull();
    expect(employerBadge("contracting")![0]).toBe("مقاولات"); expect(employerBadge("consulting")![0]).toBe("استشاري"); expect(employerBadge("developer")![0]).toBe("مالك");
    expect(employerBadge(null)).toBeNull(); expect(employerBadge("nope")).toBeNull();
  });
});
