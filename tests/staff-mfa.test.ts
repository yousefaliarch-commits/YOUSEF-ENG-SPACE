// Phase 3a: the team's second factor. The gate's decision, the messages a person reads, and the server rules that must not drift
// (pinned on the migration: off by default, both staff checks gated, the switch only from aal2, nothing for anon).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gateState, mfaError } from "../src/backend/mfa";

const sql = readFileSync(new URL("../supabase/migrations/20261101000029_staff_mfa.sql", import.meta.url), "utf8");
const toml = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");

describe("the console gate", () => {
  it("a confirmed session opens it; an enrolled account always confirms first; enrolment is forced only by the switch", () => {
    expect(gateState({ aal: "aal2", hasFactor: true, required: true })).toBe("open");
    expect(gateState({ aal: "aal2", hasFactor: false, required: false })).toBe("open");
    expect(gateState({ aal: "aal1", hasFactor: true, required: false })).toBe("code");
    expect(gateState({ aal: "aal1", hasFactor: true, required: true })).toBe("code");
    expect(gateState({ aal: "aal1", hasFactor: false, required: true })).toBe("enroll");
    expect(gateState({ aal: "aal1", hasFactor: false, required: false })).toBe("open-recommend");
  });
});

describe("what a person reads", () => {
  it("a wrong or expired code, a missing confirmed session, no permission, no network — each in plain Arabic", () => {
    expect(mfaError(new Error("Invalid TOTP code entered"))).toContain("الرمز غير صحيح");
    expect(mfaError({ message: "two-factor session required" })).toContain("جلسة مؤكدة");
    expect(mfaError({ message: "not allowed" })).toBe("غير مسموح لهذا الحساب");
    expect(mfaError(new TypeError("Failed to fetch"))).toContain("تعذّر الاتصال");
    expect(mfaError("something else")).toContain("تعذّر إكمال التحقق");
  });
});

describe("the server rules (migration 29)", () => {
  it("the switch exists, is off by default and is private", () => {
    expect(sql).toMatch(/staff_mfa boolean not null default false/);
    expect(sql).toMatch(/revoke all on private\.security_config from public, anon, authenticated/);
  });
  it("both staff checks require the second factor while it is on — every staff policy and RPC goes through them", () => {
    expect(sql).toMatch(/function public\.is_staff\(\)[\s\S]*?and private\.staff_mfa_ok\(\)/);
    expect(sql).toMatch(/function public\.is_admin\(\)[\s\S]*?and private\.staff_mfa_ok\(\)/);
    expect(sql).toMatch(/or coalesce\(\(select auth\.jwt\(\) ->> 'aal'\), ''\) = 'aal2'/);
  });
  it("only an administrator in an aal2 session flips it, and each flip is audited", () => {
    const fn = sql.slice(sql.indexOf("function public.admin_set_staff_mfa"));
    expect(fn).toMatch(/p\.staff = 'admin'/);
    expect(fn).toMatch(/<> 'aal2' then\s+raise exception 'two-factor session required'/);
    expect(fn).toMatch(/private\.audit\(/);
  });
  it("default deny: nothing for anon, explicit grants for members, the check itself callable by nobody", () => {
    expect(sql).toMatch(/revoke execute on function private\.staff_mfa_ok\(\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.my_staff_security\(\) to authenticated/);
    expect(sql).toMatch(/grant execute on function public\.admin_set_staff_mfa\(boolean\) to authenticated/);
    expect(sql).not.toMatch(/to anon/);
    for (const f of ["my_staff_security()", "admin_set_staff_mfa(p_on boolean)", "staff_mfa_ok()"]) expect(sql).toMatch(new RegExp(`${f.replace(/[()]/g, "\\$&")}[^;]*?security definer set search_path = ''`));
  });
  it("local Supabase (and CI) can enrol and verify an authenticator", () => {
    expect(toml).toMatch(/\[auth\.mfa\.totp\]\s*\n(#.*\n)?enroll_enabled = true\s*\nverify_enabled = true/);
  });
});
