// =====================================================================
//  Two-factor sign-in for the platform team (Phase 3a, migration 29): an authenticator-app code (TOTP) through Supabase Auth.
//  · enroll → a QR code and its secret; the first code verifies the factor and lifts this session to aal2.
//  · stepUp → the code on a later sign-in, before the console loads (aal1 → aal2).
//  · The server decides: with the switch on (Admin → الإعدادات), is_staff() / is_admin() hold only at aal2 — this module only
//    asks for the code; it never grants anything. Every call resolves to a value or an Arabic error, never a raw one.
//  `gateState` is the pure decision the console gate renders (tests/staff-mfa.test.ts).
// =====================================================================
import { supabase } from "./client";

export type StaffSecurity = { staff: "moderator" | "admin" | null; required: boolean; aal: "aal1" | "aal2" };
export type Factor = { id: string; name: string; createdAt: string };
export type Enrolment = { factorId: string; qr: string; secret: string; uri: string };

export function mfaError(e: unknown): string {
  const m = String((e as any)?.message || e || "").toLowerCase();
  if (/invalid.*(code|totp)|code.*(invalid|expired)|totp.*(invalid|expired)|challenge.*expired/.test(m)) return "الرمز غير صحيح أو انتهت صلاحيته — اكتب الرمز الحالي من التطبيق";
  if (/aal2|two-factor session/.test(m)) return "هذا الإجراء يحتاج جلسة مؤكدة بالتحقق بخطوتين";
  if (/not allowed|42501|permission/.test(m)) return "غير مسموح لهذا الحساب";
  if (/network|fetch|failed to fetch|timeout/.test(m)) return "تعذّر الاتصال — حاول مرة أخرى";
  if (/factor.*(limit|maximum)|too many/.test(m)) return "عدد أجهزة التحقق وصل للحد الأقصى";
  return "تعذّر إكمال التحقق بخطوتين — حاول مرة أخرى";
}

const fail = (e: unknown): never => {
  throw new Error(mfaError(e));
};

export async function staffSecurity(): Promise<StaffSecurity> {
  const db = await supabase();
  const { data, error } = await db.rpc("my_staff_security");
  if (error) fail(error);
  const d = (data || {}) as any;
  return { staff: d.staff === "admin" || d.staff === "moderator" ? d.staff : null, required: !!d.required, aal: d.aal === "aal2" ? "aal2" : "aal1" };
}

// the verified authenticator factors of this account
export async function factors(): Promise<Factor[]> {
  const db = await supabase();
  const { data, error } = await db.auth.mfa.listFactors();
  if (error) fail(error);
  return ((data?.totp || []) as any[]).filter((f) => f.status === "verified").map((f) => ({ id: f.id, name: f.friendly_name || "", createdAt: f.created_at }));
}

export async function assurance(): Promise<{ current: "aal1" | "aal2"; next: "aal1" | "aal2" }> {
  const db = await supabase();
  const { data, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) fail(error);
  return { current: data?.currentLevel === "aal2" ? "aal2" : "aal1", next: data?.nextLevel === "aal2" ? "aal2" : "aal1" };
}

// a new authenticator: unverified leftovers from an abandoned attempt are removed first (Supabase keeps them otherwise)
export async function enroll(): Promise<Enrolment> {
  const db = await supabase();
  const listed = await db.auth.mfa.listFactors();
  for (const f of ((listed.data as any)?.all || []) as any[]) if (f.factor_type === "totp" && f.status !== "verified") await db.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: `EngSpace ${new Date().toISOString().slice(0, 16)}` });
  if (error || !data) fail(error);
  const d = data as any;
  return { factorId: d.id, qr: d.totp?.qr_code || "", secret: d.totp?.secret || "", uri: d.totp?.uri || "" };
}

const clean = (code: string) => String(code || "").replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660)).replace(/\D/g, "").slice(0, 6);

// a code for a factor: verifies a new one (enrolment) or lifts this session to aal2 (step-up)
export async function verify(factorId: string, code: string): Promise<void> {
  const db = await supabase();
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code: clean(code) });
  if (error) fail(error);
}

export async function stepUp(code: string): Promise<void> {
  const list = await factors();
  if (!list.length) throw new Error("لا يوجد تطبيق تحقق مفعّل لهذا الحساب");
  await verify(list[0].id, code);
}

export async function unenroll(factorId: string): Promise<void> {
  const db = await supabase();
  const { error } = await db.auth.mfa.unenroll({ factorId });
  if (error) fail(error);
}

// Admin → الإعدادات: require the second factor for every staff power (administrators, from a two-factor session only)
export async function setStaffMfa(on: boolean): Promise<boolean> {
  const db = await supabase();
  const { data, error } = await db.rpc("admin_set_staff_mfa", { p_on: on });
  if (error) fail(error);
  return !!data;
}

// what the console gate shows: open it, ask for the code, or set up the authenticator first
export type GateState = "open" | "code" | "enroll" | "open-recommend";
export function gateState(s: { aal: "aal1" | "aal2"; hasFactor: boolean; required: boolean }): GateState {
  if (s.aal === "aal2") return "open";
  if (s.hasFactor) return "code";               // enrolled: always confirm before the console, switch on or off
  return s.required ? "enroll" : "open-recommend";
}
